import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { AuthenticatedRequest } from "../common/auth.guard";
import { Public } from "../common/public.decorator";
import { UsersService } from "../users/users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Criar conta e iniciar sessão" })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(body);
    this.setSessionCookies(response, result.token, result.csrf);
    return { user: result.user };
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Iniciar sessão" })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.email, body.password);
    this.setSessionCookies(response, result.token, result.csrf);
    return { user: result.user };
  }

  @Post("change-password")
  @ApiCookieAuth("qagent_session")
  @ApiOperation({ summary: "Alterar senha da conta autenticada" })
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post("logout")
  @ApiCookieAuth("qagent_session")
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("qagent_session", this.cookieOptions(true));
    response.clearCookie("qagent_csrf", this.cookieOptions(false));
    return { success: true };
  }

  @Get("me")
  @ApiCookieAuth("qagent_session")
  async me(@Req() request: AuthenticatedRequest) {
    const user = await this.usersService.findPublicById(request.user.id);
    if (!user || user.status !== "ACTIVE" || !user.profile) {
      throw new UnauthorizedException("Conta indisponível.");
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile: user.profile.type,
    };
  }

  @Public()
  @Get("csrf")
  csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const existing = request.cookies?.qagent_csrf;
    if (existing) return { csrf: existing };
    const csrf = randomBytes(32).toString("base64url");
    response.cookie("qagent_csrf", csrf, this.cookieOptions(false));
    return { csrf };
  }

  private setSessionCookies(response: Response, token: string, csrf: string) {
    response.cookie("qagent_session", token, {
      ...this.cookieOptions(true),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.cookie("qagent_csrf", csrf, {
      ...this.cookieOptions(false),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions(httpOnly: boolean) {
    return {
      httpOnly,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax" as const,
      path: "/",
    };
  }
}
