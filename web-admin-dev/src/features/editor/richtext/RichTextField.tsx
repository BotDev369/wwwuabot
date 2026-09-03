import { useRef, useState } from "react";
import { markupToRuns, richToRuns, runsToMarkup, runsToRich } from "./richtext.model";
import { RichPreview } from "./RichPreview";

interface Props {
  value: unknown;
  onChange: (next: unknown) => void;
  multiline?: boolean;
  placeholder?: string;
  showPreview?: boolean;
}

const TOKENS = [
  { key: "bold", label: "B", open: "**", close: "**", title: "Жирний" },
  { key: "italic", label: "I", open: "*", close: "*", title: "Курсив" },
  { key: "underline", label: "U", open: "__", close: "__", title: "Підкреслений" },
  { key: "strike", label: "S", open: "~~", close: "~~", title: "Закреслений" },
  { key: "marked", label: "M", open: "||", close: "||", title: "Підсвічений" },
] as const;

export function RichTextField({
  value,
  onChange,
  multiline = true,
  placeholder,
  showPreview = true,
}: Props) {
  const [markup, setMarkup] = useState(() => runsToMarkup(richToRuns(value)));
  const ref = useRef<any>(null);
  const selRef = useRef<{ s: number; e: number } | null>(null);

  function rememberSelection() {
    const el = ref.current;
    if (!el) return;
    selRef.current = { s: el.selectionStart ?? 0, e: el.selectionEnd ?? 0 };
  }

  function getSel(): { s: number; e: number } {
    if (selRef.current) return selRef.current;
    const el = ref.current;
    if (el) return { s: el.selectionStart ?? 0, e: el.selectionEnd ?? 0 };
    return { s: 0, e: 0 };
  }

  function emit(next: string) {
    setMarkup(next);
    onChange(runsToRich(markupToRuns(next)));
  }

  function wrap(open: string, close: string) {
    const el = ref.current;
    if (!el) return;
    const { s, e } = getSel();
    const sel = markup.slice(s, e) || "текст";
    const before = markup.slice(Math.max(0, s - open.length), s);
    const after = markup.slice(e, e + close.length);
    let next: string, ns: number, ne: number;
    if (before === open && after === close) {
      next = markup.slice(0, s - open.length) + markup.slice(s, e) + markup.slice(e + close.length);
      ns = s - open.length;
      ne = e - open.length;
    } else {
      next = markup.slice(0, s) + open + sel + close + markup.slice(e);
      ns = s + open.length;
      ne = ns + sel.length;
    }
    selRef.current = { s: ns, e: ne };
    emit(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ns, ne);
    });
  }

  function addLink() {
    const el = ref.current;
    if (!el) return;
    const { s, e } = getSel();
    const re = /\[([^\]]*)\]\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(markup))) {
      const start = m.index;
      const end = start + m[0].length;
      if (start <= s && e <= end) {
        const inner = m[1];
        const next = markup.slice(0, start) + inner + markup.slice(end);
        const ns = Math.min(Math.max(s, start), start + inner.length);
        const ne = Math.min(Math.max(e, start), start + inner.length);
        selRef.current = { s: ns, e: ne };
        emit(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(ns, ne);
        });
        return;
      }
    }
    const sel = markup.slice(s, e) || "посилання";
    const next = markup.slice(0, s) + `[${sel}](https://)` + markup.slice(e);
    const urlStart = s + sel.length + 3;
    selRef.current = { s: urlStart, e: urlStart + 8 };
    emit(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(urlStart, urlStart + 8);
    });
  }

  const fieldProps = {
    ref,
    value: markup,
    placeholder,
    onChange: (e: any) => {
      emit(e.target.value);
      rememberSelection();
    },
    onSelect: rememberSelection,
    onKeyUp: rememberSelection,
    onMouseUp: rememberSelection,
    onTouchEnd: rememberSelection,
  };

  return (
    <div className="rt-field">
      {multiline ? (
        <textarea {...fieldProps} className="wb-textarea" rows={3} />
      ) : (
        <input {...fieldProps} className="wb-input" />
      )}
      <div className="rt-toolbar">
        {TOKENS.map((t) => (
          <button
            type="button"
            key={t.key}
            className="rt-btn"
            title={t.title}
            onClick={() => wrap(t.open, t.close)}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className="rt-btn" title="Посилання" onClick={addLink}>
          🔗
        </button>
      </div>
      {showPreview && (
        <div className="rt-preview">
          <RichPreview value={runsToRich(markupToRuns(markup))} />
        </div>
      )}
    </div>
  );
}
