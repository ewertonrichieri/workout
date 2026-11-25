import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentPhotoDetection } from "./equipment-photo-detection";

const compressPhoto = vi.hoisted(() => vi.fn(async () => new Blob(["x"], { type: "image/webp" })));
const canCompressPhotos = vi.hoisted(() => vi.fn(() => true));
vi.mock("./photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("./photo-compression")>()), compressPhoto, canCompressPhotos }));

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const VOCABULARY = [
  { slug: "cable", name: "Polia" },
  { slug: "dumbbell", name: "Halteres" },
  { slug: "bodyweight", name: "Peso corporal" },
];
const onApply = vi.hoisted(() => vi.fn());

function renderDetection() {
  return render(<EquipmentPhotoDetection vocabulary={VOCABULARY} onApply={onApply} />);
}

const photo = (name: string) => new File(["foto"], name, { type: "image/jpeg" });

function choosePhotos(files: File[]) {
  fireEvent.change(screen.getByTestId("equipment-photo-input"), { target: { files } });
}

beforeEach(() => canCompressPhotos.mockReturnValue(true));
afterEach(() => {
  vi.unstubAllGlobals();
  compressPhoto.mockClear();
  onApply.mockClear();
});

const TWO_FOUND = { success: true, data: { equipment: [
  { slug: "dumbbell", name: "Halteres", confidence: "high", photoNumbers: [1, 2] },
  { slug: "cable", name: "Polia", confidence: "low", photoNumbers: [2] },
] } };

describe("EquipmentPhotoDetection", () => {
  it("compresses the chosen photos, sends them and lists what the AI found", async () => {
    const fetchMock = mockFetch(200, TWO_FOUND);
    renderDetection();
    expect(screen.getByRole("button", { name: "Identificar por foto" })).toHaveAttribute("type", "button");
    choosePhotos([photo("a.jpg"), photo("b.jpg")]);
    expect(await screen.findByText("Encontramos estes equipamentos")).toBeInTheDocument();
    expect(compressPhoto).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/equipment-detections");
    expect((init?.body as FormData).getAll("photos")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: /Halteres/ })).toBeChecked();
    expect(screen.getByText("Certeza alta · Fotos 1 e 2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Polia/ })).not.toBeChecked();
    expect(screen.getByText("Talvez · Foto 2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Peso corporal/ })).toBeChecked();
    expect(screen.getByText("Sempre disponível")).toBeInTheDocument();
  });

  it("uses the reviewed list and closes the review", async () => {
    mockFetch(200, TWO_FOUND);
    renderDetection();
    choosePhotos([photo("a.jpg")]);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Polia/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Peso corporal/ }));
    fireEvent.click(screen.getByRole("button", { name: "Usar esta lista" }));
    expect(onApply).toHaveBeenCalledWith(["dumbbell", "cable"]);
    expect(screen.queryByText("Encontramos estes equipamentos")).not.toBeInTheDocument();
  });

  it("cannot use an empty list (D8)", async () => {
    mockFetch(200, TWO_FOUND);
    renderDetection();
    choosePhotos([photo("a.jpg")]);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Halteres/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Peso corporal/ }));
    expect(screen.getByRole("button", { name: "Usar esta lista" })).toBeDisabled();
    expect(screen.getByText("Marque pelo menos um equipamento.")).toBeInTheDocument();
  });

  it("keeps the review checkboxes out of the assessment answers (no name)", async () => {
    mockFetch(200, TWO_FOUND);
    renderDetection();
    choosePhotos([photo("a.jpg")]);
    expect(await screen.findByRole("checkbox", { name: /Halteres/ })).not.toHaveAttribute("name");
  });

  it("shows the analysis in progress while waiting", async () => {
    let answer: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { answer = resolve; })));
    renderDetection();
    choosePhotos([photo("a.jpg")]);
    expect(await screen.findByText("Analisando as fotos com a IA. Isso leva alguns segundos...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Identificar por foto" })).toBeDisabled();
    answer(new Response(JSON.stringify({ success: true, data: { equipment: [] } })));
    expect(await screen.findByText("Não encontramos equipamentos nessas fotos. Tente fotos mais de perto ou marque a lista à mão.")).toBeInTheDocument();
  });

  it("refuses more than 5 photos without sending anything", async () => {
    const fetchMock = mockFetch(200, {});
    renderDetection();
    choosePhotos(Array.from({ length: 6 }, (_, index) => photo(`${index}.jpg`)));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha de 1 a 5 fotos.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server message on failure and lets the user try again", async () => {
    mockFetch(429, { success: false, error: "Você chegou ao limite de 5 pedidos." });
    renderDetection();
    choosePhotos([photo("a.jpg")]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Você chegou ao limite de 5 pedidos.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Identificar por foto" })).toBeEnabled());
  });

  it("is hidden when the browser cannot prepare photos", () => {
    canCompressPhotos.mockReturnValue(false);
    renderDetection();
    expect(screen.queryByRole("button", { name: "Identificar por foto" })).not.toBeInTheDocument();
  });
});
