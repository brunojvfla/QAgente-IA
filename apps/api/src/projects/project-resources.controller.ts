import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest } from "../common/auth.guard";
import {
  CreateProjectDiagramDto,
  GenerateProjectDiagramDto,
  UpdateProjectDiagramDto,
} from "./dto/project-diagram.dto";
import {
  CreateProjectKnowledgeDto,
  UpdateProjectKnowledgeDto,
} from "./dto/project-knowledge.dto";
import { CreateProjectTaskDto, UpdateProjectTaskDto } from "./dto/project-task.dto";
import { ProjectResourcesService } from "./project-resources.service";

@ApiTags("project resources")
@ApiCookieAuth("qagent_session")
@Controller("projects/:projectId")
export class ProjectResourcesController {
  constructor(private readonly resources: ProjectResourcesService) {}

  @Get("knowledge")
  listKnowledge(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.resources.listKnowledge(request.user.id, projectId);
  }

  @Post("knowledge")
  createKnowledge(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: CreateProjectKnowledgeDto,
  ) {
    return this.resources.createKnowledge(request.user.id, projectId, body);
  }

  @Patch("knowledge/:itemId")
  updateKnowledge(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() body: UpdateProjectKnowledgeDto,
  ) {
    return this.resources.updateKnowledge(request.user.id, projectId, itemId, body);
  }

  @Delete("knowledge/:itemId")
  deleteKnowledge(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.resources.deleteKnowledge(request.user.id, projectId, itemId);
  }

  @Get("tasks")
  listTasks(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.resources.listTasks(request.user.id, projectId);
  }

  @Post("tasks")
  createTask(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: CreateProjectTaskDto,
  ) {
    return this.resources.createTask(request.user.id, projectId, body);
  }

  @Patch("tasks/:taskId")
  updateTask(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() body: UpdateProjectTaskDto,
  ) {
    return this.resources.updateTask(request.user.id, projectId, taskId, body);
  }

  @Delete("tasks/:taskId")
  deleteTask(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
  ) {
    return this.resources.deleteTask(request.user.id, projectId, taskId);
  }

  @Get("diagrams")
  listDiagrams(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.resources.listDiagrams(request.user.id, projectId);
  }

  @Post("diagrams")
  createDiagram(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: CreateProjectDiagramDto,
  ) {
    return this.resources.createDiagram(request.user.id, projectId, body);
  }

  @Patch("diagrams/:diagramId")
  updateDiagram(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("diagramId", ParseUUIDPipe) diagramId: string,
    @Body() body: UpdateProjectDiagramDto,
  ) {
    return this.resources.updateDiagram(request.user.id, projectId, diagramId, body);
  }

  @Delete("diagrams/:diagramId")
  deleteDiagram(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("diagramId", ParseUUIDPipe) diagramId: string,
  ) {
    return this.resources.deleteDiagram(request.user.id, projectId, diagramId);
  }

  @Post("diagrams/generate")
  generateDiagram(
    @Req() request: AuthenticatedRequest,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: GenerateProjectDiagramDto,
  ) {
    return this.resources.generateDiagram(request.user.id, projectId, body.prompt);
  }
}
