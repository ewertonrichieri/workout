import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthNotice } from "./health-notice";

describe("HealthNotice", () => {
  it("says the plan does not replace a professional", () => {
    render(<HealthNotice hasLimitations={false} />);
    expect(screen.getByRole("note")).toHaveTextContent("não substitui a orientação de um profissional");
    expect(screen.queryByText(/Você informou uma lesão/)).not.toBeInTheDocument();
  });

  it("reinforces the advice when the user reported a limitation", () => {
    render(<HealthNotice hasLimitations />);
    expect(screen.getByText(/Você informou uma lesão ou limitação/)).toBeInTheDocument();
  });
});
