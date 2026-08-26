export type ButtonKind = "callback" | "url" | "none";

export interface KeyboardButtonModel {
  id: string;
  text: string;
  kind: ButtonKind;
  value: string;
  /** Додаткові ключі кнопки, яких редактор не розуміє — зберігаються недоторкано. */
  extra?: Record<string, unknown>;
}

export interface KeyboardRowModel {
  id: string;
  buttons: KeyboardButtonModel[];
}
