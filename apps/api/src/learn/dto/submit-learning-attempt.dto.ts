import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SubmitLearningAttemptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @Matches(/\S/, { message: "Escreva uma resposta antes de enviar." })
  answer!: string;
}
