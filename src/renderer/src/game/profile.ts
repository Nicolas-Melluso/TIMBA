export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AchievementId =
  | "first-table"
  | "first-row"
  | "first-diagonal"
  | "first-timba"
  | "first-kiosk"
  | "first-blackjack"
  | "first-amulet"
  | "boss-defeated"
  | "speed-stamp"
  | "first-contract"
  | "row-chain-3"
  | "clutch-timba"
  | "kiosk-regular"
  | "blackjack-streak"
  | "contract-streak"
  | "parca-warded"
  | "amulet-trinity"
  | "amulet-collector";

export type AchievementCategory = "core" | "table" | "kiosk" | "cards" | "amulets" | "contracts" | "parca" | "boss";
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";
export type AchievementTrack = "inicio" | "carton" | "mesa" | "kiosco" | "cartas" | "amuletos" | "contratos" | "parca";
export type CosmeticRewardKind = "badge" | "title" | "frame" | "skin" | "sticker" | "fx" | "trail";

export interface CosmeticRewardDefinition {
  flag: string;
  label: string;
  kind: CosmeticRewardKind;
  description: string;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  unlockHint: string;
  flavor: string;
  cosmeticFlag: string | null;
  cosmeticFlags?: readonly string[];
  cosmeticRewards: readonly CosmeticRewardDefinition[];
  category: AchievementCategory;
  track: AchievementTrack;
  rarity: AchievementRarity;
  points: number;
  secret: boolean;
  sortOrder: number;
}

export interface AchievementUnlock {
  unlockedAt: string;
}

export type AchievementUnlocks = Partial<Record<AchievementId, AchievementUnlock>>;

export interface ProfileCosmetics {
  [flag: string]: boolean;
}

export interface LocalProfile {
  version: 1;
  createdAt: string;
  updatedAt: string;
  achievements: AchievementUnlocks;
  cosmetics: ProfileCosmetics;
}

