import { z } from "zod";
import { translate } from "@/lib/i18n/translate";

export const MIN_PASSWORD_LENGTH = 8;

export const credentialsSchema = z.object({
  email: z.email({ error: () => translate("auth.errors.invalidEmail") }).trim(),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, { error: () => translate("auth.errors.passwordTooShort") }),
});

export type Credentials = z.infer<typeof credentialsSchema>;
