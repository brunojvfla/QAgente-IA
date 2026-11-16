import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { UsersModule } from "../users/users.module";
import { ProjectsController } from "./projects.controller";
import { ProjectResourcesController } from "./project-resources.controller";
import { ProjectResourcesService } from "./project-resources.service";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [AiModule, UsersModule],
  controllers: [ProjectsController, ProjectResourcesController],
  providers: [ProjectsService, ProjectResourcesService],
  exports: [ProjectsService, ProjectResourcesService],
})
export class ProjectsModule {}
