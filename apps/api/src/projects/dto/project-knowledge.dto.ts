import { PROJECT_KNOWLEDGE_KINDS } from "@qagent/shared";
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class CreateProjectKnowledgeDto {
  @IsIn(PROJECT_KNOWLEDGE_KINDS)
  kind!: (typeof PROJECT_KNOWLEDGE_KINDS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(12000)
  content!: string;

  @IsOptional()
  @IsUrl({ protocols: ["https:"], require_protocol: true })
  @MaxLength(2048)
  externalUrl?: string | null;
}

export class UpdateProjectKnowledgeDto {
  @IsOptional()
  @IsIn(PROJECT_KNOWLEDGE_KINDS)
  kind?: (typeof PROJECT_KNOWLEDGE_KINDS)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  content?: string;

  @IsOptional()
  @IsUrl({ protocols: ["https:"], require_protocol: true })
  @MaxLength(2048)
  externalUrl?: string | null;
}
