import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SavedAssessment } from "@/lib/assessment/assessment-schema";
import { AssessmentForm } from "./assessment-form";
import { readAssessmentForm } from "./assessment-form-values";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const EQUIPMENT = [
  { slug: "bench", name: "Banco" },
  { slug: "bodyweight", name: "Peso corporal" },
  { slug: "dumbbell", name: "Halteres" },
];

const LATEST: SavedAssessment = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-11-26T10:00:00.000Z",
  goal: "strength",
  experienceLevel: "advanced",
  daysPerWeek: 5,
  sessionMinutes: 75,
  splitPreference: "split",
  equipmentSlugs: ["dumbbell"],
  limitations: "Ombro direito",
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function fillRequiredFields() {
  fireEvent.click(screen.getByRole("radio", { name: "Hipertrofia (ganhar massa)" }));
  fireEvent.click(screen.getByRole("radio", { name: "Iniciante" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Banco" }));
}

afterEach(() => vi.unstubAllGlobals());

describe("readAssessmentForm", () => {
  it("turns form data into the API payload", () => {
    const data = new FormData();
    data.set("goal", "weight_loss");
    data.set("experienceLevel", "beginner");
    data.set("daysPerWeek", "2");
    data.set("sessionMinutes", " 40 ");
    data.set("splitPreference", "full_body");
    data.append("equipmentSlugs", "bench");
    data.append("equipmentSlugs", "dumbbell");
    data.set("limitations", "Joelho");
    expect(readAssessmentForm(data)).toEqual({
      goal: "weight_loss",
      experienceLevel: "beginner",
      daysPerWeek: 2,
      sessionMinutes: 40,
      splitPreference: "full_body",
      equipmentSlugs: ["bench", "dumbbell"],
      limitations: "Joelho",
    });
  });

  it("keeps missing or non-numeric answers invalid", () => {
    const data = new FormData();
    data.set("sessionMinutes", "");
    const payload = readAssessmentForm(data);
    expect(payload.goal).toBeNull();
    expect(payload.sessionMinutes).toBeNaN();
    expect(payload.equipmentSlugs).toEqual([]);
  });
});

describe("AssessmentForm", () => {
  it("shows an error per invalid field and sends nothing", () => {
    const fetchMock = mockFetch(201, {});
    render(<AssessmentForm equipment={EQUIPMENT} latest={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    expect(screen.getByText("Escolha um objetivo.")).toBeInTheDocument();
    expect(screen.getByText("Escolha seu nível.")).toBeInTheDocument();
    expect(screen.getByText("Marque ao menos um equipamento.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Confira os campos destacados.");
    expect(screen.getByRole("group", { name: "Objetivo" })).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts with the defaults for a new user", () => {
    render(<AssessmentForm equipment={EQUIPMENT} latest={null} />);
    expect(screen.getByRole("radio", { name: "Deixar a IA decidir" })).toBeChecked();
    expect(screen.getByLabelText("Dias de treino por semana")).toHaveValue("3");
    expect(screen.getByLabelText("Tempo por treino (minutos)")).toHaveValue(60);
  });

  it("is filled with the latest assessment", () => {
    render(<AssessmentForm equipment={EQUIPMENT} latest={LATEST} />);
    expect(screen.getByRole("radio", { name: "Força" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Avançado" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dividido (A/B/C…)" })).toBeChecked();
    expect(screen.getByLabelText("Dias de treino por semana")).toHaveValue("5");
    expect(screen.getByLabelText("Tempo por treino (minutos)")).toHaveValue(75);
    expect(screen.getByRole("checkbox", { name: "Halteres" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Banco" })).not.toBeChecked();
    expect(screen.getByLabelText("Lesões ou limitações (opcional)")).toHaveValue("Ombro direito");
  });

  it("sends the answers and confirms the save", async () => {
    const fetchMock = mockFetch(201, { success: true, data: { assessmentId: LATEST.id } });
    render(<AssessmentForm equipment={EQUIPMENT} latest={null} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Anamnese salva."));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/assessments");
    expect(JSON.parse(String(init?.body))).toEqual({
      goal: "hypertrophy",
      experienceLevel: "beginner",
      daysPerWeek: 3,
      sessionMinutes: 60,
      splitPreference: "ai_decides",
      equipmentSlugs: ["bench"],
      limitations: "",
    });
  });

  it("keeps the answers and explains when saving fails", async () => {
    mockFetch(500, { success: false, error: "Ocorreu um erro inesperado. Tente novamente." });
    render(<AssessmentForm equipment={EQUIPMENT} latest={null} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Lesões ou limitações (opcional)"), { target: { value: "Joelho" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar anamnese" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ocorreu um erro inesperado."));
    expect(screen.getByRole("checkbox", { name: "Banco" })).toBeChecked();
    expect(screen.getByLabelText("Lesões ou limitações (opcional)")).toHaveValue("Joelho");
  });
});
