# Anatomické roviny koně — 4.0 (nové rozložení)

Aktualizace **pouze uživatelského rozhraní** podle dodané předlohy. Nový model koně se nevytvářel a stávající realistický GLB zůstává stejný.

## Co se změnilo

- Nahoře přes celou šířku: Celý kůň / Hlava / Přední noha / Zadní noha.
- Vlevo: zvětšená interaktivní 3D scéna, ovládání pohledu a reset kamery.
- Vpravo: barevné přepínače čtyř anatomických rovin a výběr anatomických směrů.
- Dole v pravém panelu: vysvětlení zvolené roviny.
- Průhlednost, popisky, automatické otáčení, výměna GLB a obrácení orientace jsou zachovány v **Další možnosti zobrazení**.
- Rozložení se přizpůsobí i mobilům. Popisky jsou stále vložené přímo do 3D rovin.
- Čtyři základní směry zobrazují šipky ve 3D. Ostatní směry vpravo jsou funkční vysvětlující tlačítka (bez 3D šipky).

## Jak aktualizovat GitHub Pages

1. Rozbal ZIP.
2. V kořeni stávajícího repozitáře nahraď `index.html`, `styles.css` a `app.js`.
3. Ulož přes Commit changes.
4. Otevři web a ověř označení `v4.0` v levém horním rohu 3D plochy.
5. Pokud se nenačte nová verze, použij Cmd+Shift+R nebo otevři soukromé okno.

**Nevymazávej** původní `models/` ani uložený GLB soubor. V aplikaci zůstává napřed načítání `./models/realisticky-kun.glb`; pokud tam není, načte se stejný realistický GLB odkaz jako ve verzi 3.7.
