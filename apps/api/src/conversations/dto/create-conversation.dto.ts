import { ENVIRONMENTS, Environment } from "@qagent/shared";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsIn(ENVIRONMENTS)
  environment!: Environment;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
