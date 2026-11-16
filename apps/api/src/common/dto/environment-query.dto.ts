import { ENVIRONMENTS, Environment } from "@qagent/shared";
import { IsIn } from "class-validator";

export class EnvironmentQueryDto {
  @IsIn(ENVIRONMENTS)
  environment!: Environment;
}
