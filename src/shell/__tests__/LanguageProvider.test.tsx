import { render, act } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { LanguageProvider, useI18n } from "../LanguageProvider";

function Consumer() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="label">{t("nav.settings")}</span>
      <button onClick={() => setLanguage("zh-CN")}>set-zh</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("lang");
  });

  it("defaults to English and updates document language", () => {
    const { getByTestId } = render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    expect(getByTestId("language")).toHaveTextContent("en");
    expect(getByTestId("label")).toHaveTextContent("Settings");
    expect(document.documentElement.lang).toBe("en");
  });

  it("persists Simplified Chinese preference", () => {
    const { getByText, getByTestId } = render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>,
    );

    act(() => {
      getByText("set-zh").click();
    });

    expect(getByTestId("language")).toHaveTextContent("zh-CN");
    expect(getByTestId("label")).toHaveTextContent("设置");
    expect(localStorage.getItem("ui.language")).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
