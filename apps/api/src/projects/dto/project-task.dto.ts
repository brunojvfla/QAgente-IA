import { PROJECT_TASK_PRIORITIES, PROJECT_TASK_STATUSES } from "@qagent/shared";
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(PROJECT_TASK_STATUSES)
  status?: (typeof PROJECT_TASK_STATUSES)[number];

  @IsOptional()
  @IsIn(PROJECT_TASK_PRIORITIES)
  priority?: (typeof PROJECT_TASK_PRIORITIES)[number];

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

export class UpdateProjectTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(PROJECT_TASK_STATUSES)
  status?: (typeof PROJECT_TASK_STATUSES)[number];

  @IsOptional()
  @IsIn(PROJECT_TASK_PRIORITIES)
  priority?: (typeof PROJECT_TASK_PRIORITIES)[number];

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}
