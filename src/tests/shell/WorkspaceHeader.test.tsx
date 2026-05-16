import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkspaceHeader } from "@/shell/WorkspaceHeader";

describe("WorkspaceHeader", () => {
  it("preserves the page title metadata in a screen-reader heading", () => {
    const { getByRole, container } = render(<WorkspaceHeader title="My Title" />);
    const heading = getByRole("heading", { level: 2, hidden: true });
    expect(heading).toHaveTextContent("My Title");
    expect(heading).toHaveAttribute("data-page-title", "My Title");
    expect(container.querySelector("header")).toBeNull();
  });

  it("renders only first 2 primaryActions and calls console.error when given 3", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const actions = [
      <button key="1">A1</button>,
      <button key="2">A2</button>,
      <button key="3">A3</button>,
    ];
    const { queryByText } = render(<WorkspaceHeader title="T" primaryActions={actions} />);
    expect(spy).toHaveBeenCalled();
    expect(queryByText("A1")).toBeInTheDocument();
    expect(queryByText("A2")).toBeInTheDocument();
    expect(queryByText("A3")).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders meta and actions in a single compact toolbar when there is no visible heading row", () => {
    const { getByText, getByRole, container } = render(
      <WorkspaceHeader
        title="Hidden Title"
        meta="78 / 78 · 已启用 78"
        search={<input aria-label="搜索技能" />}
        primaryActions={[<button key="refresh">刷新</button>]}
      />,
    );

    expect(getByText("78 / 78 · 已启用 78")).toBeInTheDocument();
    expect(getByRole("button", { name: "刷新" })).toBeInTheDocument();
    expect(getByRole("textbox", { name: "搜索技能" })).toBeInTheDocument();
    expect(container.querySelectorAll("header")).toHaveLength(0);
  });
});
