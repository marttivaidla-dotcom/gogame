// Punktikategooriad vastavad mängude ametlikele punktilehtedele.
// Uue kategooria lisamiseks lisa siia rida – andmebaasi skeemi muuta pole vaja.
// Tekstid on kujul { et, en } ja tõlgitakse useI18n().tr() abil.

export const GAMES = {
  wingspan: {
    key: 'wingspan',
    name: 'Wingspan',
    icon: '🐦',
    tagline: { et: 'Linnud, munad ja elupaigad', en: 'Birds, eggs and habitats' },
    theme: {
      badge: 'bg-emerald-100 text-emerald-800',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      ring: 'ring-emerald-500',
      soft: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    categories: [
      {
        key: 'birds',
        label: { et: 'Linnud', en: 'Birds' },
        hint: { et: 'Lindude kaartidel olevad punktid', en: 'Points printed on bird cards' },
      },
      {
        key: 'bonus_cards',
        label: { et: 'Boonuskaardid', en: 'Bonus cards' },
        hint: { et: 'Boonuskaartide punktid', en: 'Points from bonus cards' },
      },
      {
        key: 'round_goals',
        label: { et: 'Vooru lõpueesmärgid', en: 'End-of-round goals' },
        hint: { et: 'Nelja vooru eesmärkide punktid kokku', en: 'Total from all four round goals' },
      },
      {
        key: 'eggs',
        label: { et: 'Munad', en: 'Eggs' },
        hint: { et: '1 p iga muna kohta', en: '1 pt per egg' },
      },
      {
        key: 'cached_food',
        label: { et: 'Toiduvarud kaartidel', en: 'Food on cards' },
        hint: { et: '1 p iga lindudel oleva toidumärgi kohta', en: '1 pt per food token cached on birds' },
      },
      {
        key: 'tucked_cards',
        label: { et: 'Alla pistetud kaardid', en: 'Tucked cards' },
        hint: { et: '1 p iga lindude alla pistetud kaardi kohta', en: '1 pt per card tucked under birds' },
      },
      {
        key: 'nectar',
        label: { et: 'Nektar', en: 'Nectar' },
        hint: {
          et: 'Okeaania laiendus: elupaiga enamus 5 p, teine koht 2 p',
          en: 'Oceania expansion: 5 pts for most in a habitat, 2 pts for second',
        },
        expansion: 'oceania',
      },
    ],
    expansions: [
      { key: 'european', label: { et: 'Euroopa laiendus', en: 'European Expansion' } },
      { key: 'oceania', label: { et: 'Okeaania laiendus (nektar)', en: 'Oceania Expansion (nectar)' } },
      { key: 'asia', label: { et: 'Aasia laiendus', en: 'Asia Expansion' } },
    ],
  },
  wyrmspan: {
    key: 'wyrmspan',
    name: 'Wyrmspan',
    icon: '🐉',
    tagline: { et: 'Draakonid, koopad ja gild', en: 'Dragons, caves and the guild' },
    theme: {
      badge: 'bg-violet-100 text-violet-800',
      button: 'bg-violet-600 hover:bg-violet-700',
      ring: 'ring-violet-500',
      soft: 'bg-violet-50',
      text: 'text-violet-700',
    },
    categories: [
      {
        key: 'dragons',
        label: { et: 'Draakonid', en: 'Dragons' },
        hint: { et: 'Draakonikaartidel olevad punktid', en: 'Points printed on dragon cards' },
      },
      {
        key: 'end_game_abilities',
        label: { et: 'Mängu lõpu võimed', en: 'End-game abilities' },
        hint: { et: 'Draakonite ja koobaste lõpuvõimete punktid', en: 'Points from dragon and cave end-game abilities' },
      },
      {
        key: 'eggs',
        label: { et: 'Munad', en: 'Eggs' },
        hint: { et: '1 p iga muna kohta', en: '1 pt per egg' },
      },
      {
        key: 'cached_resources',
        label: { et: 'Ressursid kaartidel', en: 'Cached resources' },
        hint: { et: '1 p iga draakonil hoitud ressursi kohta', en: '1 pt per resource cached on dragons' },
      },
      {
        key: 'tucked_cards',
        label: { et: 'Alla pistetud kaardid', en: 'Tucked cards' },
        hint: { et: '1 p iga alla pistetud kaardi kohta', en: '1 pt per tucked card' },
      },
      {
        key: 'objectives',
        label: { et: 'Vooru lõpueesmärgid', en: 'Public objectives' },
        hint: { et: 'Avalike eesmärkide punktid kokku', en: 'Total from end-of-round objectives' },
      },
      {
        key: 'guild',
        label: { et: 'Draakonigild', en: 'Dragon guild' },
        hint: { et: 'Gildi märkerite punktid', en: 'Points from guild markers' },
      },
      {
        key: 'coins_items',
        label: { et: 'Mündid ja esemed', en: 'Coins & items' },
        hint: {
          et: '1 p iga mündi kohta + 1 p iga 4 alles jäänud eseme kohta (ressursid, draakoni- ja koopakaardid käes)',
          en: '1 pt per coin + 1 pt per 4 leftover items (resources, dragon and cave cards in hand)',
        },
        kind: 'coinsItems',
      },
    ],
    expansions: [],
  },
}

export const GAME_LIST = Object.values(GAMES)

export const PLAYER_COLORS = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#0891b2', '#4b5563']

export function toInt(value) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

export function visibleCategories(gameKey, enabledExpansions = []) {
  return GAMES[gameKey].categories.filter((c) => !c.expansion || enabledExpansions.includes(c.expansion))
}

// Ühe kategooria punktid kasutaja sisendist (negatiivseid punkte mängudes pole)
export function categoryPoints(category, input) {
  const count = (value) => Math.max(0, toInt(value))
  if (category.kind === 'coinsItems') {
    return count(input?.coins) + Math.floor(count(input?.items) / 4)
  }
  return count(input)
}

// Salvestatud punktid → kalkulaatori sisend (mängu muutmiseks).
// Müntide ja esemete jaotust ei salvestata, seega läheb kogu summa müntide alla.
export function breakdownToInputs(categories, breakdown = {}) {
  return Object.fromEntries(
    categories
      .filter((c) => breakdown[c.key] != null)
      .map((c) => [c.key, c.kind === 'coinsItems' ? { coins: String(breakdown[c.key]), items: '' } : String(breakdown[c.key])]),
  )
}

// { kategooria: sisend } → { kategooria: punktid }
export function computeBreakdown(categories, inputs = {}) {
  return Object.fromEntries(categories.map((c) => [c.key, categoryPoints(c, inputs[c.key])]))
}

export function sumBreakdown(breakdown) {
  return Object.values(breakdown).reduce((sum, v) => sum + toInt(v), 0)
}

// Võistluse paremusjärjestus: võrdsed summad jagavad kohta (1, 1, 3)
export function placements(totals) {
  return totals.map((t) => totals.filter((other) => other > t).length + 1)
}

export function formatDate(iso, locale = 'et-EE') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
