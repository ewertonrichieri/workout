import { InvalidInputError } from "@/lib/errors/app-errors";
import { translate } from "@/lib/i18n/translate";

/** Room for the multipart boundaries and headers around the files. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

interface FormDataLimit {
  /** Limit of the files together; the body may add the multipart overhead. */
  maxBytes: number;
  tooLargeMessage: string;
}

function readDeclaredLength(request: Request): number | null {
  const header = request.headers.get("content-length");
  const length = header === null ? Number.NaN : Number(header);
  return Number.isFinite(length) ? length : null;
}

/** Multipart body (file uploads); a declared size above the limit or a malformed body becomes a 400 in pt-BR. */
export async function readFormData(request: Request, { maxBytes, tooLargeMessage }: FormDataLimit): Promise<FormData> {
  const declaredLength = readDeclaredLength(request);
  if (declaredLength !== null && declaredLength > maxBytes + MULTIPART_OVERHEAD_BYTES) throw new InvalidInputError(tooLargeMessage);
  try {
    return await request.formData();
  } catch (error) {
    if (error instanceof TypeError) throw new InvalidInputError(translate("errors.invalidInput"));
    throw error;
  }
}
