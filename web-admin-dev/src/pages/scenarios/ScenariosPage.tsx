/**
 * ScenariosPage — список сценаріїв (єдина таблиця `scenarios`).
 *
 * Доти тут був перемикач Portal/Admin: адмінка мала дві таблиці, і кожна
 * вкладка читала свою. `scenarios-admin` виявилась тестовою копією — контент із
 * неї не показувався **нікому** поза самою адмінкою, — тож вкладку разом із
 * таблицею видалено 13.09.2026, і сторінка лишилась одна.
 */

import { useEffect, useCallback, useState } from "react";
import { useScenariosStore } from "../../features/scenarios/store";
import { readScenario, saveScenarioFields } from "../../shared/api/scenarios.api";
import { isValidSlug, normalizeSlug } from "@wwwuabot/shared/content";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "../scenarios-v2/ScenariosV2Table";
import { ScenarioCardModal } from "./ScenarioCardModal";
import { useDialog } from "@wwwuabot/ui/dialog";

export function ScenariosPage() {
  const { items, status, errorMsg, load } = useScenariosStore();
  const [creating, setCreating] = useState(false);
  const [openedSlug, setOpenedSlug] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const dialog = useDialog();

  const handleCreate = useCallback(async () => {
    // Перевірка — у самому діалозі, а не після нього: адреса, яка не стане
    // діплінком, не має доходити до бази, бо зламане посилання помітно аж у
    // Telegram і виглядає як "бот не відповідає".
    const raw = await dialog.prompt("Адреса нової сторінки (slug):", {
      title: "Новий сценарій",
      placeholder: "mydate або galyashop/cart",
      validate: (value) => {
        const candidate = normalizeSlug(value.trim().toLowerCase());
        if (candidate === "") return "Порожня адреса — це головна сторінка, вона вже існує";
        return isValidSlug(candidate)
          ? null
          : "Сегменти — малі латинські літери, цифри й дефіс; «_» заборонений (розділювач діплінка)";
      },
    });
    if (!raw || !raw.trim()) return;
    const slug = normalizeSlug(raw.trim().toLowerCase());

    setCreating(true);
    try {
      // `write` — UPSERT, тому на наявну адресу він би **перезаписав** чужу
      // сторінку порожньою. Порожня сторінка замість готової — саме той збиток,
      // який не видно до відкриття.
      const existing = await readScenario(slug);
      if (existing) {
        await dialog.alert(`Адреса «${slug}» вже зайнята — відкрийте цей рядок у списку.`, {
          tone: "danger",
        });
        return;
      }

      await saveScenarioFields(slug, {
        title: slug,
        page_data: JSON.stringify({
          version: 1,
          zones: { sidebar: [], header: [], main: [], footer: [] },
          visibleZones: [],
        }),
      });
      // Open the scenario card with constructor immediately
      setOpenedSlug(slug);
    } catch (e) {
      await dialog.alert(`Помилка створення: ${(e as Error).message}`, { tone: "danger" });
    } finally {
      setCreating(false);
    }
  }, [dialog]);

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Сценарії</h1>
          {items.length > 0 && <span className="scn-count">{items.length}</span>}
        </div>
        <div className="wb-topbar-right">
          <button className="wb-btn wb-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Створення…" : "+ Новий"}
          </button>
        </div>
      </PageTopbar>

      <div className="scn-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сценаріїв…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {errorMsg}</p>
            <button className="wb-btn wb-btn-secondary" onClick={() => void load(true)}>
              Спробувати ще
            </button>
          </div>
        ) : (
          <ScenariosV2Table />
        )}
      </div>

      {/* Scenario card modal — opens after creation */}
      {openedSlug && (
        <ScenarioCardModal
          slug={openedSlug}
          initialSubTab="constructor"
          onClose={() => setOpenedSlug(null)}
          onSaved={() => void load(true)}
        />
      )}
    </>
  );
}
