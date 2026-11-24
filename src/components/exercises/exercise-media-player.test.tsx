import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExerciseMediaItem } from "@/lib/catalog/exercises/exercise-types";
import { ExerciseMediaPlayer } from "./exercise-media-player";

const VIDEO: ExerciseMediaItem = { mediaType: "video", url: "https://cdn.example.test/a.mp4", thumbnailUrl: null, source: "workout-free-videos", license: "CC0-1.0" };
const GIF: ExerciseMediaItem = { mediaType: "gif", url: "https://cdn.example.test/a.gif", thumbnailUrl: null, source: "exercise-library", license: "unverified" };
const YOUTUBE: ExerciseMediaItem = { mediaType: "youtube", url: "https://youtu.be/abcDEF12_-3", thumbnailUrl: null, source: "youtube", license: "youtube-embed" };
const LABEL = "Demonstração de Supino falso";

describe("ExerciseMediaPlayer", () => {
  it("shows the best media with its credit", () => {
    render(<ExerciseMediaPlayer media={[VIDEO, GIF]} exerciseName="Supino falso" />);
    expect(screen.getByLabelText(LABEL)).toHaveAttribute("src", VIDEO.url);
    expect(screen.getByText("Fonte: Workout Free Videos · Licença: CC0 (domínio público)")).toBeInTheDocument();
  });

  it("falls back to the next media when the current one fails to load", () => {
    render(<ExerciseMediaPlayer media={[VIDEO, GIF]} exerciseName="Supino falso" />);
    fireEvent.error(screen.getByLabelText(LABEL));
    expect(screen.getByRole("img", { name: LABEL })).toHaveAttribute("src", GIF.url);
    expect(screen.getByText("Fonte: Exercise Library · Licença: a confirmar")).toBeInTheDocument();
  });

  it("embeds YouTube with an accessible title", () => {
    render(<ExerciseMediaPlayer media={[YOUTUBE]} exerciseName="Supino falso" />);
    expect(screen.getByTitle(LABEL)).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abcDEF12_-3");
  });

  it("explains when every media failed or there is none", () => {
    render(<ExerciseMediaPlayer media={[GIF]} exerciseName="Supino falso" />);
    fireEvent.error(screen.getByRole("img", { name: LABEL }));
    expect(screen.getByText("Mídia indisponível para este exercício.")).toBeInTheDocument();
  });
});
