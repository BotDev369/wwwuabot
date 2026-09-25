/**
 * Товар магазину — форма, одна для створення й правки.
 *
 * **Перевіряють ті самі правила, що й сервер** (`validateProductDraft`): форма
 * не дає набрати того, що сервер потім обріже мовчки, і повідомлення про
 * помилку теж одне (та сама межа, що в сторінок і оголошень).
 *
 * **Адреса показується, а не питається.** Людина змінює текст, адресу складають
 * із назви; поле адреси лишається, щоб побачити, що вийшло, і полагодити за
 * потреби. Хвіст адреси товару — `/<магазин>/p/<товар>`, і саме тому вона
 * показується **цілком**: сама по собі вона нічого не значить
 * (`docs/SHOPS.md` §2).
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useState, type ReactElement, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import {
  DEFAULT_PRODUCT_KIND,
  PRODUCT_CATEGORY_MAX,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_KINDS,
  PRODUCT_KIND_SPECS,
  PRODUCT_PRICE_MAX,
  PRODUCT_SUMMARY_MAX,
  PRODUCT_TITLE_MAX,
  productAddress,
  productDraft,
  productKindLabel,
  shopCatalogs,
  validateProductDraft,
  type ProductAttribute,
  type ProductDraft,
  type ProductKind,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { shopProductsPath } from "@/app/routes";
import { PageState } from "@/pages/user-pages/PageState";
import { useUserPage } from "@/pages/user-pages/useUserPage";
import { shopApi } from "@/shared/api/shop.api";
import { mediaInUse, productAddressLabel } from "./shop-view";
import { ShopAttributeField } from "./ShopAttributeField";
import { ShopPhotoField } from "./ShopPhotoField";
import { useShopProducts } from "./useShopProducts";

/** Те, що правлять у формі: без `id` — бо він є в адресі. */
interface FormState {
  kind: ProductKind;
  title: string;
  /** Розділ каталогу: назва, яку вже носять інші товари магазину. */
  category: string;
  address: string;
  price: string;
  summary: string;
  description: string;
  images: number[];
  attributes: ProductAttribute[];
  isActive: boolean;
}

const EMPTY: FormState = {
  kind: DEFAULT_PRODUCT_KIND,
  title: "",
  category: "",
  address: "",
  price: "",
  summary: "",
  description: "",
  images: [],
  attributes: [],
  isActive: true,
};

/** Товар → стан форми. Поля називаємо поіменно: `id` живе в адресі, не тут. */
function formFrom(product: ShopProduct): FormState {
  const draft = productDraft(product);
  return {
    kind: draft.kind,
    title: draft.title,
    category: draft.category,
    address: draft.address,
    price: draft.price,
    summary: draft.summary,
    description: draft.description,
    images: draft.images,
    attributes: draft.attributes,
    // Відсутній прапорець означає «у каталозі» — те саме правило, що в правил.
    isActive: draft.isActive !== false,
  };
}

/** Поле форми: підпис і контрол — та сама розкладка, що в решті продукту. */
function Field({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <label className="wb-field">
      <span className="wb-label">{label}</span>
      {children}
    </label>
  );
}

