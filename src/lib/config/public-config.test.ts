import { describe, expect, it } from "vitest";
import { ConfigValidationError } from "@/lib/config/config";
import { parsePublicConfig } from "@/lib/config/public-config";

const VALID_INPUT = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parsePublicConfig", () => {
  it("returns typed Supabase settings", () => {
    expect(parsePublicConfig(VALID_INPUT)).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_test",
    });
  });

  it("rejects an invalid URL naming the variable", () => {
    const input = { ...VALID_INPUT, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" };
    expect(() => parsePublicConfig(input)).toThrow(ConfigValidationError);
    expect(() => parsePublicConfig(input)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects a missing key naming the variable", () => {
    const input = { ...VALID_INPUT, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined };
    expect(() => parsePublicConfig(input)).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});
