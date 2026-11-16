import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { EnvironmentQueryDto } from "../common/dto/environment-query.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ConversationsService } from "./conversations.service";

@ApiTags("conversations")
@ApiCookieAuth("qagent_session")
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversationsService.list(request.user.id, query);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateConversationDto) {
    return this.conversationsService.create(
      request.user.id,
      body.environment,
      body.title,
      body.projectId,
    );
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: EnvironmentQueryDto,
    @Body() body: UpdateConversationDto,
  ) {
    return this.conversationsService.update(
      request.user.id,
      query.environment,
      id,
      body,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: EnvironmentQueryDto,
  ): Promise<void> {
    await this.conversationsService.remove(request.user.id, query.environment, id);
  }
}
