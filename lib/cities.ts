/**
 * Which city an event is in, worked out from what the organiser typed.
 *
 * THERE IS NO CITY COLUMN, AND ADDING ONE WOULD HAVE SHIPPED AN EMPTY
 * PAGE. Every event already in the database has a free-text `location` —
 * "Ikeja, Lagos", "The Shrine", "Victoria Island" — and nothing else. A
 * migration would mean Explore showed nothing until every organiser went
 * back and re-edited an event they had already published. So the city is
 * derived at read time from the text that exists.
 *
 * IT MATCHES ON NEIGHBOURHOODS, NOT JUST CITY NAMES. Nobody writing a
 * Lagos address types "Lagos" — they type Lekki, Yaba, VI, Surulere. A
 * matcher that only knew city names would file the whole city under
 * "Elsewhere", which is the failure that makes a discovery page useless
 * in the one market it was built for.
 *
 * Nigeria-first, but not Nigeria-only: the diaspora runs events, and an
 * organiser in London or Toronto should not fall off the page.
 *
 * Pure, and free of any database or framework import, so the matching can
 * be reasoned about — and corrected — without running anything.
 */

export interface City {
  /** URL-safe, stable. Used as an anchor and a query value. */
  key: string;
  name: string;
  country: string;
  /** Lowercase needles. The city's own name is added automatically. */
  aliases: readonly string[];
}

/**
 * Order matters only for ties. A longer alias is always tried before a
 * shorter one, so "port harcourt" cannot be swallowed by "port".
 */
