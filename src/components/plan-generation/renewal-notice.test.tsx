import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenewalNotice } from "./renewal-notice";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("RenewalNotice", () => {
  it("counts the days left and offers to renew (asking before replacing)", () => {
    render(<RenewalNotice renewal={{ validUntil: "2026-12-13", remainingDays: 3, isExpired: false }} />);
    expect(screen.getByText("Seu plano vence em 3 dias.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renovar plano com a IA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atualizar anamnese antes" })).toHaveAttribute("href", "/assessment");
  });

  it("handles the last day and an expired plan", () => {
    const { rerender } = render(<RenewalNotice renewal={{ validUntil: "2026-12-13", remainingDays: 0, isExpired: false }} />);
    expect(screen.getByText("Hoje é o último dia do seu plano.")).toBeInTheDocument();
    rerender(<RenewalNotice renewal={{ validUntil: "2026-12-13", remainingDays: 0, isExpired: true }} />);
    expect(screen.getByText("Seu plano venceu em 13/12/2026.")).toBeInTheDocument();
  });
});
