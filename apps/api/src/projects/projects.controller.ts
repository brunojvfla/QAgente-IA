import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ListProjectsDto } from "./dto/list-projects.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiCookieAuth("qagent_session")
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListProjectsDto) {
    return this.projectsService.list(request.user.id, query);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateProjectDto) {
    return this.projectsService.create(
      request.user.id,
      body.name,
      body.description,
      body.category,
    );
  }

  @Get(":id")
  get(@Req() request: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.projectsService.findOwned(request.user.id, id);
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectsService.update(request.user.id, id, body);
  }

  @Patch(":id/archive")
  archive(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.setArchived(request.user.id, id, true);
  }

  @Patch(":id/restore")
  restore(
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.setArchived(request.user.id, id, false);
  }
}
