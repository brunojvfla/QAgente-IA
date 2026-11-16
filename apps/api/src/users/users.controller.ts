import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AiService } from "../ai/ai.service";
import { AuthenticatedRequest } from "../common/auth.guard";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiCookieAuth("qagent_session")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ai: AiService,
  ) {}

  @Get("me")
  async getCurrentUser(@Req() request: AuthenticatedRequest) {
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

  @Patch("me")
  @ApiOperation({ summary: "Atualizar dados da conta" })
  async updateCurrentUser(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateAccountDto,
  ) {
    const user = await this.usersService.updateAccount(request.user.id, {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile: user.profile?.type ?? request.user.profile,
    };
  }

  @Get("me/settings")
  @ApiOperation({ summary: "Consultar preferências da QIA" })
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.usersService.getPreferences(request.user.id);
  }

  @Patch("me/settings")
  @ApiOperation({ summary: "Atualizar preferências da QIA" })
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdatePreferencesDto,
  ) {
    const model = body.aiModel?.trim() || null;
    if (model && !this.ai.isModelEnabled(model)) {
      throw new BadRequestException("O modelo solicitado não está habilitado pelo backend.");
    }
    return this.usersService.updatePreferences(request.user.id, {
      writingStyle: body.writingStyle,
      responseDetail: body.responseDetail,
      aiModel: model,
    });
  }
}
