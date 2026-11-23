import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TEST_SETUP_MARKER } from "@/test/setup-marker";

describe("test setup", () => {
  it("resolves the @ path alias", () => {
    expect(TEST_SETUP_MARKER).toBe("ok");
  });

  it("renders React components in jsdom with jest-dom matchers", () => {
    render(<h1>Treino</h1>);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
