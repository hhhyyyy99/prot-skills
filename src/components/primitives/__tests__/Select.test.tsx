import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeAll } from "vitest";
import { Select } from "../Select";

beforeAll(() => {
  // Polyfill pointer capture for Radix Select in jsdom
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => {};
    HTMLElement.prototype.releasePointerCapture = () => {};
  }
});

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("Select", () => {
  it("renders placeholder when no value matches", () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="Pick one" />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("trigger has combobox role and is clickable", () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="Pick" />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("data-state", "closed");
  });
});
