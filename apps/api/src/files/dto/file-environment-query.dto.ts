import { ENVIRONMENTS, Environment } from "@qagent/shared";
import { IsIn } from "class-validator";

export class FileEnvironmentQueryDto {
  @IsIn(ENVIRONMENTS)
  environment!: Environment;
}