export const PROFILE_STORAGE_KEY = "timba.local-profile.v1";

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = [
  "core",
  "table",
  "kiosk",
  "cards",
  "amulets",
  "contracts",
  "parca",
  "boss",
];

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, AchievementDefinition> = {
  "first-table": {
    id: "first-table",
    name: "Primera Mesa",
    description: "Juga tu primera mesa.",
    unlockHint: "Entrar a una partida desde el menu.",
    flavor: "La mesa reconoce una mano nueva.",
    cosmeticFlag: "badge_first_table",
    cosmeticFlags: ["badge_first_table", "title_mesa_novata"],
    cosmeticRewards: [
      {
        flag: "badge_first_table",
        label: "Ficha de debut",
        kind: "badge",
        description: "Una marca simple para la primera mesa jugada.",
      },
      {
        flag: "title_mesa_novata",
        label: "Mesa novata",
        kind: "title",
        description: "Titulo inicial para el perfil local.",
      },
    ],
    category: "core",
    track: "inicio",
    rarity: "common",
    points: 1,
    secret: false,
    sortOrder: 10,
  },
  "first-row": {
    id: "first-row",
    name: "Primera Fila",
    description: "Completa tu primera fila.",
    unlockHint: "Marcar una fila completa en cualquier carton.",
    flavor: "El carton empieza a cantar.",
    cosmeticFlag: "badge_first_row",
    cosmeticFlags: ["badge_first_row", "frame_row_green"],
    cosmeticRewards: [
      {
        flag: "badge_first_row",
        label: "Linea limpia",
        kind: "badge",
        description: "Insignia de primera fila completa.",
      },
      {
        flag: "frame_row_green",
        label: "Marco linea verde",
        kind: "frame",
        description: "Marco de mesa asociado a patrones de fila.",
      },
    ],
    category: "table",
    track: "carton",
    rarity: "common",
    points: 1,
    secret: false,
    sortOrder: 20,
  },
  "first-diagonal": {
    id: "first-diagonal",
    name: "Primera Diagonal",
    description: "Completa tu primera diagonal.",
    unlockHint: "Marcar una diagonal completa.",
    flavor: "El carton queda cruzado por una chispa.",
    cosmeticFlag: "badge_first_diagonal",
    cosmeticFlags: ["badge_first_diagonal", "trail_diagonal_spark"],
    cosmeticRewards: [
      {
        flag: "badge_first_diagonal",
        label: "Diagonal marcada",
        kind: "badge",
        description: "Insignia para el primer patron diagonal.",
      },
      {
        flag: "trail_diagonal_spark",
        label: "Estela diagonal",
        kind: "trail",
        description: "Estela cosmetica para sellos diagonales.",
      },
    ],
    category: "table",
    track: "carton",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 30,
  },
  "first-timba": {
    id: "first-timba",
    name: "Primera Timba",
    description: "Gana tu primera TIMBA.",
    unlockHint: "Completar un carton entero.",
    flavor: "La mesa deja de probarte y empieza a respetarte.",
    cosmeticFlag: "badge_first_timba",
    cosmeticFlags: ["badge_first_timba", "title_timbero"],
    cosmeticRewards: [
      {
        flag: "badge_first_timba",
        label: "TIMBA cantada",
        kind: "badge",
        description: "Insignia de primera victoria completa.",
      },
      {
        flag: "title_timbero",
        label: "Timbero",
        kind: "title",
        description: "Titulo para perfiles que ya ganaron una mesa.",
      },
    ],
    category: "core",
    track: "mesa",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 40,
  },
  "first-kiosk": {
    id: "first-kiosk",
    name: "Primera Kiosquera",
    description: "Usa el kiosco por primera vez.",
    unlockHint: "Abrir el kiosco durante una partida.",
    flavor: "El mostrador guarda tu primera deuda de confianza.",
    cosmeticFlag: "skin_kiosk_hat",
    cosmeticFlags: ["skin_kiosk_hat", "sticker_kiosk_club"],
    cosmeticRewards: [
      {
        flag: "skin_kiosk_hat",
        label: "Gorra de kiosco",
        kind: "skin",
        description: "Detalle visual para el mostrador del kiosco.",
      },
      {
        flag: "sticker_kiosk_club",
        label: "Sticker del club",
        kind: "sticker",
        description: "Sticker de pertenencia al circuito del kiosco.",
      },
    ],
    category: "kiosk",
    track: "kiosco",
    rarity: "common",
    points: 1,
    secret: false,
    sortOrder: 50,
  },
  "first-blackjack": {
    id: "first-blackjack",
    name: "Primer Blackjack",
    description: "Gana una ronda de blackjack.",
    unlockHint: "Ganar una mano de blackjack en el kiosco.",
    flavor: "Las cartas aceptan tu apuesta de mesa chica.",
    cosmeticFlag: "skin_blackjack_chips",
    cosmeticFlags: ["skin_blackjack_chips", "title_cartas_calientes"],
    cosmeticRewards: [
      {
        flag: "skin_blackjack_chips",
        label: "Fichas calientes",
        kind: "skin",
        description: "Pila de fichas para victorias con cartas.",
      },
      {
        flag: "title_cartas_calientes",
        label: "Cartas calientes",
        kind: "title",
        description: "Titulo para jugadores que ganan fuera del carton.",
      },
    ],
    category: "cards",
    track: "cartas",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 60,
  },
  "first-amulet": {
    id: "first-amulet",
    name: "Primer Amuleto",
    description: "Activa tu primer amuleto.",
    unlockHint: "Comprar o activar un bonus permanente de tipo amuleto.",
    flavor: "El primer objeto raro empieza a pesar en el bolsillo.",
    cosmeticFlag: "fx_amulet_trail",
    cosmeticFlags: ["fx_amulet_trail", "frame_amulet_purple"],
    cosmeticRewards: [
      {
        flag: "fx_amulet_trail",
        label: "Rastro de amuleto",
        kind: "fx",
        description: "Brillo suave para acciones protegidas por amuletos.",
      },
      {
        flag: "frame_amulet_purple",
        label: "Relicario violeta",
        kind: "frame",
        description: "Marco de coleccion para el primer amuleto.",
      },
    ],
    category: "amulets",
    track: "amuletos",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 70,
  },
  "boss-defeated": {
    id: "boss-defeated",
    name: "Parca Caida",
    description: "Derrota a la Parca.",
    unlockHint: "Ganar la mesa final contra la Parca.",
    flavor: "La silla vacia de la Parca queda como trofeo.",
    cosmeticFlag: "skin_parca_trophy",
    cosmeticFlags: ["skin_parca_trophy", "title_parca_buster", "fx_boss_embers"],
    cosmeticRewards: [
      {
        flag: "skin_parca_trophy",
        label: "Trofeo de la Parca",
        kind: "skin",
        description: "Trofeo visible para perfiles que cerraron la corrida.",
      },
      {
        flag: "title_parca_buster",
        label: "Tumba Parca",
        kind: "title",
        description: "Titulo de victoria contra el jefe.",
      },
      {
        flag: "fx_boss_embers",
        label: "Brasas finales",
        kind: "fx",
        description: "Efecto cosmetico para victorias de fin de run.",
      },
    ],
    category: "boss",
    track: "parca",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 80,
  },
  "speed-stamp": {
    id: "speed-stamp",
    name: "Sello Relampago",
    description: "Consigue una victoria rapida.",
    unlockHint: "Conseguir al menos un premio de tipo rapido (quick) en la mesa.",
    flavor: "La tinta cae antes de que el carton pueda enfriarse.",
    cosmeticFlag: "badge_speed_stamp",
    cosmeticFlags: ["badge_speed_stamp", "title_relampago"],
    cosmeticRewards: [
      {
        flag: "badge_speed_stamp",
        label: "Sello rayo",
        kind: "badge",
        description: "Insignia para victorias de velocidad.",
      },
      {
        flag: "title_relampago",
        label: "Relampago",
        kind: "title",
        description: "Titulo para partidas ganadas a pura presion.",
      },
    ],
    category: "table",
    track: "mesa",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 90,
  },
  "first-contract": {
    id: "first-contract",
    name: "Primer Contrato",
    description: "Firma tu primer contrato.",
    unlockHint: "Aceptar 1 contrato cuando aparezca la oferta entre mesas.",
    flavor: "La letra chica se queda pegada al carton.",
    cosmeticFlag: "frame_contract_gold",
    cosmeticFlags: ["frame_contract_gold", "title_contratista"],
    cosmeticRewards: [
      {
        flag: "frame_contract_gold",
        label: "Marco dorado",
        kind: "frame",
        description: "Marco para perfiles que aceptaron deuda formal.",
      },
      {
        flag: "title_contratista",
        label: "Contratista",
        kind: "title",
        description: "Titulo para jugadores que firman condiciones.",
      },
    ],
    category: "contracts",
    track: "contratos",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 100,
  },
  "row-chain-3": {
    id: "row-chain-3",
    name: "Tres Lineas al Hilo",
    description: "Completa tres filas en una misma corrida.",
    unlockHint: "Marcar 3 patrones de fila (row-*) en una misma corrida.",
    flavor: "La mesa empieza a leer tus lineas antes que vos.",
    cosmeticFlag: "badge_row_chain_3",
    cosmeticFlags: ["badge_row_chain_3", "trail_row_chalk"],
    cosmeticRewards: [
      {
        flag: "badge_row_chain_3",
        label: "Triple linea",
        kind: "badge",
        description: "Insignia de consistencia en patrones de fila.",
      },
      {
        flag: "trail_row_chalk",
        label: "Tiza de carton",
        kind: "trail",
        description: "Estela de tiza para cadenas de fila.",
      },
    ],
    category: "table",
    track: "carton",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 110,
  },
  "clutch-timba": {
    id: "clutch-timba",
    name: "TIMBA de Ultimo Respiro",
    description: "Gana una mesa con el multiplicador al borde de x0.0.",
    unlockHint: "Cerrar TIMBA con premio full al limite (multiplicador clutch >= 0.6).",
    flavor: "La Parca ya estaba inclinada sobre la mesa.",
    cosmeticFlag: "fx_clutch_smoke",
    cosmeticFlags: ["fx_clutch_smoke", "title_ultimo_respiro"],
    cosmeticRewards: [
      {
        flag: "fx_clutch_smoke",
        label: "Humo de ultimo respiro",
        kind: "fx",
        description: "Efecto para victorias conseguidas al borde del fallo.",
      },
      {
        flag: "title_ultimo_respiro",
        label: "Ultimo respiro",
        kind: "title",
        description: "Titulo para cierres de mesa bajo presion extrema.",
      },
    ],
    category: "table",
    track: "mesa",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 120,
  },
  "kiosk-regular": {
    id: "kiosk-regular",
    name: "Cliente de la Casa",
    description: "Visita el kiosco varias veces en una corrida.",
    unlockHint: "Visitar el kiosco en 3 rondas distintas de una misma corrida.",
    flavor: "El kiosco ya te guarda vuelto.",
    cosmeticFlag: "sticker_cliente_casa",
    cosmeticFlags: ["sticker_cliente_casa", "skin_kiosk_neon"],
    cosmeticRewards: [
      {
        flag: "sticker_cliente_casa",
        label: "Cliente de la casa",
        kind: "sticker",
        description: "Sticker para perfiles que vuelven al kiosco.",
      },
      {
        flag: "skin_kiosk_neon",
        label: "Neon de kiosco",
        kind: "skin",
        description: "Detalle cosmetico para compras frecuentes.",
      },
    ],
    category: "kiosk",
    track: "kiosco",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 130,
  },
  "blackjack-streak": {
    id: "blackjack-streak",
    name: "Racha de Veintiuno",
    description: "Encadena victorias de blackjack sin volver a cero.",
    unlockHint: "Ganar 3 manos de blackjack seguidas en una misma visita/corrida.",
    flavor: "Las cartas dejan de crujir y empiezan a obedecer.",
    cosmeticFlag: "badge_blackjack_streak",
    cosmeticFlags: ["badge_blackjack_streak", "skin_card_sleeves_red"],
    cosmeticRewards: [
      {
        flag: "badge_blackjack_streak",
        label: "Racha 21",
        kind: "badge",
        description: "Insignia de dominio en el side-game de cartas.",
      },
      {
        flag: "skin_card_sleeves_red",
        label: "Fundas rojas",
        kind: "skin",
        description: "Cosmetico de cartas para rachas de blackjack.",
      },
    ],
    category: "cards",
    track: "cartas",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 140,
  },
  "contract-streak": {
    id: "contract-streak",
    name: "Letra Chica",
    description: "Llega a tener tres contratos activos en la misma corrida.",
    unlockHint: "Acumular 3 contratos activos al mismo tiempo.",
    flavor: "Cada firma deja una marca mas oscura que la anterior.",
    cosmeticFlag: "frame_contract_black",
    cosmeticFlags: ["frame_contract_black", "title_letra_chica"],
    cosmeticRewards: [
      {
        flag: "frame_contract_black",
        label: "Marco letra chica",
        kind: "frame",
        description: "Marco oscuro para perfiles con historial contractual.",
      },
      {
        flag: "title_letra_chica",
        label: "Letra chica",
        kind: "title",
        description: "Titulo para jugadores que sobreviven a varios contratos.",
      },
    ],
    category: "contracts",
    track: "contratos",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 150,
  },
  "parca-warded": {
    id: "parca-warded",
    name: "Marca Negada",
    description: "Limpia o evita una marca de la Parca.",
    unlockHint: "Sellar justo la celda marcada por Parca cuando no coincide con la bola actual.",
    flavor: "Por una ronda, la sombra pierde el dedo.",
    cosmeticFlag: "badge_parca_ward",
    cosmeticFlags: ["badge_parca_ward", "fx_ward_glow"],
    cosmeticRewards: [
      {
        flag: "badge_parca_ward",
        label: "Marca negada",
        kind: "badge",
        description: "Insignia por resistir la presion directa de la Parca.",
      },
      {
        flag: "fx_ward_glow",
        label: "Brillo de guarda",
        kind: "fx",
        description: "Efecto de proteccion contra marcas oscuras.",
      },
    ],
    category: "parca",
    track: "parca",
    rarity: "rare",
    points: 2,
    secret: false,
    sortOrder: 160,
  },
  "amulet-trinity": {
    id: "amulet-trinity",
    name: "Triada de Amuletos",
    description: "Reune tres amuletos o bonus permanentes compatibles.",
    unlockHint: "Tener 3 bonus permanentes (amuletos) en una misma corrida.",
    flavor: "Tres reliquias hacen ruido aunque las escondas.",
    cosmeticFlag: "charm_trinity_chain",
    cosmeticFlags: ["charm_trinity_chain", "fx_amulet_resonance"],
    cosmeticRewards: [
      {
        flag: "charm_trinity_chain",
        label: "Cadena triple",
        kind: "skin",
        description: "Cadena de amuletos para colecciones medianas.",
      },
      {
        flag: "fx_amulet_resonance",
        label: "Resonancia violeta",
        kind: "fx",
        description: "Efecto de coleccion cuando varios amuletos conviven.",
      },
    ],
    category: "amulets",
    track: "amuletos",
    rarity: "epic",
    points: 3,
    secret: false,
    sortOrder: 170,
  },
  "amulet-collector": {
    id: "amulet-collector",
    name: "El Coleccionista de Amuletos",
    description: "Reune una coleccion avanzada de amuletos en plena corrida.",
    unlockHint: "Tener 6 bonus permanentes (amuletos) antes de perder o ganar la run.",
    flavor: "La Parca no ve una mesa: ve un altar.",
    cosmeticFlag: "title_coleccionista_de_amuletos",
    cosmeticFlags: ["title_coleccionista_de_amuletos", "fx_amulet_constellation", "frame_relicario"],
    cosmeticRewards: [
      {
        flag: "title_coleccionista_de_amuletos",
        label: "Coleccionista de amuletos",
        kind: "title",
        description: "Titulo mayor para colecciones completas de reliquias.",
      },
      {
        flag: "fx_amulet_constellation",
        label: "Constelacion de amuletos",
        kind: "fx",
        description: "Efecto de coleccion avanzada para futuras pantallas.",
      },
      {
        flag: "frame_relicario",
        label: "Marco relicario",
        kind: "frame",
        description: "Marco premium ficcional para perfiles de coleccion.",
      },
    ],
    category: "amulets",
    track: "amuletos",
    rarity: "legendary",
    points: 5,
    secret: false,
    sortOrder: 180,
  },
};

