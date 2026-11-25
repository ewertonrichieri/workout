import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEquipmentSelection } from "./use-equipment-selection";

describe("useEquipmentSelection", () => {
  it("toggles single items", () => {
    const { result } = renderHook(() => useEquipmentSelection(["bench"]));
    act(() => result.current.toggle("dumbbell", true));
    act(() => result.current.toggle("bench", false));
    expect(result.current.selected).toEqual(["dumbbell"]);
  });

  it("replaces the whole list with a notice and undoes back to the previous list", () => {
    const { result } = renderHook(() => useEquipmentSelection(["bench"]));
    act(() => result.current.replace(["barbell", "bodyweight"], "Perfil aplicado."));
    expect(result.current.selected).toEqual(["barbell", "bodyweight"]);
    expect(result.current.notice).toEqual({ message: "Perfil aplicado.", canUndo: true });
    act(() => result.current.undo());
    expect(result.current.selected).toEqual(["bench"]);
    expect(result.current.notice).toEqual({ message: "Lista de equipamentos restaurada.", canUndo: false });
  });

  it("clears the notice when the user edits the list by hand", () => {
    const { result } = renderHook(() => useEquipmentSelection([]));
    act(() => result.current.replace(["bench"], "Perfil aplicado."));
    act(() => result.current.toggle("dumbbell", true));
    expect(result.current.notice).toBeNull();
  });
});
