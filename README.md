# Anatomické roviny koně — interaktivní 3D atlas

Webová aplikace pro výuku veterinární anatomie. Funguje přímo z GitHub Pages, bez instalace a bez backendu.

## Co umí

- Otočný 3D model stojícího koně (tažení myší nebo prstem)
- Přiblížení kolečkem myši nebo gestem dvěma prsty
- Samostatné přepínání čtyř rovin (mediánní, sagitální, dorzální, transverzální)
- Barevné průhledné roviny s rámečkem a volitelnými 3D popisky
- Nastavení průhlednosti, zobrazení/skrytí všech rovin
- Přednastavené pohledy: 3D, bok, zepředu, shora
- Automatická rotace a anatomické vysvětlivky
- Klávesové zkratky `1`–`4` pro roviny, `R` pro reset kamery
- Rozložení vhodné i pro mobil a tablet

## Publikování na GitHub Pages (bez programování)

1. Na [github.com/new](https://github.com/new) založ **veřejný** repozitář, např. `anatomie-kone`.
2. Stáhni ZIP s projektem, **rozbal** jej na počítači. Do repozitáře přes **Add file → Upload files** nahraj **obsah** složky projektu (nikoli samotný ZIP). Důležitá je souborová struktura:

   ```text
   index.html
   styles.css
   app.js
   models/
     kun.glb
   README.md
   generate_model.py
   .nojekyll
   ```

3. Potvrď tlačítkem **Commit changes**.
4. Otevři **Settings → Pages → Build and deployment** a vyber **Deploy from a branch** → **main** → **/(root)** → **Save**.
5. Po nasazení aplikaci najdeš na `https://TVE-UZIVATELSKE-JMENO.github.io/anatomie-kone/` (dle názvu repozitáře).

> Pro GitHub Pages musí být `index.html`, `app.js`, `styles.css` a složka `models` ve stejné kořenové úrovni projektu. Není třeba spouštět `npm install` ani sestavení.

## Místní spuštění

Otevři terminál v kořenové složce projektu a spusť:

```bash
python -m http.server 8000
```

Poté otevři `http://localhost:8000`. Některé prohlížeče nenačtou 3D model přímo přes `file://` (proto je vhodný lokální server).

## Technologie a model

- Knihovna [Three.js](https://threejs.org/) verze `0.176.0`, načítaná z CDN `jsdelivr.net` (při návštěvě webu je potřeba internet).
- Model `models/kun.glb` je součástí projektu. Jde o originální **stylizovaný výukový model**, vygenerovaný skriptem `generate_model.py` ze základních geometrických tvarů.
- Pokud chceš model upravit, spusť s Pythonem `pip install numpy trimesh` a poté `python generate_model.py`.
- Pozice a velikost rovin jsou **didaktickou ilustrací**. Nejde o anatomicky validovaný 3D sken skutečného zvířete.

## Anatomické definice

- **Mediánní** — prochází středem těla, pravá × levá polovina.
- **Sagitální** — rovnoběžná s mediánní, obecně pravá × levá část.
- **Dorzální** — odděluje dorzální (hřbetní) a ventrální (břišní) část.
- **Transverzální** — kolmá k podélné ose trupu, kraniální × kaudální část.

Studijní zdroje:
- [ICAR-IVRI Veterinary Anatomy — Anatomical Planes](https://veterinaryanatomy.com/atlas/introduction/general-anatomy/anatomical-planes/)
- [Open Educational Alberta — Body Planes and Cavities](https://pressbooks.openeducationalberta.ca/veterinarymedicalterminology/chapter/branches-of-study/)

## Poznámka k modelu

Uvedené roviny popisují trup stojícího koně. Pro hlavu a distální části končetin se v anatomii používají další specifická pravidla a směrové termíny. Model je výukovou pomůckou a nenahrazuje učebnici nebo anatomické preparáty.