const ACHIEVEMENT_IDS = (Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[]).sort(
  (left, right) => ACHIEVEMENT_DEFINITIONS[left].sortOrder - ACHIEVEMENT_DEFINITIONS[right].sortOrder,
);
const ACHIEVEMENT_ID_SET = new Set<AchievementId>(ACHIEVEMENT_IDS);

function nowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return fallback;
  return new Date(time).toISOString();
}

function sanitizeUnlocks(value: unknown, fallbackIso: string): AchievementUnlocks {
  if (!isObject(value)) return {};

  const unlocks: AchievementUnlocks = {};
  for (const id of ACHIEVEMENT_IDS) {
    const rawUnlock = value[id];
    if (!isObject(rawUnlock)) continue;

    const unlockedAt = asIsoDate(rawUnlock.unlockedAt, fallbackIso);
    unlocks[id] = { unlockedAt };
  }

  return unlocks;
}

function sanitizeCosmetics(value: unknown): ProfileCosmetics {
  if (!isObject(value)) return {};

  const cosmetics: ProfileCosmetics = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "boolean") {
      cosmetics[key] = raw;
    }
  }
  return cosmetics;
}

function cosmeticFlagsForDefinition(definition: AchievementDefinition): string[] {
  return Array.from(
    new Set(
      [
        definition.cosmeticFlag,
        ...(definition.cosmeticFlags ?? []),
        ...definition.cosmeticRewards.map((reward) => reward.flag),
      ].filter((flag): flag is string => typeof flag === "string" && flag.length > 0),
    ),
  );
}

