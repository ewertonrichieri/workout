import { InvalidInputError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

/** Request JSON body; malformed JSON becomes a 400 with a pt-BR message. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new InvalidInputError(translate("errors.invalidInput"));
    throw error;
  }
}
