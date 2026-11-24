import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.fn(() => ({ kind: "server" }));
const createBrowserClient = vi.fn(() => ({ kind: "browser" }));
const cookieStore = { getAll: vi.fn(() => [{ name: "a", value: "1" }]), set: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient, createBrowserClient }));
const connection = vi.fn(async () => undefined);
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/config/public-config", () => ({
  getPublicConfig: () => ({
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "sb_publishable_test",
  }),
}));

interface CookieAdapter {
  getAll: () => unknown;
  setAll: (cookies: { name: string; value: string; options: object }[]) => void;
}

describe("Supabase clients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the browser client with the public config", async () => {
    const { createBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
    createBrowserSupabaseClient();
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_test");
  });

  it("creates the server client wired to the request cookies", async () => {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server-client");
    await createServerSupabaseClient();
    const [url, key, options] = createServerClient.mock.calls[0] as unknown as [
      string,
      string,
      { cookies: CookieAdapter },
    ];
    expect([url, key]).toEqual(["https://example.supabase.co", "sb_publishable_test"]);
    // Request-time only: never prerendered (supabase-js reads the current time).
    expect(connection).toHaveBeenCalled();
    expect(options.cookies.getAll()).toEqual([{ name: "a", value: "1" }]);
    options.cookies.setAll([{ name: "b", value: "2", options: {} }]);
    expect(cookieStore.set).toHaveBeenCalledWith("b", "2", {});
  });
});
