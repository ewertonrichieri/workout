import { describe, expect, it } from "vitest";
import { decideRouteAccess, sanitizeRedirectPath } from "@/lib/auth/route-access";

describe("decideRouteAccess", () => {
  it("allows authenticated users on protected pages", () => {
    expect(decideRouteAccess({ pathname: "/", isAuthenticated: true })).toEqual({ type: "allow" });
  });

  it("redirects anonymous users from pages to login keeping the destination", () => {
    expect(decideRouteAccess({ pathname: "/treino", isAuthenticated: false })).toEqual({
      type: "redirect",
      location: "/login?next=%2Ftreino",
    });
  });

  it("redirects anonymous users from the home page to login without next", () => {
    expect(decideRouteAccess({ pathname: "/", isAuthenticated: false })).toEqual({
      type: "redirect",
      location: "/login",
    });
  });

  it("returns unauthorized for anonymous API calls", () => {
    expect(decideRouteAccess({ pathname: "/api/plans", isAuthenticated: false })).toEqual({
      type: "unauthorized",
    });
  });

  it("lets anyone reach the login page and the auth callback", () => {
    expect(decideRouteAccess({ pathname: "/login", isAuthenticated: false })).toEqual({ type: "allow" });
    expect(decideRouteAccess({ pathname: "/auth/callback", isAuthenticated: false })).toEqual({
      type: "allow",
    });
  });

  it("sends authenticated users away from the login page", () => {
    expect(decideRouteAccess({ pathname: "/login", isAuthenticated: true })).toEqual({
      type: "redirect",
      location: "/",
    });
  });
});

describe("sanitizeRedirectPath", () => {
  it.each([
    ["/treino", "/treino"],
    ["/treino?aba=b", "/treino?aba=b"],
    [null, "/"],
    ["", "/"],
    ["https://evil.com", "/"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["treino", "/"],
  ])("turns %s into %s", (input, expected) => {
    expect(sanitizeRedirectPath(input)).toBe(expected);
  });
});

describe("decideRouteAccess: installable app files", () => {
  it.each(["/manifest.webmanifest", "/icon/192", "/icon/maskable", "/apple-icon"])("lets anyone fetch %s", (pathname) => {
    expect(decideRouteAccess({ pathname, isAuthenticated: false })).toEqual({ type: "allow" });
  });

  it("does not open other paths that only start like them", () => {
    expect(decideRouteAccess({ pathname: "/iconography", isAuthenticated: false }).type).toBe("redirect");
  });
});

