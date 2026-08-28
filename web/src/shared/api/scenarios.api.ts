import { apiFetch } from "./client";

export interface ScenarioConfig {
  v: number;
  meta: { title: string };
  scenarioName?: string;
  slots: {
    main: Array<{
      component: string;
      props: Record<string, unknown>;
    }>;
  };
}

export interface ScenarioResponse {
  ok: boolean;
  config?: ScenarioConfig;
}

/**
 * Fetch scenario config by slug (path).
 */
export async function fetchScenario(slug: string): Promise<ScenarioConfig | null> {
  try {
    const data = await apiFetch<ScenarioResponse>(`/api/scenario/${slug}`);
    if (data?.ok && data?.config?.v === 1) {
      return data.config;
    }
    return null;
  } catch {
    return null;
  }
}
