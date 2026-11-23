import messages from "@/messages/pt-BR.json";

type Messages = typeof messages;

/** Dot-separated paths to every string leaf, e.g. "navigation.workout". */
type MessageKey<Tree, Prefix extends string = ""> = {
  [Key in keyof Tree & string]: Tree[Key] extends string
    ? `${Prefix}${Key}`
    : MessageKey<Tree[Key], `${Prefix}${Key}.`>;
}[keyof Tree & string];

export type TranslationKey = MessageKey<Messages>;
export type TranslationParams = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

class MissingTranslationError extends Error {
  constructor(key: string) {
    super(`Missing translation for key: ${key}`);
    this.name = "MissingTranslationError";
  }
}

function findMessage(key: string): string {
  const message = key
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        typeof node === "object" && node !== null ? (node as Record<string, unknown>)[segment] : undefined,
      messages,
    );
  if (typeof message !== "string") throw new MissingTranslationError(key);
  return message;
}

export function translate(key: TranslationKey, params: TranslationParams = {}): string {
  return findMessage(key).replace(PLACEHOLDER_PATTERN, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}