function unlockDefinitionCosmetics(cosmetics: ProfileCosmetics, definition: AchievementDefinition): void {
  for (const flag of cosmeticFlagsForDefinition(definition)) {
    cosmetics[flag] = true;
  }
}

export function createDefaultProfile(now?: Date): LocalProfile {
  const iso = nowIso(now);
  return {
    version: 1,
    createdAt: iso,
    updatedAt: iso,
    achievements: {},
    cosmetics: {},
  };
}

export function sanitizeProfile(input: unknown, now?: Date): LocalProfile {
  const fallback = createDefaultProfile(now);
  if (!isObject(input)) return fallback;

  const createdAt = asIsoDate(input.createdAt, fallback.createdAt);
  const achievements = sanitizeUnlocks(input.achievements, createdAt);
  const cosmetics = sanitizeCosmetics(input.cosmetics);

  for (const [id, unlock] of Object.entries(achievements) as Array<[AchievementId, AchievementUnlock]>) {
    const definition = ACHIEVEMENT_DEFINITIONS[id];
    unlockDefinitionCosmetics(cosmetics, definition);
    unlock.unlockedAt = asIsoDate(unlock.unlockedAt, createdAt);
  }

  const latestUnlockMs = Math.max(
    Date.parse(createdAt),
    ...Object.values(achievements).map((unlock) => Date.parse(unlock.unlockedAt)),
  );

  const updatedAt = asIsoDate(
    input.updatedAt,
    Number.isFinite(latestUnlockMs) ? new Date(latestUnlockMs).toISOString() : createdAt,
  );

  return {
    version: 1,
    createdAt,
    updatedAt,
    achievements,
    cosmetics,
  };
}

