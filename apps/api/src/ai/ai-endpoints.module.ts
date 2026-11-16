import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AiController } from "./ai.controller";
import { AiModule } from "./ai.module";
import { QaToolsService } from "./qa-tools.service";

@Module({
  imports: [AiModule, UsersModule],
  controllers: [AiController],
  providers: [QaToolsService],
})
export class AiEndpointsModule {}
