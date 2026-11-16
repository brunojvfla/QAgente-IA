import { ENVIRONMENTS, Environment } from "@qagent/shared";
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

export class CreateFolderDto {
  @IsIn(ENVIRONMENTS)
  environment!: Environment;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @Matches(/\S/, { message: "Informe o nome da pasta." })
  @Matches(/^[^/\\]+$/, { message: "O nome não pode conter separadores de caminho." })
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
