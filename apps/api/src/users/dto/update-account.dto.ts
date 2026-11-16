import { BRAZILIAN_PHONE_E164_PATTERN } from "@qagent/shared";
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/\S/, { message: "Informe um nome válido." })
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(BRAZILIAN_PHONE_E164_PATTERN, {
    message: "Informe um telefone brasileiro válido com DDD.",
  })
  phone!: string;
}
