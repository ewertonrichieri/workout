import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TECHNIQUE_EXERCISES } from "@/lib/constants/technique";
import { TechniqueScreen } from "./technique-screen";

const loadPoseDetector = vi.hoisted(() => vi.fn());
vi.mock("./pose-detector", () => ({ loadPoseDetector }));

const SQUAT = TECHNIQUE_EXERCISES["barbell-back-squat"];

function mockGetUserMedia(implementation: () => Promise<unknown>): ReturnType<typeof vi.fn> {
  const getUserMedia = vi.fn(implementation);
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
  return getUserMedia;
}

async function openCamera(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Entendi, continuar" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir a câmera" }));
  });
}

describe("TechniqueScreen", () => {
  beforeEach(() => loadPoseDetector.mockResolvedValue({ detect: () => [], close: vi.fn() }));
  afterEach(() => {
    vi.unstubAllGlobals();
    loadPoseDetector.mockReset();
  });

  it("shows the privacy notice and the positioning guide before turning the camera on", async () => {
    const getUserMedia = mockGetUserMedia(() => new Promise(() => undefined));
    render(<TechniqueScreen ruleSet={SQUAT} />);
    expect(screen.getByText("O vídeo fica só no seu celular: não é enviado nem guardado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entendi, continuar" }));
    expect(screen.getByRole("heading", { name: "Posicione o celular" })).toBeInTheDocument();
    expect(screen.getByText(/2 a 3 metros/)).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("asks for the camera only after the tap and keeps Começar disabled until the body is framed", async () => {
    const getUserMedia = mockGetUserMedia(() => new Promise(() => undefined));
    render(<TechniqueScreen ruleSet={SQUAT} />);
    await openCamera();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "user" }, audio: false });
    expect(screen.getByRole("button", { name: "Começar" })).toBeDisabled();
    expect(screen.getByText(/Começar fica disponível quando o corpo inteiro aparecer/)).toBeInTheDocument();
  });

  it("explains a denied permission and goes back to the guide on retry", async () => {
    mockGetUserMedia(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    render(<TechniqueScreen ruleSet={SQUAT} />);
    await openCamera();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão para usar a câmera");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(screen.getByRole("heading", { name: "Posicione o celular" })).toBeInTheDocument();
  });

  it("shows a friendly message when the pose model cannot load", async () => {
    mockGetUserMedia(() => new Promise(() => undefined));
    loadPoseDetector.mockRejectedValue(new Error("network"));
    render(<TechniqueScreen ruleSet={SQUAT} />);
    await openCamera();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não conseguimos preparar a análise neste aparelho agora");
  });
});
