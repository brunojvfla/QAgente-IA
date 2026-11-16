import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ListProjectsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "ARCHIVED", "ALL"])
  status?: "ACTIVE" | "ARCHIVED" | "ALL";

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
