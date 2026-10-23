/**
 * Шляхи трекерів: **кожна адреса веде саме туди, а чужа лишається чужою**.
 *
 * Домен один (стрічка, записи дня, групи, дві поверхні на читання), а роутер —
 * це список адрес. Помилка тут тихо віддає шлях сусідньому модулю або мовчки не
 * віддає нічого, тож перевіряється і кожна власна адреса (зокрема
 * `group/trackers`, молодша за решту), і те, що не-трекерний шлях лишається
 * **не нашим** (`null`), щоб роутер пішов далі.
 *
 * @module api-dev/src/routes/trackers.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = {
  handleTrackers: vi.fn(),
  handleTrackerEntry: vi.fn(),
  handleTrackerTemplates: vi.fn(),
  handleTrackerPublic: vi.fn(),
  handleTrackerGroups: vi.fn(),
  handleTrackerGroupClear: vi.fn(),
};

vi.mock("../controllers/trackers.controller", () => ({
  handleTrackers: handlers.handleTrackers,
  handleTrackerEntry: handlers.handleTrackerEntry,
  handleTrackerTemplates: handlers.handleTrackerTemplates,
  handleTrackerPublic: handlers.handleTrackerPublic,
}));
vi.mock("../controllers/trackers-groups.controller", () => ({
  handleTrackerGroups: handlers.handleTrackerGroups,
  handleTrackerGroupClear: handlers.handleTrackerGroupClear,
}));

const { matchTrackersRoute } = await import("./trackers");

const ENV = {} as Env;
const request = (path: string, method = "GET"): Request =>
  new Request(`https://api.test${path}`, { method });

/** Контролери відповідають міткою — важлива лише адреса, за якою їх покликали. */
function answersWithMarker(marker: string): void {
  for (const handler of Object.values(handlers)) handler.mockReturnValue(new Response(marker));
}

describe("власні шляхи", () => {
  it("стрічка й запис дня — дві різні ручки", async () => {
    answersWithMarker("own");
    const req = request("/api/user/trackers");
    const entry = request("/api/user/trackers/entry", "POST");

    expect(await (matchTrackersRoute(req, ENV, "/api/user/trackers") as Response).text()).toBe(
      "own",
    );
    expect(handlers.handleTrackers).toHaveBeenCalledWith(req, ENV);

    await matchTrackersRoute(entry, ENV, "/api/user/trackers/entry");
    expect(handlers.handleTrackerEntry).toHaveBeenCalledWith(entry, ENV);
  });

  it("група й спорожнення групи — різні ручки, бо дії різні", async () => {
    answersWithMarker("groups");

    await matchTrackersRoute(
      request("/api/user/trackers/group", "PATCH"),
      ENV,
      "/api/user/trackers/group",
    );
    expect(handlers.handleTrackerGroups).toHaveBeenCalled();

    const clear = request("/api/user/trackers/group/trackers", "DELETE");
    await matchTrackersRoute(clear, ENV, "/api/user/trackers/group/trackers");
    expect(handlers.handleTrackerGroupClear).toHaveBeenCalledWith(clear, ENV);
  });
});

describe("поверхні на читання", () => {
  it("каталог і публічні ведуть у свої контролери", async () => {
    answersWithMarker("library");

    await matchTrackersRoute(
      request("/api/user/trackers/templates"),
      ENV,
      "/api/user/trackers/templates",
    );
    await matchTrackersRoute(
      request("/api/user/trackers/public"),
      ENV,
      "/api/user/trackers/public",
    );

    expect(handlers.handleTrackerTemplates).toHaveBeenCalled();
    expect(handlers.handleTrackerPublic).toHaveBeenCalled();
  });
});

describe("чужий шлях", () => {
  it("не-трекерна адреса лишається сусідньому модулю", () => {
    answersWithMarker("marker");

    expect(matchTrackersRoute(request("/api/notes"), ENV, "/api/notes")).toBeNull();
    // Префікс — це не збіг: `/group/trackers` має власну адресу, а хвіст
    // `.../trackers/extra` не веде в жодну з них.
    expect(
      matchTrackersRoute(request("/api/user/trackers/extra"), ENV, "/api/user/trackers/extra"),
    ).toBeNull();
  });
});
