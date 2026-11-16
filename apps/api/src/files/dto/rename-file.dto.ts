import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RenameFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/\S/, { message: "Informe o nome do arquivo." })
  @Matches(/^[^/\\]+$/, { message: "O nome não pode conter separadores de caminho." })
  name!: string;
}