export const CITIES: readonly City[] = [
  // ── Nigeria ────────────────────────────────────────────────
  {
    key: "lagos", name: "Lagos", country: "Nigeria",
    aliases: [
      "ikeja", "lekki", "victoria island", "vi", "yaba", "surulere", "ikoyi",
      "ajah", "ikorodu", "badagry", "epe", "oshodi", "maryland", "gbagada",
      "magodo", "ojota", "festac", "apapa", "ilupeju", "agege", "alimosho",
      "mushin", "ketu", "sangotedo", "chevron", "ozumba", "admiralty",
      "banana island", "eko atlantic", "landmark", "muri okunola", "freedom park",
      "the shrine", "new afrika shrine", "terra kulture", "balmoral",
    ],
  },
  {
    key: "abuja", name: "Abuja", country: "Nigeria",
    aliases: [
      "fct", "wuse", "maitama", "garki", "gwarinpa", "asokoro", "jabi",
      "utako", "lugbe", "kubwa", "lokogoma", "gudu", "life camp", "katampe",
      "central business district", "transcorp hilton",
    ],
  },
  {
    key: "port-harcourt", name: "Port Harcourt", country: "Nigeria",
    aliases: ["ph", "portharcourt", "rivers state", "gra phase", "trans amadi", "rumuokoro"],
  },
  { key: "ibadan", name: "Ibadan", country: "Nigeria", aliases: ["bodija", "ring road", "agodi", "jericho", "mokola"] },
  { key: "benin-city", name: "Benin City", country: "Nigeria", aliases: ["benin", "edo state", "ugbowo", "sapele road"] },
  { key: "enugu", name: "Enugu", country: "Nigeria", aliases: ["independence layout", "new haven", "coal city"] },
  { key: "kano", name: "Kano", country: "Nigeria", aliases: ["nassarawa gra"] },
  { key: "kaduna", name: "Kaduna", country: "Nigeria", aliases: ["barnawa", "malali"] },
  { key: "jos", name: "Jos", country: "Nigeria", aliases: ["plateau state", "rayfield"] },
  { key: "owerri", name: "Owerri", country: "Nigeria", aliases: ["imo state", "wetheral"] },
  { key: "uyo", name: "Uyo", country: "Nigeria", aliases: ["akwa ibom", "ibom"] },
  { key: "calabar", name: "Calabar", country: "Nigeria", aliases: ["cross river", "marian road"] },
  { key: "abeokuta", name: "Abeokuta", country: "Nigeria", aliases: ["ogun state", "oke ilewo"] },
  { key: "ilorin", name: "Ilorin", country: "Nigeria", aliases: ["kwara state", "tanke"] },
  { key: "warri", name: "Warri", country: "Nigeria", aliases: ["effurun", "delta state"] },
  { key: "asaba", name: "Asaba", country: "Nigeria", aliases: ["okpanam"] },
  { key: "awka", name: "Awka", country: "Nigeria", aliases: ["anambra"] },
  { key: "onitsha", name: "Onitsha", country: "Nigeria", aliases: [] },
  { key: "aba", name: "Aba", country: "Nigeria", aliases: [] },
  { key: "umuahia", name: "Umuahia", country: "Nigeria", aliases: ["abia state"] },
  { key: "akure", name: "Akure", country: "Nigeria", aliases: ["ondo state"] },
  { key: "osogbo", name: "Osogbo", country: "Nigeria", aliases: ["oshogbo", "osun state"] },
  { key: "abakaliki", name: "Abakaliki", country: "Nigeria", aliases: ["ebonyi"] },
  { key: "makurdi", name: "Makurdi", country: "Nigeria", aliases: ["benue state"] },
  { key: "minna", name: "Minna", country: "Nigeria", aliases: ["niger state"] },
  { key: "lokoja", name: "Lokoja", country: "Nigeria", aliases: ["kogi state"] },
  { key: "maiduguri", name: "Maiduguri", country: "Nigeria", aliases: ["borno"] },
  { key: "sokoto", name: "Sokoto", country: "Nigeria", aliases: [] },
  { key: "bauchi", name: "Bauchi", country: "Nigeria", aliases: [] },
  { key: "gombe", name: "Gombe", country: "Nigeria", aliases: [] },
  { key: "yola", name: "Yola", country: "Nigeria", aliases: ["adamawa"] },
  { key: "lafia", name: "Lafia", country: "Nigeria", aliases: ["nasarawa state"] },
  { key: "katsina", name: "Katsina", country: "Nigeria", aliases: [] },

  // ── The rest of the continent ──────────────────────────────
  { key: "accra", name: "Accra", country: "Ghana", aliases: ["osu", "east legon", "labadi", "ghana"] },
  { key: "kumasi", name: "Kumasi", country: "Ghana", aliases: [] },
  { key: "nairobi", name: "Nairobi", country: "Kenya", aliases: ["westlands", "karen", "kilimani", "kenya"] },
  { key: "kampala", name: "Kampala", country: "Uganda", aliases: ["uganda"] },
  { key: "kigali", name: "Kigali", country: "Rwanda", aliases: ["rwanda"] },
  { key: "dar-es-salaam", name: "Dar es Salaam", country: "Tanzania", aliases: ["dar", "tanzania"] },
  { key: "johannesburg", name: "Johannesburg", country: "South Africa", aliases: ["joburg", "jozi", "sandton", "soweto"] },
  { key: "cape-town", name: "Cape Town", country: "South Africa", aliases: ["capetown", "camps bay", "woodstock"] },
  { key: "durban", name: "Durban", country: "South Africa", aliases: [] },
  { key: "abidjan", name: "Abidjan", country: "Côte d'Ivoire", aliases: ["cocody", "ivory coast"] },
  { key: "dakar", name: "Dakar", country: "Senegal", aliases: ["senegal"] },
  { key: "cotonou", name: "Cotonou", country: "Benin Republic", aliases: [] },
  { key: "lome", name: "Lomé", country: "Togo", aliases: ["lome", "togo"] },
  { key: "douala", name: "Douala", country: "Cameroon", aliases: ["cameroon"] },
  { key: "freetown", name: "Freetown", country: "Sierra Leone", aliases: ["sierra leone"] },
  { key: "monrovia", name: "Monrovia", country: "Liberia", aliases: ["liberia"] },
  { key: "banjul", name: "Banjul", country: "The Gambia", aliases: ["gambia"] },
  { key: "cairo", name: "Cairo", country: "Egypt", aliases: ["egypt"] },

  // ── Where the diaspora is ──────────────────────────────────
  { key: "london", name: "London", country: "United Kingdom", aliases: ["peckham", "hackney", "shoreditch", "croydon", "brixton", "camden", "dalston"] },
  { key: "manchester", name: "Manchester", country: "United Kingdom", aliases: [] },
  { key: "birmingham", name: "Birmingham", country: "United Kingdom", aliases: [] },
  { key: "dublin", name: "Dublin", country: "Ireland", aliases: ["ireland"] },
  { key: "toronto", name: "Toronto", country: "Canada", aliases: ["scarborough", "mississauga", "brampton", "ontario"] },
  { key: "calgary", name: "Calgary", country: "Canada", aliases: ["alberta"] },
  { key: "new-york", name: "New York", country: "United States", aliases: ["nyc", "brooklyn", "manhattan", "queens", "bronx", "harlem"] },
  { key: "atlanta", name: "Atlanta", country: "United States", aliases: ["atl", "georgia"] },
  { key: "houston", name: "Houston", country: "United States", aliases: ["texas"] },
  { key: "dallas", name: "Dallas", country: "United States", aliases: [] },
  { key: "chicago", name: "Chicago", country: "United States", aliases: [] },
  { key: "washington-dc", name: "Washington, D.C.", country: "United States", aliases: ["dc", "maryland", "silver spring"] },
  { key: "los-angeles", name: "Los Angeles", country: "United States", aliases: ["la", "hollywood"] },
  { key: "dubai", name: "Dubai", country: "United Arab Emirates", aliases: ["uae", "abu dhabi"] },
  { key: "berlin", name: "Berlin", country: "Germany", aliases: ["germany"] },
  { key: "paris", name: "Paris", country: "France", aliases: ["france"] },
  { key: "amsterdam", name: "Amsterdam", country: "Netherlands", aliases: ["netherlands", "holland"] },
];

