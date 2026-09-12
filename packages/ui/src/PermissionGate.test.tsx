import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PermissionGate } from "./PermissionGate";
import type { UserProfile } from "@wwwuabot/shared/types/page-config";

describe("PermissionGate", () => {
  const adminUser: UserProfile = {
    id: 1,
    role: "admin",
    permissions: ["can_moderate", "can_edit", "can_delete"],
  };

  const regularUser: UserProfile = {
    id: 2,
    role: "user",
    permissions: ["can_view"],
  };

  it("renders children when no restrictions are set", () => {
    const html = renderToStaticMarkup(
      <PermissionGate>
        <div>Open Content</div>
      </PermissionGate>,
    );
    expect(html).toContain("Open Content");
  });

  it("blocks non-admin users when adminOnly is true", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={regularUser} adminOnly={true}>
        <div>Admin Secret</div>
      </PermissionGate>,
    );
    expect(html).not.toContain("Admin Secret");
    expect(html).toBe("");
  });

  it("renders fallback when access is denied and fallback is provided", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={regularUser} adminOnly={true} fallback={<div>Access Denied</div>}>
        <div>Admin Secret</div>
      </PermissionGate>,
    );
    expect(html).not.toContain("Admin Secret");
    expect(html).toContain("Access Denied");
  });

  it("allows admin users when adminOnly is true", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={adminUser} adminOnly={true}>
        <div>Admin Secret</div>
      </PermissionGate>,
    );
    expect(html).toContain("Admin Secret");
  });

  it("handles superadmin correctly for adminOnly", () => {
    const superAdmin: UserProfile = { id: 3, role: "superadmin" };
    const html = renderToStaticMarkup(
      <PermissionGate user={superAdmin} adminOnly={true}>
        <div>Admin Secret</div>
      </PermissionGate>,
    );
    expect(html).toContain("Admin Secret");
  });

  it("blocks non-owner when ownerOnly is true and isOwner is false", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={regularUser} ownerOnly={true} isOwner={false}>
        <div>Owner Panel</div>
      </PermissionGate>,
    );
    expect(html).not.toContain("Owner Panel");
  });

  it("allows owner when ownerOnly is true and isOwner is true", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={regularUser} ownerOnly={true} isOwner={true}>
        <div>Owner Panel</div>
      </PermissionGate>,
    );
    expect(html).toContain("Owner Panel");
  });

  it("verifies requiredRole correctly", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={regularUser} requiredRole={["moderator", "admin"]}>
        <div>Mod Tools</div>
      </PermissionGate>,
    );
    expect(html).not.toContain("Mod Tools");

    const modUser: UserProfile = { id: 4, role: "moderator" };
    const modHtml = renderToStaticMarkup(
      <PermissionGate user={modUser} requiredRole={["moderator", "admin"]}>
        <div>Mod Tools</div>
      </PermissionGate>,
    );
    expect(modHtml).toContain("Mod Tools");
  });

  it("verifies requiredCapability correctly", () => {
    const html = renderToStaticMarkup(
      <PermissionGate user={adminUser} requiredCapability="can_moderate">
        <div>Moderation View</div>
      </PermissionGate>,
    );
    expect(html).toContain("Moderation View");

    const blockedHtml = renderToStaticMarkup(
      <PermissionGate user={regularUser} requiredCapability="can_moderate">
        <div>Moderation View</div>
      </PermissionGate>,
    );
    expect(blockedHtml).not.toContain("Moderation View");
  });
});
