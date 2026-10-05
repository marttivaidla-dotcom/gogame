# 🐦🐉 Skoorivihik – Wingspan & Wyrmspan

Veebirakendus lauamängude **Wingspan** ja **Wyrmspan** tulemuste sisestamiseks, ajaloo vaatamiseks ja statistika jaoks.
Vaikimisi salvestatakse andmed kasutatava brauseri `localStorage`-isse, nii et rakenduse saab kohe käivitada.

- **Uus mäng / muutmine:** punktid kategooriate kaupa; salvestatud mängu saab ajaloos avada ja muuta (`/mang/:id/muuda`).
- **Ajalugu:** mängud mänguõhtute kaupa, iga mängu punktijaotus, muutmine ja kustutamine.
- **Statistika:** edetabel (võidu %, viimased 5 kohta), omavaheline seis kahe mängija vahel, rekordid,
  taseme muutus ajas (10 mängu libisev keskmine) ja keskmised punktid kategooriate kaupa.
- **Varasemad mängud:** 122 Wingspani mängu vanast skooritabelist on failis `src/data/wingspanHistory.js`.
  Brauseri salvestus algab nendega automaatselt; Supabase'i lisatakse need ajaloo lehelt nupuga
  „Lisa varasemad Wingspani mängud“ (juba olemas olevaid mänge uuesti ei lisata). Samast kohast saab kleepida ka vana tabeli.
Soovi korral saab seadistada Supabase'i (PostgreSQL), et jagada andmeid eri seadmete ja kasutajate vahel.

**Tehnoloogiad:** React 19 + Vite, Tailwind CSS v4, React Router, valikuline Supabase (`supabase-js`), hostimine Vercelis.

## Arhitektuur

```
Brauser (React SPA, Vite/Vercel)
   ├─ vaikimisi: localStorage (brauseripõhine)
   └─ valikuliselt: supabase-js (anon/publishable võti)
      ▼
      Supabase PostgreSQL – skeem "lauamangud"
   ├─ players        mängijad
   ├─ games          mängusessioonid (wingspan / wyrmspan, kuupäev, märkmed)
   ├─ game_scores    mängija tulemus mängus: breakdown (jsonb), total, placement
   ├─ create_game()  RPC: salvestab mängu + tulemused ühe tehinguna, arvutab summad ja kohad
   └─ player_stats   vaade: mänge, võite, keskmine, parim mängija ja mängu kaupa
```

```
src/
├─ lib/
│  ├─ supabase.js        Supabase klient
│  ├─ api.js             andmepäringud (localStorage või Supabase)
│  └─ scoring.js         punktikategooriad ja arvutusloogika (Wingspan + Wyrmspan)
├─ components/
│  ├─ Layout.jsx         päis + navigatsioon (mobiilis alumine riba)
│  ├─ ScoreCalculator.jsx  punktitabel: kategooriad × mängijad, live-summad ja kohad
│  └─ ui.jsx             väikesed ühiskomponendid + useLoader hook
└─ pages/
   ├─ NewGamePage.jsx    uue mängu sisestamine
   ├─ HistoryPage.jsx    mängude ajalugu (lahtikäiv detailvaade, kustutamine)
   ├─ StatsPage.jsx      edetabel, rekordid, kategooriate keskmised
   └─ PlayersPage.jsx    mängijate lisamine / muutmine / kustutamine
```

### Punktikategooriad

| Wingspan | Wyrmspan |
|---|---|
| Linnud | Draakonid |
| Boonuskaardid | Mängu lõpu võimed |
| Vooru lõpueesmärgid | Munad |
| Munad | Ressursid kaartidel |
| Toiduvarud kaartidel | Alla pistetud kaardid |
| Alla pistetud kaardid | Vooru lõpueesmärgid |
| Nektar (Okeaania laiendus, sisse lülitatav) | Draakonigild |
| | Mündid ja esemed (1 p/münt + 1 p iga 4 eseme kohta – arvutatakse automaatselt) |

Kategooriaid saab muuta failis `src/lib/scoring.js`. Punktid salvestatakse mängijapõhise jaotusena; mängu laienduste valik säilitatakse ajaloos.

### Keeled (eesti / inglise)

Rakendus on kakskeelne. Keelt vahetatakse päises nuppudega **ET / EN**.
- Valitud keel salvestatakse brauserisse. Esimesel külastusel valitakse keel brauseri seadete järgi.
- Kuupäevad ja järgarvud vormindatakse valitud keele järgi (nt „2. koht“ / „2nd place“).

