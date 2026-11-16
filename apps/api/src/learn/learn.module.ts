import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { UsersModule } from "../users/users.module";
import { LearnController } from "./learn.controller";
import { LearnService } from "./learn.service";

@Module({
  imports: [AiModule, UsersModule],
  controllers: [LearnController],
  providers: [LearnService],
})
export class LearnModule {}