export function loadProfile(storage: StorageLike, key = PROFILE_STORAGE_KEY, now?: Date): LocalProfile {
  try {
    const raw = storage.getItem(key);
    if (!raw) return createDefaultProfile(now);
    return sanitizeProfile(JSON.parse(raw), now);
  } catch {
    return createDefaultProfile(now);
  }
}

export function saveProfile(storage: StorageLike, profile: LocalProfile, key = PROFILE_STORAGE_KEY): LocalProfile {
  const sanitized = sanitizeProfile(profile);
  storage.setItem(key, JSON.stringify(sanitized));
  return sanitized;
}

export function listAchievementDefinitions(): AchievementDefinition[] {
  return ACHIEVEMENT_IDS.map((id) => ACHIEVEMENT_DEFINITIONS[id]);
}

export function listAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return listAchievementDefinitions().filter((definition) => definition.category === category);
}

export function unlockAchievements(
  profile: LocalProfile,
  ids: readonly AchievementId[],
  now?: Date,
): { profile: LocalProfile; newlyUnlocked: AchievementDefinition[] } {
  const base = sanitizeProfile(profile, now);
  const timestamp = nowIso(now);
  const achievements: AchievementUnlocks = { ...base.achievements };
  const cosmetics: ProfileCosmetics = { ...base.cosmetics };
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const id of ids) {
    if (!ACHIEVEMENT_ID_SET.has(id)) continue;
    if (achievements[id]) continue;

    achievements[id] = { unlockedAt: timestamp };
    const definition = ACHIEVEMENT_DEFINITIONS[id];
    newlyUnlocked.push(definition);
    unlockDefinitionCosmetics(cosmetics, definition);
  }

  if (newlyUnlocked.length === 0) {
    return { profile: base, newlyUnlocked: [] };
  }

  return {
    profile: {
      ...base,
      updatedAt: timestamp,
      achievements,
      cosmetics,
    },
    newlyUnlocked,
  };
}

