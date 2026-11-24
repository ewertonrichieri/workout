import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeNextStep } from "./home-next-step";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("HomeNextStep", () => {
  it("sends a new user to the assessment", () => {
    render(<HomeNextStep status={{ hasAssessment: false, hasActivePlan: false }} />);
    expect(screen.getByRole("link", { name: "Fazer anamnese" })).toHaveAttribute("href", "/assessment");
    expect(screen.queryByRole("button", { name: "Gerar plano com IA" })).not.toBeInTheDocument();
  });

  it("offers the generation once the assessment is saved", () => {
    render(<HomeNextStep status={{ hasAssessment: true, hasActivePlan: false }} />);
    expect(screen.getByRole("button", { name: "Gerar plano com IA" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atualizar anamnese" })).toHaveAttribute("href", "/assessment");
  });

  it("opens the workout when there is an active plan", () => {
    render(<HomeNextStep status={{ hasAssessment: true, hasActivePlan: true }} />);
    expect(screen.getByRole("link", { name: "Ver meu treino" })).toHaveAttribute("href", "/workout");
  });
});
