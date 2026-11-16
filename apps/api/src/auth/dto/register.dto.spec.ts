import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

function createRegistration(password: string) {
  return Object.assign(new RegisterDto(), {
    name: "Ana",
    email: "ana@example.com",
    phone: "+5511999999999",
    password,
    profile: "WORK",
  });
}

describe("RegisterDto password length", () => {
  it("accepts a password with six characters", async () => {
    await expect(validate(createRegistration("123456"))).resolves.toHaveLength(0);
  });

  it("rejects a password shorter than six characters", async () => {
    const errors = await validate(createRegistration("12345"));
    const passwordError = errors.find((error) => error.property === "password");

    expect(passwordError?.constraints).toHaveProperty("minLength");
  });

  it("requires a valid Brazilian phone number with DDD", async () => {
    const registration = createRegistration("123456");
    registration.phone = "";
    const errors = await validate(registration);

    expect(errors.find((error) => error.property === "phone")?.constraints).toHaveProperty(
      "matches",
    );
  });
});
