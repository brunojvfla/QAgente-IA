import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "./auth.guard";

function createContext(request: Record<string, unknown>, response = { setHeader: jest.fn() }) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const jwt = { verifyAsync: jest.fn() };
  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(reflector as unknown as Reflector, jwt as unknown as JwtService);
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it("rejects a protected request without a session cookie", async () => {
    await expect(
      guard.canActivate(createContext({ method: "GET", cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires a CSRF token for authenticated mutations", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1", profile: "WORK", csrf: "expected" });
    const request = {
      method: "POST",
      cookies: { qagent_session: "session", qagent_csrf: "expected" },
      get: () => "wrong",
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
