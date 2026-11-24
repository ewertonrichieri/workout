// @vitest-environment node
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { readJsonBody } from "./read-json-body";

describe("readJsonBody", () => {
  it("parses JSON and rejects malformed bodies with an input error", async () => {
    await expect(readJsonBody(new Request("http://test", { method: "POST", body: '{"a":1}' }))).resolves.toEqual({ a: 1 });
    await expect(readJsonBody(new Request("http://test", { method: "POST", body: "{oops" }))).rejects.toBeInstanceOf(InvalidInputError);
  });
});
