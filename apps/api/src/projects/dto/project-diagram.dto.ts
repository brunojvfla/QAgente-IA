import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { PROJECT_DIAGRAM_NODE_TYPES, ProjectDiagramDefinition } from "@qagent/shared";

export class ProjectDiagramNodeDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  @MaxLength(80)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsIn(PROJECT_DIAGRAM_NODE_TYPES)
  type!: (typeof PROJECT_DIAGRAM_NODE_TYPES)[number];

  @IsNumber()
  @Min(0)
  @Max(1000)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  y!: number;
}

export class ProjectDiagramEdgeDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  @MaxLength(80)
  id!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  @MaxLength(80)
  source!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  @MaxLength(80)
  target!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}

export class ProjectDiagramDefinitionDto implements ProjectDiagramDefinition {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProjectDiagramNodeDto)
  nodes!: ProjectDiagramNodeDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ProjectDiagramEdgeDto)
  edges!: ProjectDiagramEdgeDto[];
}

export class CreateProjectDiagramDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ValidateNested()
  @Type(() => ProjectDiagramDefinitionDto)
  definition!: ProjectDiagramDefinitionDto;
}

export class UpdateProjectDiagramDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectDiagramDefinitionDto)
  definition?: ProjectDiagramDefinitionDto;
}

export class GenerateProjectDiagramDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  prompt!: string;
}
