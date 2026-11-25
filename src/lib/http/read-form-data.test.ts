// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "@/lib/errors/app-errors";
import { readFormData } from "./read-form-data";

const LIMIT = { maxBytes: 1_000, tooLargeMessage: "grande demais" };

function multipartRequest(body: FormData, headers: Record<string, string> = {}) {
  return new Request("http://test", { method: "POST", body, headers });
}

describe("readFormData", () => {
  it("parses multipart bodies", async () => {
    const body = new FormData();
    body.append("photos", new File([new Uint8Array([1, 2])], "a.jpg"));
    const form = await readFormData(multipartRequest(body), LIMIT);
    expect(form.getAll("photos")).toHaveLength(1);
  });

  it("rejects bodies that are not multipart with an input error", async () => {
    const request = new Request("http://test", { method: "POST", body: '{"a":1}', headers: { "Content-Type": "application/json" } });
    await expect(readFormData(request, LIMIT)).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("rejects a declared size above the limit before reading the body", async () => {
    // A real Request drops Content-Length (forbidden header); the server receives it from the network.
    const formData = vi.fn();
    const request = { headers: new Headers({ "content-length": "500000" }), formData } as unknown as Request;
    await expect(readFormData(request, LIMIT)).rejects.toThrow("grande demais");
    expect(formData).not.toHaveBeenCalled();
  });
});
