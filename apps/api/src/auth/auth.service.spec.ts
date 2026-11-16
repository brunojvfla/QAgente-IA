import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

jest.mock("argon2", () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe("AuthService", () => {
  let service: AuthService;
  const users = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findPublicById: jest.fn(),
    findByIdWithPassword: jest.fn(),
    updatePassword: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.mocked(argon2.hash).mockResolvedValue("argon2id-hash");
    jwt.signAsync.mockResolvedValue("signed-session");
  });

  it("creates a user with a normalized email and selected profile", async () => {
    users.create.mockResolvedValue({
      id: "user-1",
      name: "Ana QA",
      email: "ana@example.com",
      phone: "+5511999999999",
      profile: { type: "LEARN" },
    });

    const result = await service.register({
      name: " Ana QA ",
      email: "ANA@example.com",
      phone: "+5511999999999",
      password: "a-strong-password",
      profile: "LEARN",
    });

    expect(users.create).toHaveBeenCalledWith(
      "Ana QA",
      "ana@example.com",
      "+5511999999999",
      "argon2id-hash",
      "LEARN",
    );
    expect(result.user.profile).toBe("LEARN");
    expect(result.token).toBe("signed-session");
  });

  it("rejects duplicate email registration", async () => {
    users.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      service.register({
        name: "Ana",
        email: "ana@example.com",
        phone: "+5511999999999",
        password: "a-strong-password",
        profile: "WORK",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("logs in with valid credentials and the account profile", async () => {
    users.findByEmail.mockResolvedValue({
      id: "user-1",
      passwordHash: "argon2id-hash",
      status: "ACTIVE",
    });
    users.findPublicById.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "+5511999999999",
      profile: { type: "WORK" },
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    const result = await service.login("ana@example.com", "a-strong-password");

    expect(result.user.profile).toBe("WORK");
    expect(result.token).toBe("signed-session");
  });

  it("rejects invalid login credentials", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(service.login("missing@example.com", "wrong-password")).rejects.toMatchObject({
      status: 401,
    });
    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("changes the password only after verifying the current password", async () => {
    users.findByIdWithPassword.mockResolvedValue({
      id: "user-1",
      passwordHash: "old-hash",
      status: "ACTIVE",
    });
    users.updatePassword.mockResolvedValue({ id: "user-1" });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      service.changePassword("user-1", "current-password", "new-password"),
    ).resolves.toEqual({ success: true });
    expect(argon2.verify).toHaveBeenCalledWith("old-hash", "current-password");
    expect(users.updatePassword).toHaveBeenCalledWith("user-1", "argon2id-hash");
  });

  it("does not change the password when the current password is invalid", async () => {
    users.findByIdWithPassword.mockResolvedValue({
      id: "user-1",
      passwordHash: "old-hash",
      status: "ACTIVE",
    });
    jest.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      service.changePassword("user-1", "wrong-password", "new-password"),
    ).rejects.toMatchObject({ status: 401 });
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});
