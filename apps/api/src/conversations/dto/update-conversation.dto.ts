import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
