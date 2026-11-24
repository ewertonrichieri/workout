import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathname = vi.fn(() => "/workout");
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

const { BottomNavigation, BottomNavigationBar } = await import("@/components/navigation/bottom-navigation");

describe("BottomNavigation", () => {
  it("renders the four sections with their routes", () => {
    render(<BottomNavigation />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Início", "/"],
      ["Treino", "/workout"],
      ["Agenda", "/schedule"],
      ["Perfil", "/profile"],
    ]);
  });

  it("marks only the current section as active", () => {
    render(<BottomNavigation />);
    expect(screen.getByRole("link", { name: "Treino" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the section active on nested routes", () => {
    usePathname.mockReturnValue("/profile/settings");
    render(<BottomNavigation />);
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("aria-current", "page");
  });

  it("has an accessible navigation landmark", () => {
    render(<BottomNavigation />);
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });

  it("renders usable links without an active item while the route is unknown", () => {
    render(<BottomNavigationBar pathname={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    screen.getAllByRole("link").forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
  });
});
