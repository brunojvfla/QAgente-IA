import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  @Matches(/\S/, { message: "A mensagem não pode estar vazia." })
  content!: string;
}
