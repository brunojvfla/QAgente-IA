import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { EnvironmentQueryDto } from "../../common/dto/environment-query.dto";

export class ListConversationsDto extends EnvironmentQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(["true", "false"])
  unassigned?: "true" | "false";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED", "ALL"])
  status?: "ACTIVE" | "ARCHIVED" | "ALL";

  @IsOptional()
  @IsIn(["createdAt", "updatedAt"])
  sort?: "createdAt" | "updatedAt";
}