export function listUnlockedAchievements(profile: LocalProfile): AchievementDefinition[] {
  const safe = sanitizeProfile(profile);
  return ACHIEVEMENT_IDS.filter((id) => Boolean(safe.achievements[id])).map((id) => ACHIEVEMENT_DEFINITIONS[id]);
}

export function listUnlocks(profile: LocalProfile): Array<AchievementDefinition & { unlockedAt: string }> {
  const safe = sanitizeProfile(profile);
  return ACHIEVEMENT_IDS.flatMap((id) => {
    const unlock = safe.achievements[id];
    if (!unlock) return [];
    return [{ ...ACHIEVEMENT_DEFINITIONS[id], unlockedAt: unlock.unlockedAt }];
  });
}

export function listRecentUnlocks(
  profile: LocalProfile,
  limit?: number,
): Array<AchievementDefinition & { unlockedAt: string }> {
  const safe = sanitizeProfile(profile);
  const unlocks = listUnlocks(safe).sort((a, b) => Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt));
  if (typeof limit !== "number" || !Number.isFinite(limit)) return unlocks;
  return unlocks.slice(0, Math.max(0, Math.floor(limit)));
}

export function listLockedAchievements(profile: LocalProfile): AchievementDefinition[] {
  const safe = sanitizeProfile(profile);
  return ACHIEVEMENT_IDS.filter((id) => !safe.achievements[id]).map((id) => ACHIEVEMENT_DEFINITIONS[id]);
}

