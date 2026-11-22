# Пошукові слова: аркуш для вичитки

Один рядок — один рядок бази. Формат у базі: JSON-масив фраз у `search_terms`
(`platform_pages` — сторінки, `shop_products` — товари). Після впровадження джерело правди —
база, цей файл лишається знімком для вичитки.

**Правило:** фрази — те, як люди реально називають річ, разом із комбінаціями й
транслітерацією. Регістр не має значення, дефіси й апострофи знімаються при пошуку.
Порожній список у публічної сторінки або активного товару — помилка збереження.

## Сторінки

| slug | слова |
|---|---|
| `pageslay` | pageslay, page slay, пейджслей, пейдж слай, розмальовки, кольорові сторінки, магазин pageslay |
| `galyashop` | galyashop, galya shop, галяшоп, галя шоп, галя, крамниця галі, трави, лікарські рослини, зелена аптека, ромашка, chamomile |
| `viruvannia` | вірування, релігії, дослідження вірувань, релігійність, світові релігії |
| `viruvannia/sto-vidsotkiv` | сто відсотків, розподіл людства, скільки віруючих |
| `viruvannia/dvi-pravdy` | дві правди, pew, world religion database, різні цифри |
| `viruvannia/khto-roste-khto-zmenshuietsia` | хто росте, хто зменшується, десять років, карта релігій |
| `viruvannia/khrystyianstvo` | християнство, християни, 2,3 мільярда |
| `viruvannia/islam` | іслам, мусульмани, 2 мільярди |
| `viruvannia/induizm` | індуїзм, індуїсти, парасолька |
| `viruvannia/buddyzm` | буддизм, буддисти, 324 мільйони |
| `viruvannia/narodni-relihii` | народні релігії, народні культи |
| `viruvannia/nones` | nones, нонс, без релігії, нерелігійні |
| `viruvannia/ateisty-ahnostyky` | атеїсти, агностики, нічого конкретного |
| `viruvannia/kytai` | китай, релігія в китаї, народні культури |
| `viruvannia/matrytsia-viruvan` | матриця вірувань, десять питань, порівняння релігій |
| `services` | сервіси, послуги, сервіси платформи |
| `favorites` | обране, збережене, закладки |
| `research` | дослідження, дослідження платформи, статті |
| `contacts` | контакти, зв'язок, адмін, підтримка |
| `(головна)` | головна, платформа, паляниця, palyanytsia, wwwuabot |

## Товари

| магазин | slug | слова |
|---|---|---|
| galyashop | `dereviy-zvychaynyy` | деревій, деревій звичайний, кровоспинна трава |
| galyashop | `hisop-likarskyy` | гісоп, гісоп лікарський, hyssop |
| galyashop | `bereza-povysla-lystya` | береза, листя берези, березовий лист |
| galyashop | `bezsmertnyk` | безсмертник, цмин, безсмертник піщаний |
| galyashop | `astrahal-sherstystok` | астрагал, астрагал шерстистоквітковий, трава астрагал |
| galyashop | `myata-pertseva` | мʼята, м'ята, м'ята перцева, mint |
| galyashop | `kalendula-likarska` | календула, нагідки, календула лікарська |
| galyashop | `pyzhmo-zvychayne` | пижмо, пижмо звичайне, дика горобина |
| galyashop | `troyanda-chayna` | троянда, троянда чайна, пелюстки троянди |
| galyashop | `khvoshch-polovyy` | хвощ, хвощ польовий, польовий хвощ |
| galyashop | `khmil-zvychaynyy` | хміль, хміль звичайний, шишки хмелю |
| galyashop | `chornobryvtsi-rozlohi` | чорнобривці, чорнобривці розлогі, tagetes |
| galyashop | `podorozhnyk-velykyy` | подорожник, подорожник великий, лист подорожника |
| galyashop | `ivan-chay-fermentovanyy` | іван-чай, іван чай, ферментований чай, копорський чай |
| galyashop | `zvirobiy-zvychaynyy` | звіробій, звіробій звичайний, st johns wort |
| pageslay | `neko-girls` | neko girls, неко, дівчата-коти, аніме розмальовки |
| pageslay | `mermaid` | русалка, mermaid, підводний світ, розмальовка русалка |
| pageslay | `everyday-moments` | повсякденні моменти, everyday moments, розмальовки побут |
| pageslay | `weird-creature-squad` | загін дивних створінь, weird creature squad, дивні створіння |
| pageslay | `angry-cats` | сердиті коти, angry cats, коти, 20 розмальовок |
| pageslay | `solarpunk` | соларпанк, solarpunk, фантастика розмальовки |
