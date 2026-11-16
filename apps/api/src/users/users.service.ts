import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Environment } from "@qagent/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByIdWithPassword(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true, status: true },
    });
  }

  create(
    name: string,
    email: string,
    phone: string,
    passwordHash: string,
    profile: Environment,
  ) {
    return this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        profile: { create: { type: profile } },
      },
      include: { profile: true },
    });
  }

  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        profile: { select: { type: true } },
      },
    });
  }

  async updateAccount(
    id: string,
    input: { name: string; email: string; phone: string },
  ) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profile: { select: { type: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Já existe uma conta com este e-mail.");
      }
      throw error;
    }
  }

  async getPreferences(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { writingStyle: true, responseDetail: true, aiModel: true },
    });
    if (!user) throw new NotFoundException("Conta não encontrada.");
    return user;
  }

  async updatePreferences(
    id: string,
    input: { writingStyle: "NATURAL" | "BALANCED" | "STRUCTURED" | "OBJECTIVE"; responseDetail: "SHORT" | "MEDIUM" | "COMPLETE"; aiModel: string | null },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: input,
      select: { writingStyle: true, responseDetail: true, aiModel: true },
    });
  }

  updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  }
}
