import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SoundToggle } from "./sound-toggle";

describe("SoundToggle", () => {
  it("is a pressed toggle with a clear label", () => {
    const onToggle = vi.fn();
    render(<SoundToggle isSupported isEnabled onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "Alertas falados: ligados" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalled();
  });

  it("shows the off state", () => {
    render(<SoundToggle isSupported isEnabled={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Alertas falados: desligados" })).toHaveAttribute("aria-pressed", "false");
  });

  it("explains that cues appear only on screen when the browser cannot speak", () => {
    render(<SoundToggle isSupported={false} isEnabled onToggle={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/aparecem só na tela/)).toBeInTheDocument();
  });
});
