import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveActionButtons } from "./SaveActionButtons";

describe("SaveActionButtons (єдиний модуль дій збереження та закриття)", () => {
  it("renders all 3 actions with default labels and correct structure", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons onSaveAndClose={() => {}} onSave={() => {}} onClose={() => {}} />,
    );

    // Module container
    expect(html).toContain("wb-save-actions");

    // 1. Зберегти і закрити
    expect(html).toContain("Зберегти і закрити");
    expect(html).toContain("wb-save-actions-btn--primary");

    // 2. Зберегти (без закриття)
    expect(html).toContain("Зберегти");
    expect(html).toContain("wb-save-actions-btn--secondary");

    // 3. Закрити (без зберігання)
    expect(html).toContain("Закрити");
    expect(html).toContain("wb-save-actions-btn--close");
  });

  it("renders custom labels when provided", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        saveAndCloseLabel="Застосувати і вийти"
        saveLabel="Тільки зберегти"
        closeLabel="Скасувати"
      />,
    );

    expect(html).toContain("Застосувати і вийти");
    expect(html).toContain("Тільки зберегти");
    expect(html).toContain("Скасувати");
  });

  it("handles saving state for save-and-close action", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        saving={true}
        savingAction="saveAndClose"
      />,
    );

    expect(html).toContain("Збереження…");
    // Other buttons are disabled during saving
    expect(html).toContain("disabled");
  });

  it("handles saving state for save without closing", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        saving={true}
        savingAction="save"
      />,
    );

    expect(html).toContain("Збереження…");
    expect(html).toContain("disabled");
  });

  it("displays saved indicator when save without closing finishes", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        saved={true}
        savedMessage="Збережено!"
      />,
    );

    expect(html).toContain("Збережено!");
    expect(html).toContain("wb-save-actions-btn--saved");
  });

  it("renders global success banner when success=true", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        success={true}
        successMessage="✓ Успішно збережено"
      />,
    );

    expect(html).toContain("wb-save-actions--success");
    expect(html).toContain("✓ Успішно збережено");
    expect(html).not.toContain("Зберегти і закрити");
  });

  it("applies compact size class wb-btn-sm when size is sm", () => {
    const html = renderToStaticMarkup(
      <SaveActionButtons
        onSaveAndClose={() => {}}
        onSave={() => {}}
        onClose={() => {}}
        size="sm"
      />,
    );

    expect(html).toContain("wb-btn-sm");
  });
});
