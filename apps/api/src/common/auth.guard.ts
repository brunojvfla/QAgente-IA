import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Environment } from "@qagent/shared";
import { Request, Response } from "express";
import { IS_PUBLIC } from "./public.decorator";

export interface AuthenticatedRequest extends Request {
  user: { id: string; profile: Environment };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = request.cookies?.qagent_session;
    if (!token) throw new UnauthorizedException("Sessão não encontrada.");

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        profile: Environment;
        csrf: string;
      }>(token);
      if (!payload.sub || !["WORK", "LEARN"].includes(payload.profile)) {
        throw new UnauthorizedException();
      }

      request.user = { id: payload.sub, profile: payload.profile };
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
        const csrfCookie = request.cookies?.qagent_csrf;
        const csrfHeader = request.get("x-csrf-token");
        if (!payload.csrf || csrfCookie !== payload.csrf || csrfHeader !== payload.csrf) {
          throw new UnauthorizedException("Token CSRF inválido ou ausente.");
        }
      }
      response.setHeader("Cache-Control", "no-store");
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
  }
}
