/**
 * Стан модалки «Моєї дати»: створення / редагування / перегляд.
 *
 * Використовує Page Builder-блок. Сторінка `MyDatesPage` має власну модалку
 * з акордеоном, тому їй ці поля просто не потрібні — вони нейтральні.
 *
 * @module packages/ui/src/blocks/my-dates-table/useDateModal
 */

import { useCallback, useState } from "react";
import type { ModalMode, MyDate } from "./types";

export interface UseDateModalReturn {
  modalMode: ModalMode | null;
  modalDate: MyDate | null;
  openCreate: () => void;
  openEdit: (date: MyDate) => void;
  closeModal: () => void;
}

export function useDateModal(): UseDateModalReturn {
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);

  const openCreate = useCallback(() => {
    setModalMode("create");
    setModalDate(null);
  }, []);

  const openEdit = useCallback((date: MyDate) => {
    setModalMode("edit");
    setModalDate(date);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setModalDate(null);
  }, []);

  return { modalMode, modalDate, openCreate, openEdit, closeModal };
}
