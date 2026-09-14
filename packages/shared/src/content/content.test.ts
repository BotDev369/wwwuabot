import { describe, expect, it } from "vitest";
import { contentPageFromScenario } from "./adapters";
import { HOME_SLUG, pickContentPage } from "./resolve";

const pageConfig = (title: string) => ({
  version: 1,
  zones: {
    sidebar: [],
    header: [],
    main: [{ id: "b1", type: "text", order: 0, props: { title } }],
    footer: [],
  },
});

describe("contentPageFromScenario", () => {
  it("normalizes a scenario using its single slug", () => {
    const page = contentPageFromScenario({
      slug: "/pro-nas/",
      title: "Про нас",
      photo_url: "https://example.com/a.jpg",
      page_data: JSON.stringify(pageConfig("Про нас")),
      is_active: 1,
    });

    expect(page.id).toBe("/pro-nas/");
    expect(page.slug).toBe("pro-nas");
    expect(page.title).toBe("Про нас");
    expect(page.photoUrl).toBe("https://example.com/a.jpg");
    expect(page.published).toBe(true);
    expect(page.content?.zones.main).toHaveLength(1);
  });

  it("maps the empty slug to the home page", () => {
    expect(contentPageFromScenario({ slug: "", is_active: 1 }).slug).toBe(HOME_SLUG);
  });

  it("converts the legacy slots page format", () => {
    const page = contentPageFromScenario({
      slug: "legacy",
      page_data: JSON.stringify({
        v: 1,
        slots: { main: [{ component: "Heading", props: { text: "Старий" } }] },
      }),
    });

    expect(page.content?.zones.main[0]?.type).toBe("text");
    expect(page.content?.zones.main[0]?.props.title).toBe("Старий");
  });

  it("keeps empty and invalid page_data as null", () => {
    expect(contentPageFromScenario({ slug: "new" }).content).toBeNull();
    expect(contentPageFromScenario({ slug: "broken", page_data: "{not json" }).content).toBeNull();
  });

  it("treats only an active flag of one as published", () => {
    expect(contentPageFromScenario({ slug: "a", is_active: "1" }).published).toBe(true);
    expect(contentPageFromScenario({ slug: "b", is_active: "0" }).published).toBe(false);
    expect(contentPageFromScenario({ slug: "c", is_active: null }).published).toBe(false);
  });
});

describe("pickContentPage", () => {
  const home = contentPageFromScenario({ slug: "", is_active: 1 });
  const about = contentPageFromScenario({ slug: "about", is_active: 1 });

  it("finds a page and treats the remaining path as parameters", () => {
    expect(pickContentPage([home, about], "about/more")?.slug).toBe("about");
  });

  it("falls back to the home page only when the caller asks for it", () => {
    expect(pickContentPage([about, home], "unknown")?.slug).toBe(HOME_SLUG);
    expect(pickContentPage([about], "unknown")).toBeNull();
  });
});
