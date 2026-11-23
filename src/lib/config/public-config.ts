import { z } from "zod";
import { ConfigValidationError } from "@/lib/config/config";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export interface PublicConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function parsePublicConfig(environment: Record<string, string | undefined>): PublicConfig {
  const result = publicEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw new ConfigValidationError(result.error.issues.map((issue) => issue.path.join(".")));
  }
  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

let cachedPublicConfig: PublicConfig | undefined;

/** Safe for client and server. Explicit references let Next.js inline NEXT_PUBLIC_ values. */
export function getPublicConfig(): PublicConfig {
  cachedPublicConfig ??= parsePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedPublicConfig;
}
