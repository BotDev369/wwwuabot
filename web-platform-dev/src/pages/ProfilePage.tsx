import type { ReactElement } from "react";
import { UserAccountRow } from "@wwwuabot/shared";
import { MenuList } from "@wwwuabot/ui/menu";
import { HubList } from "@wwwuabot/ui/hub";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { CreateSheetHost } from "./create/CreateSheetHost";
import { SectionLayoutSwitch } from "./SectionLayoutSwitch";
import { usePersonalHub } from "./usePersonalHub";

/** I — акаунт, налаштування, власний контент і створення на одному екрані. */
export function ProfilePage(): ReactElement {
  const hub = usePersonalHub();
  // Теми тут не показуємо: вона лежить у розділі профілю нижче, тож друга
  // кнопка в хедері була б тим самим екраном двома способами.
  useScreenChrome({ title: "Профіль", theme: false });

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">I</h1>
        <SectionLayoutSwitch layout={hub.layout} onChange={hub.changeLayout} />
      </div>
      <UserAccountRow user={hub.profile} note={hub.note} onSelect={hub.openAccount} />
      <MenuList items={hub.sections} />
      <HubList items={hub.items} layout={hub.layout} />
      {hub.sheet !== null && <CreateSheetHost form={hub.sheet} onClose={hub.closeSheet} />}
    </div>
  );
}
