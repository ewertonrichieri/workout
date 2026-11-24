import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeNextStep } from "./home-next-step";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("HomeNextStep", () => {
  it("sends a new user to the assessment", () => {
    render(<HomeNextStep status={{ hasAssessment: false, hasActivePlan: false, hasLimitations: false, renewal: null }} />);
    expect(screen.getByRole("link", { name: "Fazer anamnese" })).toHaveAttribute("href", "/assessment");
    expect(screen.queryByRole("button", { name: "Gerar plano com IA" })).not.toBeInTheDocument();
  });

  it("offers the generation once the assessment is saved", () => {
    render(<HomeNextStep status={{ hasAssessment: true, hasActivePlan: false, hasLimitations: false, renewal: null }} />);
    expect(screen.getByRole("button", { name: "Gerar plano com IA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atualizar anamnese" })).toHaveAttribute("href", "/assessment");
  });

  it("opens the workout when there is an active plan", () => {
    render(<HomeNextStep status={{ hasAssessment: true, hasActivePlan: true, hasLimitations: false, renewal: null }} />);
    expect(screen.getByRole("link", { name: "Ver meu treino" })).toHaveAttribute("href", "/workout");
    expect(screen.queryByRole("button", { name: "Renovar plano com a IA" })).not.toBeInTheDocument();
  });

  it("suggests renewing a plan close to the end", () => {
    render(<HomeNextStep status={{ hasAssessment: true, hasActivePlan: true, hasLimitations: false, renewal: { validUntil: "2026-12-13", remainingDays: 2, isExpired: false } }} />);
    expect(screen.getByText("Seu plano vence em 2 dias.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renovar plano com a IA" })).toBeInTheDocument();
  });
});