Kus tõlked asuvad:
- `src/i18n/translations.js`: kasutajaliidese tekstid. Igal keelel on samad võtmed.
- `src/lib/scoring.js`: mängude kategooriad ja vihjed kujul `{ et: '…', en: '…' }`.
- `src/i18n/I18nProvider.jsx`: `useI18n()` annab funktsioonid `t('võti', { muutujad })` ja `tr({ et, en })`.

Uue keele lisamiseks lisa failis `translations.js` uus plokk (nt `fi`), kirje massiivi `LANGUAGES` ja kategooriatele vastav väli.

Andmed (mängijate nimed, punktid, märkmed) on keelest sõltumatud, nii et sama mäng on nähtav mõlemas keeles.

---

## 1. Kiire kohalik käivitamine

Node.js-i paigaldamise järel:

```powershell
npm.cmd install
npm.cmd run dev
```

Ava terminalis näidatud aadress (tavaliselt `http://localhost:5173`). `.env.local` ega Supabase'i projekti pole vaja.
Andmed jäävad sellesse brauserisse ja seadmesse; brauseri andmete kustutamine kustutab ka need.

## 2. Valikuline Supabase'i seadistamine (jagatud andmed)

Rakendus kasutab olemasolevat Supabase'i projekti (nt `godog`). Kõik tabelid on eraldi skeemis `lauamangud`,
nii et projekti teiste rakenduste tabeleid (skeem `public`) see ei puuduta.

1. Ava Supabase'is projekt → **SQL Editor** → **New query**. Kleebi sinna kogu fail [`supabase/schema.sql`](supabase/schema.sql) ja vajuta **Run**.
2. **Project Settings → Data API → Exposed schemas**: lisa `lauamangud` (olemasolevad, nt `public`, jäta alles) → **Save**.
   Ilma selleta vastab API veaga *"The schema must be one of the following…"*.
3. **Project Settings → API Keys** (või **API**): kopeeri
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** või **publishable** võti (`sb_publishable_…`) → `VITE_SUPABASE_ANON_KEY`

> ⚠️ Ära kunagi pane rakendusse `service_role` ega `secret` võtit – see on administraatori võti.

Skeemi nime saab muuta failis `src/lib/supabase.js` (`DB_SCHEMA`) ja `schema.sql`-is.

Kui Supabase on seadistatud, kasutab rakendus selle andmebaasi kohaliku salvestuse asemel.
Varem seadistatud andmebaasi uuendamiseks käivita SQL Editoris uuesti kogu [`supabase/schema.sql`](supabase/schema.sql).

## 3. Kohalik käivitamine Supabase'iga

```bash
cp .env.example .env.local      # Windows PowerShellis: Copy-Item .env.example .env.local
# täida .env.local väärtused
npm install
npm run dev                     # avab http://localhost:5173
```

## 4. GitHubi üleslaadimine

1. Loo GitHubis uus tühi repo, nt `lauamangud` (ilma README-ta).
2. Projekti kaustas:

```bash
git init
git add .
git commit -m "Esimene versioon"
git branch -M main
git remote add origin https://github.com/<kasutajanimi>/lauamangud.git
git push -u origin main
```

`.env.local` on `.gitignore`-s, nii et võtmed GitHubi ei satu.

## 5. Vercelisse paigaldamine

1. Logi sisse <https://vercel.com> GitHubi kontoga → **Add New… → Project** → vali `lauamangud` repo → **Import**.
2. Framework Preset tuvastatakse automaatselt (**Vite**). Build command on `npm run build` ja output `dist`.
3. Kui kasutad Supabase'i, ava **Environment Variables** ja lisa:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy**. Saad lingi kujul `https://lauamangud.vercel.app`.

Ilma keskkonnamuutujateta töötab rakendus Vercelis iga külastaja brauseri kohaliku salvestusega. Supabase'i keskkonnamuutujatega saavad külastajad jagatud andmed.
Edaspidi läheb iga `git push` haru `main` automaatselt live'i. Teistele harudele ja pull requestidele tehakse eelvaate-URL.
Kui muudad hiljem keskkonnamuutujaid, tee Vercelis **Deployments → Redeploy**, sest Vite lisab muutujad koodi build'i ajal.

`vercel.json` suunab kõik teed `index.html`-ile, nii et lehe värskendamine aadressil nagu `/statistika` ei anna viga 404.

## Turvalisus

Rakendusel pole sisselogimist: igaüks, kellel on link, saab andmeid lugeda, lisada ja kustutada. Sõpruskonna jaoks on see tavaliselt piisav.
Kui soovid kaitset, lisa Supabase Auth (nt e-posti maagiline link) ja muuda `schema.sql` RLS-poliitikates `to anon, authenticated` → `to authenticated`.
