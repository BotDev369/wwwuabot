import { FieldRow } from "./FieldRow";
import { ProfileCard } from "./ProfileCard";
import { RoleBadge, StatusBadge } from "./badges";
import type { UserProfileData } from "./types";

/**
 * Дані, які ставить **система або адмін**: роль, тариф, статус, знижка,
 * права, блокування. Людина має бачити їх про себе — інакше «чому мені щось
 * недоступно» лишається здогадом.
 *
 * Адмінка показує тут ще й Telegram-дані, бо читає повний рядок `users`
 * (окремої колонки «Telegram» у неї немає).
 *
 * `title` — бо той самий набір полів читають **двічі з різних позицій**: у
 * картці адмінки це «дані системи» (звідки воно взялось), у людини на її
 * сторінці — її акаунт (що воно про неї). Один підпис на два погляди змусив би
 * або адміна, або людину читати чуже.
 *
 * `plain` — без картки й без заголовка: тоді поля стоять у картці того, хто
 * складає розділ. Так зроблено на сторінці акаунта, де ім'я на платформі й ці
 * поля — **одна** картка «Дані на платформі»: дві картки казали б, що це різні
 * речі, хоч обидві описують ту саму людину.
 */
export function DatabaseSection({
  user,
  showTelegramFields,
  title = "Дані системи",
  plain = false,
}: {
  user: UserProfileData;
  showTelegramFields: boolean;
  title?: string;
  plain?: boolean;
}) {
  const fields = (
    <div className="wb-profile-fields">
      {showTelegramFields && (
        <>
          <FieldRow label="ID" value={user.id} icon="info" />
          <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
          <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
          {/*
              Юзернейм, а не «хендл»: у Telegram людина заповнює саме юзернейм, і
              в продукті таке поле зветься так само (див. `telegram-fields.ts`).
            */}
          <FieldRow
            label="Юзернейм"
            value={user.username ? `@${user.username}` : null}
            icon="globe"
          />
          <FieldRow label="Мова" value={user.language} icon="globe" />
        </>
      )}
      <FieldRow
        label="Роль"
        value={user.role ? <RoleBadge value={user.role} /> : null}
        icon="users"
      />
      <FieldRow label="Тариф" value={user.tariff} icon="sparkles" />
      <FieldRow
        label="Статус"
        value={user.status ? <StatusBadge value={user.status} /> : null}
        icon="check"
      />
      <FieldRow label="Знижка" value={user.discount ? `${user.discount}%` : null} icon="percent" />
      <FieldRow
        label="Дозволи"
        value={user.permissions && user.permissions.length > 0 ? user.permissions.join(", ") : null}
        icon="lock"
      />
      <FieldRow label="Заблоковано" value={user.isBlocked ? "Так" : "Ні"} icon="lock" />
      {user.createdAt && <FieldRow label="Створено" value={user.createdAt} icon="info" />}
      {user.updatedAt && <FieldRow label="Оновлено" value={user.updatedAt} icon="info" />}
    </div>
  );

  if (plain) return fields;

  return (
    <ProfileCard title={title} icon="clipboard">
      {fields}
    </ProfileCard>
  );
}
