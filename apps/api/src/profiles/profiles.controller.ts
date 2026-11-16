import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { ProfilesService } from "./profiles.service";

@ApiTags("profiles")
@ApiCookieAuth("qagent_session")
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  async getCurrentProfile(@Req() request: AuthenticatedRequest) {
    const profile = await this.profilesService.findForUser(request.user.id);
    if (!profile) throw new UnauthorizedException("Perfil não encontrado.");
    return profile;
  }
}
