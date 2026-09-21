/**
 * `useCreateIntent` — прочитати намір створити **один раз** і прибрати його з
 * адреси.
 *
 * **Навіщо окремий хук.** Екран, який уміє створювати, відкриває свою форму за
 * `?new=1` (так «+» у хабі «Створити» веде **в той самий** екран, а не заводить
 * другу форму в хабі). Але прочитати намір мало: адреса — це **вхід**, а не
 * стан, і після прочитання вона не має його тримати. Інакше `/notes?new=1`
 * лишається адресою вже закритої форми, і «назад» у той самий запис історії
 * відкриває її знову — людина закрила форму, а повертається не туди, де була.
 *
 * Тому хук робить два кроки, і обидва один раз: віддає `true`, якщо форму
 * просили, і **замінює** адресу на ту саму без наміру (`replace`, а не новий
 * запис: зайвого кроку в історії не мусить бути — його ж і прибираємо).
 *
 * Читання прив'язане до тієї адреси, з якою екран з'явився (`useRef`): далі
 * адресу змінює сам хук, і повторне читання зробило б із хука другу правду про
 * те, що відкрито.
 *
 * @module web-platform-dev/src/app/useCreateIntent
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readCreateIntent, withoutCreateIntent } from "./routes";

export function useCreateIntent(): boolean {
  const [params, setParams] = useSearchParams();
  // Адреса появи екрана — у **стані**, а не в рефі: з неї читається намір, а
  // це рендер, тоді як реф читають лише обробники та ефекти (react-hooks/refs).
  // Друге значення тут і не потрібне: адреса появи одна на весь час життя екрана.
  const [entry] = useState(params);
  const [wanted] = useState(() => readCreateIntent(entry));
  // Прапорець, а не `[]` у залежностях: `setSearchParams` — новий на кожну
  // зміну адреси, і ефект без нього заходився б у коло (заміна адреси → новий
  // сетер → ефект → заміна адреси…).
  const consumed = useRef(false);

  useEffect(() => {
    if (!wanted || consumed.current) return;
    consumed.current = true;
    setParams(withoutCreateIntent(entry), { replace: true });
  }, [wanted, setParams, entry]);

  return wanted;
}