export function listUnlockedCosmeticRewards(profile: LocalProfile): CosmeticRewardDefinition[] {
  const safe = sanitizeProfile(profile);
  const seen = new Set<string>();
  const rewards: CosmeticRewardDefinition[] = [];

  for (const definition of listUnlockedAchievements(safe)) {
    for (const reward of definition.cosmeticRewards) {
      if (seen.has(reward.flag)) continue;
      if (!safe.cosmetics[reward.flag]) continue;
      seen.add(reward.flag);
      rewards.push(reward);
    }
  }

  return rewards;
}

export function getProfileProgress(profile: LocalProfile): {
  total: number;
  unlocked: number;
  locked: number;
  percent: number;
} {
  const total = ACHIEVEMENT_IDS.length;
  const unlocked = listUnlockedAchievements(profile).length;
  const locked = total - unlocked;
  const percent = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  return { total, unlocked, locked, percent };
}

export function getProfilePointProgress(profile: LocalProfile): {
  total: number;
  unlocked: number;
  locked: number;
  percent: number;
} {
  const total = listAchievementDefinitions().reduce((sum, definition) => sum + definition.points, 0);
  const unlocked = listUnlockedAchievements(profile).reduce((sum, definition) => sum + definition.points, 0);
  const locked = total - unlocked;
  const percent = total === 0 ? 0 : Math.round((unlocked / total) * 100);

  return { total, unlocked, locked, percent };
}

export function getProfileProgressByCategory(profile: LocalProfile): Record<
  AchievementDefinition["category"],
  { total: number; unlocked: number; locked: number; percent: number }
> {
  const safe = sanitizeProfile(profile);
  const progress = ACHIEVEMENT_CATEGORIES.reduce(
    (buckets, category) => {
      buckets[category] = { total: 0, unlocked: 0, locked: 0, percent: 0 };
      return buckets;
    },
    {} as Record<AchievementDefinition["category"], { total: number; unlocked: number; locked: number; percent: number }>,
  );

  for (const id of ACHIEVEMENT_IDS) {
    const definition = ACHIEVEMENT_DEFINITIONS[id];
    const bucket = progress[definition.category];
    bucket.total += 1;
    if (safe.achievements[id]) {
      bucket.unlocked += 1;
    }
  }

  for (const category of Object.keys(progress) as Array<AchievementDefinition["category"]>) {
    const bucket = progress[category];
    bucket.locked = bucket.total - bucket.unlocked;
    bucket.percent = bucket.total === 0 ? 0 : Math.round((bucket.unlocked / bucket.total) * 100);
  }

  return progress;
}
