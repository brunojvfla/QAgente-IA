import { ENVIRONMENTS, Environment } from "@qagent/shared";
import { IsIn, IsOptional, IsUUID } from "class-validator";

export class FileListQueryDto {
  @IsIn(ENVIRONMENTS)
  environment!: Environment;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
