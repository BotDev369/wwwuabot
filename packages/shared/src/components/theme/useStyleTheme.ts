/**
 * `useStyleTheme` — характер (бренд) і схема, які живуть на `<html>`.
 *
 * Тут лишається рівно те, що не є трьома кольорами користувача: **характер**
 * (Apple / Android — типографіка, радіуси, щільність) і **схема** брендових
 * правил (`data-theme`). Колірну палітру задає людина трьома кольорами
 * (`useUserColors`), і тоді саме вони малюють екран — але характер від цього
 * не змінюється.
 *
 * Файл переїхав із `components/StyleToggle.tsx` у цю теку, щоб панель
 * (`ThemeColorPanel`) могла читати бренд, не замикаючи імпорт на компонент,
 * який її ж рендерить.
 *
 * @module packages/shared/src/components/theme/useStyleTheme
 */

import { useCallback, useEffect, useState } from "react";
import { BRANDS, type Brand, type Scheme } from "../../styles/registry";

const BRAND_KEY = "wwwuabot-brand";
const LEGACY_STYLE_KEY = "wwwuabot-style";
const THEME_KEY = "wwwuabot-theme";

function getStoredBrand(): Brand {
  try {
    const stored = localStorage.getItem(BRAND_KEY) as Brand | null;
    if (stored && (stored === "apple" || stored === "android")) return stored;
    const legacy = localStorage.getItem(LEGACY_STYLE_KEY);
    if (legacy) {
      const brand: Brand = legacy === "android" ? "android" : "apple";
      localStorage.setItem(BRAND_KEY, brand);
      localStorage.removeItem(LEGACY_STYLE_KEY);
      return brand;
    }
    return "apple";
  } catch {
    return "apple";
  }
}

function getStoredScheme(): Scheme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return "dark";
  } catch {
    return "dark";
  }
}

function applyBrand(brand: Brand) {
  document.documentElement.setAttribute("data-brand", brand);
}

function applyScheme(scheme: Scheme) {
  document.documentElement.setAttribute("data-theme", scheme);
}

/** Бренд плюс схема. «Системної» схеми немає — світлоту задає вибір кольорів. */
export function useStyleTheme() {
  const [brand, setBrandState] = useState<Brand>(getStoredBrand);
  const [scheme, setSchemeState] = useState<Scheme>(getStoredScheme);

  const setBrand = useCallback((next: Brand) => {
    setBrandState(next);
    try {
      localStorage.setItem(BRAND_KEY, next);
    } catch {
      /* ignore */
    }
    applyBrand(next);
  }, []);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    applyScheme(next);
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === "dark" ? "light" : "dark");
  }, [scheme, setScheme]);

  useEffect(() => {
    applyBrand(brand);
    applyScheme(scheme);
  }, [brand, scheme]);

  return { brand, scheme, setBrand, setScheme, toggleScheme, brands: BRANDS };
}