/** Somewhere we could not place. Never shown as if it were a city. */
export const ELSEWHERE: City = {
  key: "elsewhere", name: "Everywhere else", country: "", aliases: [],
};

/** No location at all. An honest answer, not a guess. */
export const ONLINE: City = {
  key: "online", name: "Online", country: "", aliases: [],
};

/**
 * Every needle, longest first.
 *
 * Longest-first is the whole correctness story. "aba" is a real city and a
 * substring of "Abakaliki", "Ibadan" and "Abuja"; "PH" is inside
 * "Phase 2"; "LA" is inside "Lagos" and "village". Sorting by length and
 * requiring a word boundary is what keeps a Lagos party out of Abia.
 */
const NEEDLES: readonly { needle: string; city: City }[] = CITIES.flatMap((c) => [
  { needle: c.name.toLowerCase(), city: c },
  ...c.aliases.map((a) => ({ needle: a, city: c })),
]).sort((a, b) => b.needle.length - a.needle.length);

/** Fold accents so "Lomé" matches "lome" typed without the accent. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Whole-word only.
 *
 * Without this, "Ikeja" contains "ike", "Ondo" contains "ond", and a venue
 * called "Alaba International" files under Aba. Punctuation and digits count
 * as boundaries, so "Lagos." and "Lekki/Ajah" both still match.
 */
function hasWord(haystack: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = at === 0 ? " " : haystack[at - 1];
    const after = at + needle.length >= haystack.length ? " " : haystack[at + needle.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    from = at + 1;
  }
}

/** The city an event belongs to. Never throws, never guesses wildly. */
export function cityOf(location: string | null | undefined): City {
  const text = fold((location ?? "").trim());
  if (!text) return ONLINE;

  // An organiser who wrote "online", "virtual" or "zoom" means it.
  if (/\b(online|virtual|remote|zoom|google meet|livestream|instagram live)\b/.test(text)) {
    return ONLINE;
  }

  for (const { needle, city } of NEEDLES) {
    if (hasWord(text, fold(needle))) return city;
  }
  return ELSEWHERE;
}

/** All the cities we know, for a picker. Alphabetical within a country. */
export function knownCities(): City[] {
  return [...CITIES].sort(
    (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
  );
}

export function cityByKey(key: string | null | undefined): City | null {
  if (!key) return null;
  if (key === ELSEWHERE.key) return ELSEWHERE;
  if (key === ONLINE.key) return ONLINE;
  return CITIES.find((c) => c.key === key) ?? null;
}
