import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommandBar, type CommandItem } from "../CommandBar";
import { LanguageProvider } from "../../../shell/LanguageProvider";

const mockCommands: CommandItem[] = [
  { id: "a", label: "Alpha", group: "Navigate", perform: vi.fn() },
  { id: "b", label: "Beta", group: "Theme", shortcut: "⌘T", perform: vi.fn() },
];

describe("CommandBar", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandBar open={false} onOpenChange={vi.fn()} commands={mockCommands} />,
      { wrapper: LanguageProvider },
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog with input focused when open", () => {
    render(<CommandBar open={true} onOpenChange={vi.fn()} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    const input = screen.getByPlaceholderText("Type a command or search…");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("displays command items", () => {
    render(<CommandBar open={true} onOpenChange={vi.fn()} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("displays shortcut text", () => {
    render(<CommandBar open={true} onOpenChange={vi.fn()} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    expect(screen.getByText("⌘T")).toBeInTheDocument();
  });

  it("calls perform and closes on item select", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CommandBar open={true} onOpenChange={onOpenChange} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    await user.click(screen.getByText("Alpha"));
    expect(mockCommands[0].perform).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows No results for non-matching search", async () => {
    const user = userEvent.setup();
    render(<CommandBar open={true} onOpenChange={vi.fn()} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    await user.type(screen.getByPlaceholderText("Type a command or search…"), "zzzzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CommandBar open={true} onOpenChange={onOpenChange} commands={mockCommands} />, {
      wrapper: LanguageProvider,
    });
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
