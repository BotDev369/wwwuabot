/**
 * `ShareModal` — «Поділитись»: копіювання посилання, передача в месенджер і QR.
 *
 * Посилання збирає `buildShareLinks` з адреси сторінки й імені бота. Якщо
 * діплінка немає (бота не відомо), показуємо веб-адресу — людина все одно
 * може її передати.
 *
 * @module packages/ui/src/nav/ShareModal
 */

import { useEffect, useState, type ReactElement } from "react";
import QRCode from "qrcode";
import { buildShareLinks, TELEGRAM_ORIGIN } from "@wwwuabot/shared/content";
import { MenuModal } from "../menu/MenuModal";
import { useCopyLink } from "./useCopyLink";
import type { ShareTarget } from "./screen-chrome";

export interface ShareModalProps {
  share: ShareTarget;
  botUsername: string | null;
  onClose: () => void;
}

export function ShareModal({ share, botUsername, onClose }: ShareModalProps): ReactElement {
  const links = buildShareLinks({
    slug: share.slug,
    params: share.params,
    botUsername,
    webBase: typeof window !== "undefined" ? window.location.origin : null,
  });
  const url = links.deepLink ?? links.webUrl ?? links.webPath;
  const { copied, copy } = useCopyLink(url);
  const qr = useQrDataUrl(url);
  const text = encodeURIComponent(url);

  return (
    <MenuModal
      title="Поділитись"
      variant="card"
      onClose={onClose}
      content={
      <div className="wb-share">
        <p className="wb-share__url">{url}</p>
        <button type="button" className="wb-share__copy" onClick={copy}>
          {copied ? "Скопійовано" : "Копіювати посилання"}
        </button>
        <div className="wb-share__apps">
          <a href={`${TELEGRAM_ORIGIN}/share/url?url=${text}`} target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
          <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </div>
        {qr && <img className="wb-share__qr" src={qr} alt="QR-код посилання" width={200} height={200} />}
      </div>
      }
    />
  );
}

/** QR-код посилання як data-URL; `null`, поки він не готовий. */
function useQrDataUrl(url: string): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 200 })
      .then((data: string) => {
        if (!cancelled) setSrc(data);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return src;
}
