import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { AuthenticatedRequest } from "../common/auth.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { FileEnvironmentQueryDto } from "./dto/file-environment-query.dto";
import { FileListQueryDto } from "./dto/file-list-query.dto";
import { MoveFileDto } from "./dto/move-file.dto";
import { MoveFolderDto } from "./dto/move-folder.dto";
import { RenameFileDto } from "./dto/rename-file.dto";
import { FilesService, MAX_WORKSPACE_FILE_SIZE, UploadedWorkspaceFile } from "./files.service";

@ApiTags("files")
@ApiCookieAuth("qagent_session")
@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  @ApiOperation({ summary: "Listar pastas e arquivos do usuário no ambiente selecionado" })
  list(@Req() request: AuthenticatedRequest, @Query() query: FileListQueryDto) {
    return this.files.list(request.user.id, query);
  }

  @Get("folders")
  @ApiOperation({ summary: "Listar destinos de pasta disponíveis para movimentação" })
  folders(@Req() request: AuthenticatedRequest, @Query() query: FileListQueryDto) {
    return this.files.allFolders(request.user.id, query.environment, query.projectId);
  }

  @Post("folders")
  @ApiOperation({ summary: "Criar uma pasta local no ambiente ou projeto selecionado" })
  createFolder(@Req() request: AuthenticatedRequest, @Body() body: CreateFolderDto) {
    return this.files.createFolder(request.user.id, body);
  }

  @Patch("folders/:folderId")
  @ApiOperation({ summary: "Renomear uma pasta" })
  renameFolder(
    @Req() request: AuthenticatedRequest,
    @Param("folderId") folderId: string,
    @Body() body: RenameFileDto,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.renameFolder(request.user.id, query.environment, folderId, body.name);
  }

  @Patch("folders/:folderId/move")
  @ApiOperation({ summary: "Mover uma pasta dentro do mesmo projeto" })
  moveFolder(
    @Req() request: AuthenticatedRequest,
    @Param("folderId") folderId: string,
    @Body() body: MoveFolderDto,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.moveFolder(
      request.user.id,
      query.environment,
      folderId,
      body.parentId ?? null,
    );
  }

  @Delete("folders/:folderId")
  @HttpCode(204)
  @ApiOperation({ summary: "Excluir uma pasta vazia" })
  deleteFolder(
    @Req() request: AuthenticatedRequest,
    @Param("folderId") folderId: string,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.deleteFolder(request.user.id, query.environment, folderId);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_WORKSPACE_FILE_SIZE, files: 1 },
    }),
  )
  @ApiOperation({ summary: "Enviar um arquivo para o armazenamento local do usuário" })
  upload(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedWorkspaceFile | undefined,
    @Query() query: FileListQueryDto,
  ) {
    return this.files.upload(
      request.user.id,
      query.environment,
      file,
      query.folderId,
      query.projectId,
    );
  }

  @Get(":fileId/content")
  @ApiOperation({ summary: "Abrir ou baixar um arquivo autorizado" })
  async content(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string,
    @Query() query: FileEnvironmentQueryDto,
    @Query("download") download: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.files.content(request.user.id, query.environment, fileId);
    const shouldInline = result.inline && download !== "1" && download !== "true";
    const encodedName = encodeURIComponent(result.file.name);
    response.set({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${shouldInline ? "inline" : "attachment"}; filename="download"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(result.file.size),
      "Content-Security-Policy": "sandbox; default-src 'none';",
      "Content-Type": shouldInline ? result.file.mimeType : "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    return new StreamableFile(result.stream);
  }

  @Patch(":fileId")
  @ApiOperation({ summary: "Renomear um arquivo" })
  renameFile(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string,
    @Body() body: RenameFileDto,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.renameFile(request.user.id, query.environment, fileId, body.name);
  }

  @Patch(":fileId/move")
  @ApiOperation({ summary: "Mover um arquivo dentro do mesmo projeto" })
  moveFile(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string,
    @Body() body: MoveFileDto,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.moveFile(
      request.user.id,
      query.environment,
      fileId,
      body.folderId ?? null,
    );
  }

  @Delete(":fileId")
  @HttpCode(204)
  @ApiOperation({ summary: "Excluir um arquivo do armazenamento local" })
  deleteFile(
    @Req() request: AuthenticatedRequest,
    @Param("fileId") fileId: string,
    @Query() query: FileEnvironmentQueryDto,
  ) {
    return this.files.deleteFile(request.user.id, query.environment, fileId);
  }
}
