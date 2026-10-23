import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./client", () => api);

const { fetchEventSummary, fetchEvents } = await import("./events.api");

const RANGE = { from: "2026-10-01T00:00:00.000Z", to: "2026-10-02T00:00:00.000Z" };

describe("API журналу", () => {
  it("зведення їде в адмінський шлях із кодованим діапазоном", async () => {
    api.apiFetch.mockResolvedValue({ total: 0 });

    await fetchEventSummary(RANGE);

    const url = api.apiFetch.mock.calls[0]?.[0] as string;
    expect(url.startsWith("/api/admin/events/summary?")).toBe(true);
    expect(url).toContain(encodeURIComponent(RANGE.from));
    expect(url).toContain(encodeURIComponent(RANGE.to));
  });

  it("список додає людину, ліміт і зсув", async () => {
    api.apiFetch.mockResolvedValue({ total: 0 });

    await fetchEvents({ ...RANGE, userId: 7, limit: 50, offset: 100 });

    const url = api.apiFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("/api/admin/events?");
    expect(url).toContain("userId=7");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=100");
  });

  it("без людини параметра userId немає", async () => {
    api.apiFetch.mockResolvedValue({ total: 0 });

    await fetchEvents(RANGE);

    const url = api.apiFetch.mock.calls[0]?.[0] as string;
    expect(url).not.toContain("userId");
    expect(url).toContain("limit=100");
  });
});
