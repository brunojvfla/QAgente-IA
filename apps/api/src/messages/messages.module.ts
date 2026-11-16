import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ConversationsModule } from "../conversations/conversations.module";
import { UsersModule } from "../users/users.module";
import { ProjectsModule } from "../projects/projects.module";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";

@Module({
  imports: [AiModule, ConversationsModule, UsersModule, ProjectsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
