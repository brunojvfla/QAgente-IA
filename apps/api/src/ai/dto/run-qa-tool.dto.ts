import { QA_TOOL_TYPES, QaToolType } from "@qagent/shared";
import { IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RunQaToolDto {
  @IsIn(QA_TOOL_TYPES)
  tool!: QaToolType;

  @IsString()
  @MinLength(1)
  @MaxLength(15000)
  @Matches(/\S/, { message: "Informe o conteúdo a ser analisado." })
  input!: string;
}
