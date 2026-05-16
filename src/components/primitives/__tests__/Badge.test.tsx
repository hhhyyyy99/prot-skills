import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("neutral variant has border-border-default and text-text-secondary", () => {
    render(<Badge variant="neutral">Tag</Badge>);
    const el = screen.getByText("Tag");
    expect(el.className).toContain("border-border-default");
    expect(el.className).toContain("text-text-secondary");
  });

  it("accent variant has border-accent and text-accent", () => {
    render(<Badge variant="accent">New</Badge>);
    const el = screen.getByText("New");
    expect(el.className).toContain("border-accent");
    expect(el.className).toContain("text-accent");
  });

  it("success variant has border-success and text-success", () => {
    render(<Badge variant="success">OK</Badge>);
    const el = screen.getByText("OK");
    expect(el.className).toContain("border-success");
    expect(el.className).toContain("text-success");
  });

  it("warning variant has border-warning and text-warning", () => {
    render(<Badge variant="warning">Warn</Badge>);
    const el = screen.getByText("Warn");
    expect(el.className).toContain("border-warning");
    expect(el.className).toContain("text-warning");
  });

  it("danger variant has border-danger and text-danger", () => {
    render(<Badge variant="danger">Err</Badge>);
    const el = screen.getByText("Err");
    expect(el.className).toContain("border-danger");
    expect(el.className).toContain("text-danger");
  });
});