export function ShopProductForm(): ReactElement {
  const { id, productId } = useParams<{ id: string; productId?: string }>();
  const navigate = useNavigate();
  const { page, loading, error } = useUserPage(id);
  const shop = useShopProducts(page?.id ?? null);

  const productNumericId = Number(productId);
  const editing = Number.isInteger(productNumericId)
    ? (shop.products.find((item) => item.id === productNumericId) ?? null)
    : null;

  const [form, setForm] = useState<FormState | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Форма заповнюється **один раз** — із товару (правка) або порожня
  // (створення). Це не ефект: товар приходить не одразу (в адресі є номер, а
  // даних під ним ще немає), і почати заповнення з порожнього стану означало б
  // показати порожню форму, а потім перебити її чужим текстом на очах у людини.
  // Товару з адреси може не бути — його прибрали або номер узяли з чужого
  // посилання. Чекати без кінця в цьому разі не можна: список товарів уже
  // прийшов, тож «немає» — це відповідь, а не очікування.
  const ready = Boolean(page) && (productId ? Boolean(editing) : !shop.loading);
  if (!form && ready) setForm(productId ? formFrom(editing!) : EMPTY);

  if (!page || !form) {
    return (
      <div className="wb-page">
        <PageState loading={loading || shop.loading} message={error ?? "Такого товару немає."} />
      </div>
    );
  }

  const draft: ProductDraft = {
    ...form,
    ...(editing ? { id: editing.id } : {}),
  };
  const address = productAddress(form.address, form.title);
  // Порожній новий товар — це не помилка в адресі: доки назви немає, сегмента
  // й не може бути, тож замість докору кажемо, звідки адреса візьметься.
  const addressHint = address.ok
    ? `Виглядатиме так: ${productAddressLabel(page.slug, { slug: address.value })}`
    : form.title.trim()
      ? address.message
      : "Адресу складемо з назви";

  async function submit(): Promise<void> {
    const checked = validateProductDraft(draft);
    if (!checked.ok) {
      setFailure(checked.message);
      return;
    }

    setSaving(true);
    setFailure(null);
    try {
      const saved = await shop.save(draft);
      if (!saved) throw new Error("Товар не зберігся");
      await navigate(shopProductsPath(page!.id), { replace: true });
    } catch (e: unknown) {
      setFailure(e instanceof Error ? e.message : "Не вдалося зберегти товар");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFile(mediaId: number): Promise<void> {
    await shopApi.removeMedia(page!.id, mediaId);
    shop.dropMedia(mediaId);
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(shopProductsPath(page.id))}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          {editing ? "Товар" : "Новий товар"}
        </h1>
      </div>

      <Field label="Назва">
        <input
          className="wb-input"
          value={form.title}
          maxLength={PRODUCT_TITLE_MAX}
          placeholder="Кава в зернах"
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
      </Field>

      {/* Розділ — назва, а не вибір із закритого списку: каталогів у магазині
          стільки, скільки назв вигадав продавець. Підказку дають назви, які вже
          носять товари магазину, — щоб «Кава» не завелась удруге як «кава». */}
      <Field label="Розділ каталогу — необов'язково">
        <input
          className="wb-input"
          list="shop-categories"
          value={form.category}
          maxLength={PRODUCT_CATEGORY_MAX}
          placeholder="Кава"
          onChange={(event) => setForm({ ...form, category: event.target.value })}
        />
      </Field>
      <datalist id="shop-categories">
        {shopCatalogs(shop.products).map((catalog) => (
          <option key={catalog.title} value={catalog.title} />
        ))}
      </datalist>
      <p className="wb-text-muted shop-note">
        Розділи магазину — це назви його товарів: порожній розділ читається як «Інші товари».
      </p>

      {/* Адреса — похідна від назви, тож вона тут, а не окремим розділом:
          її бачать разом із тим, з чого вона складається. */}
      <Field label="Адреса — необов'язково">
        <input
          className="wb-input"
          value={form.address}
          placeholder={address.ok ? address.value : "складемо з назви"}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
        />
      </Field>
      <p className="wb-text-muted shop-note">{addressHint}</p>

      <div className="wb-field">
        <span className="wb-label">Що це</span>
        <div className="shop-kinds">
          {PRODUCT_KINDS.map((kind) => (
            <button
              type="button"
              key={kind}
              className={`shop-kind${form.kind === kind ? " shop-kind--active" : ""}`}
              onClick={() => setForm({ ...form, kind })}
            >
              {productKindLabel(kind)}
            </button>
          ))}
        </div>
        {/* Вид — це поведінка, тож форма мусить сказати, що він змінює. */}
        <span className="wb-text-muted shop-photo-label">{KIND_HINTS[form.kind]}</span>
      </div>

      <Field label="Ціна">
        <input
          className="wb-input"
          value={form.price}
          maxLength={PRODUCT_PRICE_MAX}
          placeholder="2 000 ₴ або договірна"
          onChange={(event) => setForm({ ...form, price: event.target.value })}
        />
      </Field>

      <Field label="Короткий опис">
        <input
          className="wb-input"
          value={form.summary}
          maxLength={PRODUCT_SUMMARY_MAX}
          placeholder="Що видно в каталозі до відкриття товару"
          onChange={(event) => setForm({ ...form, summary: event.target.value })}
        />
      </Field>

      <Field label="Опис">
        <textarea
          className="wb-textarea"
          value={form.description}
          maxLength={PRODUCT_DESCRIPTION_MAX}
          rows={6}
          placeholder="Склад, розміри, умови — те, що варто знати до замовлення"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </Field>

      <ShopPhotoField
        library={shop.media}
        images={form.images}
        onChange={(images) => setForm({ ...form, images })}
        onUpload={shop.upload}
        onDeleteFile={deleteFile}
        inUse={(mediaId) => mediaInUse(mediaId, shop.products)}
      />

      <ShopAttributeField
        attributes={form.attributes}
        onChange={(attributes) => setForm({ ...form, attributes })}
      />

      <div className="wb-field">
        <SwitchRow
          label="У каталозі"
          hint={form.isActive ? "Видно всім у магазині" : "Видно лише вам"}
          checked={form.isActive}
          onToggle={(isActive) => setForm({ ...form, isActive })}
        />
      </div>

      {failure && <p className="wb-text-red">{failure}</p>}

      <div className="shop-form-actions">
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          disabled={saving}
          onClick={() => void submit()}
        >
          <Icon name="save" size={16} />
          {saving ? "Зберігаємо…" : "Зберегти"}
        </button>
      </div>
    </div>
  );
}

/** Що вид товару змінює в замовленні — словами, а не кодом (`kinds.ts`). */
const KIND_HINTS: Record<ProductKind, string> = {
  physical: `${PRODUCT_KIND_SPECS.physical.label}: питає адресу доставки`,
  digital: `${PRODUCT_KIND_SPECS.digital.label}: має файл, доставки немає`,
  service: `${PRODUCT_KIND_SPECS.service.label}: виконується в часі`,
};
