import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratePlanButton } from "./generate-plan-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof mockFetch>): unknown {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("GeneratePlanButton", () => {
  it("generates right away without an active plan and opens the workout", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { planId: "plan-1" } });
    render(<GeneratePlanButton hasActivePlan={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar plano com IA" }));
    expect(screen.getByRole("status")).toHaveTextContent("pode levar até 2 minutos");
    expect(screen.getByRole("button", { name: "Gerando plano..." })).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/workout"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/plans");
    expect(sentBody(fetchMock)).toEqual({ replaceActivePlan: false });
  });

  it("asks before replacing an active plan and lets the user cancel", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { planId: "plan-1" } });
    render(<GeneratePlanButton hasActivePlan />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar plano com IA" }));
    expect(screen.getByText(/o plano atual fica arquivado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Gerar plano com IA" }));
    fireEvent.click(screen.getByRole("button", { name: "Substituir plano" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/workout"));
    expect(sentBody(fetchMock)).toEqual({ replaceActivePlan: true });
  });

  it("shows the server message when generation fails and allows a new try", async () => {
    mockFetch(502, { success: false, error: "A IA demorou demais para responder. Seus dados foram mantidos; tente novamente." });
    render(<GeneratePlanButton hasActivePlan={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar plano com IA" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("A IA demorou demais"));
    expect(screen.getByRole("button", { name: "Gerar plano com IA" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});
