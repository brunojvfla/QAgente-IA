import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiModule } from "./ai/ai.module";
import { AiEndpointsModule } from "./ai/ai-endpoints.module";
import { AuthModule } from "./auth/auth.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { HealthModule } from "./health/health.module";
import { FilesModule } from "./files/files.module";
import { LearnModule } from "./learn/learn.module";
import { MessagesModule } from "./messages/messages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    ConversationsModule,
    MessagesModule,
    LearnModule,
    FilesModule,
    ProjectsModule,
    AiModule,
    AiEndpointsModule,
    HealthModule,
  ],
})
export class AppModule {}
