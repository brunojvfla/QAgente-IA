import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Environment } from "@qagent/shared";
import * as argon2 from "argon2";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    profile: Environment;
  }) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    try {
      const user = await this.usersService.create(
        input.name.trim(),
        email,
        input.phone,
        passwordHash,
        input.profile,
      );
      return { user: this.toAuthenticatedUser(user), ...(await this.createSession(user.id, input.profile)) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Já existe uma conta com este e-mail.");
      }
      throw error;
    }
  }

  async login(emailInput: string, password: string) {
    const user = await this.usersService.findByEmail(emailInput.trim().toLowerCase());
    if (!user || user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }
    const publicUser = await this.usersService.findPublicById(user.id);
    if (!publicUser?.profile) throw new UnauthorizedException("Conta sem perfil ativo.");
    return {
      user: this.toAuthenticatedUser(publicUser),
      ...(await this.createSession(user.id, publicUser.profile.type)),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new UnauthorizedException("A senha atual está incorreta.");
    }
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.usersService.updatePassword(userId, passwordHash);
    return { success: true };
  }

  private async createSession(userId: string, profile: Environment) {
    const csrf = randomBytes(32).toString("base64url");
    const token = await this.jwtService.signAsync({ sub: userId, profile, csrf });
    return { token, csrf };
  }

  private toAuthenticatedUser(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    profile: { type: Environment } | null;
  }) {
    if (!user.profile) throw new UnauthorizedException("Conta sem perfil ativo.");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile: user.profile.type,
    };
  }
}
