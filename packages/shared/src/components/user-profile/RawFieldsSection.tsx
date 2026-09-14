import { FieldRow } from "./FieldRow";
import { JsonBlock } from "./JsonBlock";
import { ico } from "./badges";
import { RAW_FIELD_LABELS } from "./raw-field-labels";

/** Усе, що є в рядку `users`, але не має власного поля в моделі картки. */
export function RawFieldsSection({ fields }: { fields: Record<string, unknown> }) {
  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("settings")} Додаткові дані</h3>
      <div className="wb-profile-fields">
        {Object.entries(fields).map(([key, val]) => {
          if (val === null || val === undefined || val === "") return null;
          const label = RAW_FIELD_LABELS[key] || key;
          if (
            typeof val === "object" ||
            (typeof val === "string" && (val.startsWith("{") || val.startsWith("[")))
          ) {
            return <JsonBlock key={key} label={label} value={val} />;
          }
          return <FieldRow key={key} label={label} value={String(val)} icon="info" />;
        })}
      </div>
    </div>
  );
}
