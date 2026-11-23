import { describe, expect, it, vi } from "vitest";
import {
  createAuthService,
  type AuthClient,
} from "@/lib/auth/auth-service";
import { UnauthorizedError } from "@/lib/errors/app-errors";

function createFakeAuthClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    signInWithPassword: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: { url: "https://accounts.example/oauth" }, error: null })),
    exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
    ...overrides,
  };
}

const VALID_CREDENTIALS = { email: "pessoa@example.com", password: "senha-segura" };
const ORIGIN = "http://localhost:3000";

describe("auth service", () => {
  it("rejects invalid credentials before calling Supabase", async () => {
    const client = createFakeAuthClient();
    const result = await createAuthService(client).signInWithPassword({ email: "x", password: "1" });
    expect(result.success).toBe(false);
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with valid credentials", async () => {
    const client = createFakeAuthClient();
    const result = await createAuthService(client).signInWithPassword(VALID_CREDENTIALS);
    expect(result).toEqual({ success: true });
    expect(client.signInWithPassword).toHaveBeenCalledWith(VALID_CREDENTIALS);
  });

  it("maps Supabase errors to pt-BR messages without leaking details", async () => {
    const client = createFakeAuthClient({
      signInWithPassword: vi.fn(async () => ({
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      })),
    });
    const result = await createAuthService(client).signInWithPassword(VALID_CREDENTIALS);
    expect(result).toEqual({ success: false, error: "E-mail ou senha incorretos." });
  });

  it("asks the user to confirm the e-mail after sign up", async () => {
    const client = createFakeAuthClient();
    const result = await createAuthService(client).signUpWithPassword(VALID_CREDENTIALS, ORIGIN);
    expect(result).toEqual({ success: true, data: { needsEmailConfirmation: true } });
    expect(client.signUp).toHaveBeenCalledWith({
      ...VALID_CREDENTIALS,
      options: { emailRedirectTo: `${ORIGIN}/auth/callback` },
    });
  });

  it("returns the Google OAuth URL pointing back to the callback", async () => {
    const client = createFakeAuthClient();
    const result = await createAuthService(client).getGoogleSignInUrl(ORIGIN, "/treino");
    expect(result).toEqual({ success: true, data: { url: "https://accounts.example/oauth" } });
    expect(client.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${ORIGIN}/auth/callback?next=%2Ftreino` },
    });
  });

  it("returns the authenticated user id from the session", async () => {
    const userId = await createAuthService(createFakeAuthClient()).getAuthenticatedUserId();
    expect(userId).toBe("user-1");
  });

  it("throws UnauthorizedError without a session", async () => {
    const client = createFakeAuthClient({
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    });
    await expect(createAuthService(client).getAuthenticatedUserId()).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
