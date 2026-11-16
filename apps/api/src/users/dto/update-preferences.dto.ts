import { RESPONSE_DETAILS, WRITING_STYLES } from "@qagent/shared";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ResponseDetail, WritingStyle } from "@qagent/shared";

export class UpdatePreferencesDto {
  @IsIn(WRITING_STYLES)
  writingStyle!: WritingStyle;

  @IsIn(RESPONSE_DETAILS)
  responseDetail!: ResponseDetail;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiModel?: string | null;
}
