import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExerciseDetail } from "@/lib/catalog/exercises/exercise-types";
import { ExerciseDetailView } from "./exercise-detail-view";
import { ExerciseResults } from "./exercise-results";
import { ExerciseSearchForm } from "./exercise-search-form";

const EXERCISE: ExerciseDetail = {
  id: "6f1c2a52-6d0e-4f1a-9a0a-1b2c3d4e5f60",
  slug: "fake-press",
  name: "Supino falso",
  nameEn: "Fake Press",
  difficulty: "beginner",
  instructions: null,
  primaryMuscles: [{ slug: "chest", name: "Peitoral" }],
  secondaryMuscles: [{ slug: "triceps", name: "Tríceps" }],
  equipment: [{ slug: "dumbbell", name: "Halteres" }],
  media: [{ mediaType: "video", url: "https://cdn.example.test/a.mp4", thumbnailUrl: null, source: "workout-free-videos", license: "CC0-1.0" }],
  coverMedia: { mediaType: "video", url: "https://cdn.example.test/a.mp4", thumbnailUrl: null, source: "workout-free-videos", license: "CC0-1.0" },
};

const PAGE = { items: [EXERCISE], page: 1, pageSize: 20, total: 21, totalPages: 2 };

describe("ExerciseResults", () => {
  it("lists exercises linking to their detail page", () => {
    render(<ExerciseResults page={PAGE} criteria={{ query: "supino" }} />);
    const card = screen.getByRole("link", { name: /Supino falso/ });
    expect(card).toHaveAttribute("href", "/exercises/fake-press");
    expect(within(card).getByText("Peitoral · Halteres")).toBeInTheDocument();
    expect(screen.getByText("21 exercícios encontrados")).toBeInTheDocument();
  });

  it("paginates keeping the filters", () => {
    render(<ExerciseResults page={PAGE} criteria={{ query: "supino" }} />);
    const pagination = screen.getByRole("navigation", { name: "Paginação dos exercícios" });
    expect(within(pagination).getByRole("link", { name: "Próxima" })).toHaveAttribute("href", "/exercises?q=supino&page=2");
    expect(within(pagination).queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
    expect(within(pagination).getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    render(<ExerciseResults page={{ ...PAGE, items: [], total: 0, totalPages: 0 }} criteria={{}} />);
    expect(screen.getByRole("heading", { name: "Nenhum exercício encontrado" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("ExerciseSearchForm", () => {
  it("is a labelled GET form prefilled with the current filters", () => {
    const filters = { muscles: [{ slug: "chest", name: "Peitoral" }], equipment: [{ slug: "dumbbell", name: "Halteres" }] };
    render(<ExerciseSearchForm criteria={{ query: "supino", muscle: "chest" }} filters={filters} />);
    expect(screen.getByRole("searchbox", { name: "Buscar exercício" })).toHaveValue("supino");
    expect(screen.getByRole("combobox", { name: "Músculo" })).toHaveValue("chest");
    expect(screen.getByRole("combobox", { name: "Equipamento" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });
});

describe("ExerciseDetailView", () => {
  it("shows media, muscles, equipment, credit and pending instructions", () => {
    render(<ExerciseDetailView exercise={EXERCISE} />);
    expect(screen.getByRole("heading", { level: 2, name: "Supino falso" })).toBeInTheDocument();
    expect(screen.getByLabelText("Demonstração de Supino falso")).toHaveAttribute("src", "https://cdn.example.test/a.mp4");
    expect(screen.getByText("Iniciante")).toBeInTheDocument();
    expect(screen.getByText("Tríceps")).toBeInTheDocument();
    expect(screen.getByText("Fonte: Workout Free Videos · Licença: CC0 (domínio público)")).toBeInTheDocument();
    expect(screen.getByText("As instruções em português ainda estão sendo preparadas.")).toBeInTheDocument();
  });

  it("explains when there is no media", () => {
    render(<ExerciseDetailView exercise={{ ...EXERCISE, media: [], coverMedia: null }} />);
    expect(screen.getByText("Mídia indisponível para este exercício.")).toBeInTheDocument();
  });
});
