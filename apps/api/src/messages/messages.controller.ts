import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { EnvironmentQueryDto } from "../common/dto/environment-query.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { MessagesService } from "./messages.service";

@ApiTags("messages")
@ApiCookieAuth("qagent_session")
@Controller("conversations/:conversationId/messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Query() query: EnvironmentQueryDto,
  ) {
    return this.messagesService.list(
      request.user.id,
      query.environment,
      conversationId,
    );
  }

  @Post()
  send(
    @Req() request: AuthenticatedRequest,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Query() query: EnvironmentQueryDto,
    @Body() body: CreateMessageDto,
  ) {
    return this.messagesService.send(
      request.user.id,
      query.environment,
      conversationId,
      body.content,
    );
  }
}
