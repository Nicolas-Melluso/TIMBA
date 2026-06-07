import type { ContractId, TableContract } from "./contracts.js";
import type { PatternKind, PermanentBonusId, ShopItemId, TableId } from "./types.js";

export type RunArchetypeId = "control-del-asilo" | "kiosquero-de-hierro" | "ritual-de-riesgo" | "economia-fria";
export type BuildIdentityId = "trampa-dirigida" | "fila-constante" | "diagonal-clutch" | "timing-kiosco";
export type SecretHookId = "marca-fantasma" | "deuda-silente" | "hora-ciega";
export type FutureBossId = "hija-del-pozo" | "contador-de-luto" | "gemelas-del-sello";

export type RunArchetype = {
  id: RunArchetypeId;
  label: string;
  fantasy: string;
  playstyle: "control" | "tempo" | "economy" | "high-risk";
  suitableTables: readonly TableId[];
  preferredPatternKinds: readonly PatternKind[];
  favoredContractStyles: readonly TableContract["style"][];
  starterContractPriority: readonly ContractId[];
  starterShopPriority: readonly ShopItemId[];
  starterBonusPriority: readonly PermanentBonusId[];
  antiPatterns: readonly string[];
  progressionNotes: readonly string[];
};

export type BuildIdentity = {
  id: BuildIdentityId;
  label: string;
  coreLoop: string;
  requiredBonuses: readonly PermanentBonusId[];
  supportingContracts: readonly ContractId[];
  supportingItems: readonly ShopItemId[];
  trigger: {
    minRound: number;
    preferredTableIds: readonly TableId[];
  };
  payoff: {
    scoreBias: "lines" | "diagonals" | "board-closure" | "survival";
    moneyBias: "early" | "mid" | "late";
    parcaPressurePlan: "stall" | "burst" | "accept";
  };
};

export type SecretHook = {
  id: SecretHookId;
  codename: string;
  revealHint: string;
  prerequisites: {
    tableIds: readonly TableId[];
    requiredContracts: readonly ContractId[];
    requiredBonuses: readonly PermanentBonusId[];
    minimumScore: number;
  };
  effectTease: string;
  futureUse: "run-modifier" | "boss-variant" | "meta-unlock";
};

export type FutureBossBlueprint = {
  id: FutureBossId;
  label: string;
  title: string;
  intendedTableId: TableId;
  pressureModel: {
    target: number;
    advanceMin: number;
    advanceMax: number;
    decaySpikeRounds: readonly number[];
  };
  behaviors: readonly string[];
  counterBuildTags: readonly BuildIdentityId[];
  rewardHooks: readonly SecretHookId[];
};

export const RUN_ARCHETYPES: Record<RunArchetypeId, RunArchetype> = {
  "control-del-asilo": {
    id: "control-del-asilo",
    label: "Control del asilo",
    fantasy: "Mesa prolija, Parca lenta y cierre por lectura del tablero.",
    playstyle: "control",
    suitableTables: ["asilo-inicio", "asilo-patio", "asilo-tv"],
    preferredPatternKinds: ["row", "diagonal"],
    favoredContractStyles: ["ritmo", "tablero"],
    starterContractPriority: ["parca-delay", "cold-math", "asylum-oath"],
    starterShopPriority: ["strong-coffee", "fuzzy-stamp", "swap-cells"],
    starterBonusPriority: ["slow-death", "cross-charm", "quick-ritual"],
    antiPatterns: ["Forzar bolilla temprano sin cash", "Quemar kiosco sin plan de fila"],
    progressionNotes: ["Entrar al bar con control de diagonales", "Guardar dinero para activar ritual veloz en mesa 4+"],
  },
  "kiosquero-de-hierro": {
    id: "kiosquero-de-hierro",
    label: "Kiosquero de hierro",
    fantasy: "Run centrada en descuentos, rotacion y abuso del mostrador.",
    playstyle: "economy",
    suitableTables: ["asilo-patio", "asilo-tv", "bar", "boss"],
    preferredPatternKinds: ["row", "quick"],
    favoredContractStyles: ["kiosco", "economia"],
    starterContractPriority: ["kiosk-friend", "tight-belt", "visitor-hour"],
    starterShopPriority: ["force-ball", "erase-bad-call", "fuzzy-stamp"],
    starterBonusPriority: ["kiosk-amulet", "wide-kiosk", "marked-cage"],
    antiPatterns: ["Comprar por impulso sin objetivo de casilla", "Olvidar multiplicador por foco en costos"],
    progressionNotes: ["Escalar a 4 ofertas antes de mesa final", "Combinar Acta quemada con bolilla soplada para clutch"],
  },
  "ritual-de-riesgo": {
    id: "ritual-de-riesgo",
    label: "Ritual de riesgo",
    fantasy: "Acelerar score temprano aceptando presion de Parca.",
    playstyle: "high-risk",
    suitableTables: ["asilo-inicio", "bar", "boss"],
    preferredPatternKinds: ["quick", "full"],
    favoredContractStyles: ["riesgo", "ritmo"],
    starterContractPriority: ["dirty-cash", "lucky-rush", "thin-air"],
    starterShopPriority: ["force-ball", "strong-coffee", "erase-bad-call"],
    starterBonusPriority: ["dirty-ledger", "house-amulet", "heavy-stamp"],
    antiPatterns: ["Sobrevivir sin plan de salida", "Entrar al boss sin reserva para cafe"],
    progressionNotes: ["Pico de riesgo en ronda 2-4", "Moverse a cierre de tablero cuando x cae por debajo de 1.4"],
  },
  "economia-fria": {
    id: "economia-fria",
    label: "Economia fria",
    fantasy: "Ruta estable de fila + caja para sostener runs largas.",
    playstyle: "tempo",
    suitableTables: ["tutorial", "asilo-inicio", "asilo-tv", "bar"],
    preferredPatternKinds: ["row", "full"],
    favoredContractStyles: ["economia", "tablero"],
    starterContractPriority: ["slow-gain", "double-edge", "diagonal-pact"],
    starterShopPriority: ["swap-cells", "bump-number", "lower-number"],
    starterBonusPriority: ["lucky-cup", "dirty-ledger", "heavy-stamp"],
    antiPatterns: ["Perseguir diagonales sin soporte", "Ignorar clutch de cierre completo"],
    progressionNotes: ["Priorizar estabilidad de cash en mesas 1-3", "Migrar a board-closure al entrar a boss"],
  },
};

export const BUILD_IDENTITIES: Record<BuildIdentityId, BuildIdentity> = {
  "trampa-dirigida": {
    id: "trampa-dirigida",
    label: "Trampa dirigida",
    coreLoop: "Direccionar celdas con sello viudo + swap para cerrar linea en ventanas cortas.",
    requiredBonuses: ["blurred-sigil", "marked-cage"],
    supportingContracts: ["kiosk-friend", "visitor-hour"],
    supportingItems: ["fuzzy-stamp", "swap-cells", "force-ball"],
    trigger: {
      minRound: 2,
      preferredTableIds: ["asilo-patio", "asilo-tv", "bar"],
    },
    payoff: {
      scoreBias: "lines",
      moneyBias: "mid",
      parcaPressurePlan: "stall",
    },
  },
  "fila-constante": {
    id: "fila-constante",
    label: "Fila constante",
    coreLoop: "Cobrar filas en cadena para financiar supervivencia y upgrades.",
    requiredBonuses: ["lucky-cup", "quick-ritual"],
    supportingContracts: ["slow-gain", "double-edge"],
    supportingItems: ["strong-coffee", "erase-bad-call"],
    trigger: {
      minRound: 1,
      preferredTableIds: ["asilo-inicio", "asilo-tv", "bar"],
    },
    payoff: {
      scoreBias: "lines",
      moneyBias: "early",
      parcaPressurePlan: "accept",
    },
  },
  "diagonal-clutch": {
    id: "diagonal-clutch",
    label: "Diagonal clutch",
    coreLoop: "Sostener la run y cerrar diagonales cuando el multiplicador esta al limite.",
    requiredBonuses: ["cross-charm", "slow-death"],
    supportingContracts: ["diagonal-pact", "cold-math", "asylum-oath"],
    supportingItems: ["swap-cells", "bump-number", "lower-number"],
    trigger: {
      minRound: 3,
      preferredTableIds: ["asilo-tv", "bar", "boss"],
    },
    payoff: {
      scoreBias: "diagonals",
      moneyBias: "late",
      parcaPressurePlan: "burst",
    },
  },
  "timing-kiosco": {
    id: "timing-kiosco",
    label: "Timing kiosco",
    coreLoop: "Guardar plata, pivotear en kiosco y gastar solo en ventana de conversion.",
    requiredBonuses: ["kiosk-amulet", "wide-kiosk"],
    supportingContracts: ["tight-belt", "kiosk-friend", "visitor-hour"],
    supportingItems: ["force-ball", "erase-bad-call", "fuzzy-stamp"],
    trigger: {
      minRound: 2,
      preferredTableIds: ["asilo-patio", "bar", "boss"],
    },
    payoff: {
      scoreBias: "survival",
      moneyBias: "mid",
      parcaPressurePlan: "stall",
    },
  },
};

export const SECRET_HOOKS: Record<SecretHookId, SecretHook> = {
  "marca-fantasma": {
    id: "marca-fantasma",
    codename: "Marca fantasma",
    revealHint: "Aparece cuando una diagonal clutch se cierra sin usar cafe en mesa 4+.",
    prerequisites: {
      tableIds: ["bar", "boss"],
      requiredContracts: ["cold-math"],
      requiredBonuses: ["cross-charm"],
      minimumScore: 340,
    },
    effectTease: "Una marca extra puede sobrevivir una bolilla no favorable.",
    futureUse: "run-modifier",
  },
  "deuda-silente": {
    id: "deuda-silente",
    codename: "Deuda silente",
    revealHint: "Se insinua al encadenar 3 compras de kiosco con saldo final positivo.",
    prerequisites: {
      tableIds: ["asilo-tv", "bar"],
      requiredContracts: ["tight-belt", "visitor-hour"],
      requiredBonuses: ["kiosk-amulet"],
      minimumScore: 260,
    },
    effectTease: "El siguiente contrato puede salir con costo oculto y recompensa doble.",
    futureUse: "meta-unlock",
  },
  "hora-ciega": {
    id: "hora-ciega",
    codename: "Hora ciega",
    revealHint: "Surge al ganar una mesa con x<1.0 y sin acta quemada.",
    prerequisites: {
      tableIds: ["bar", "boss"],
      requiredContracts: ["dirty-cash"],
      requiredBonuses: ["slow-death"],
      minimumScore: 300,
    },
    effectTease: "La Parca alterna un turno lento con un turno agresivo.",
    futureUse: "boss-variant",
  },
};

export const FUTURE_BOSS_BLUEPRINTS: Record<FutureBossId, FutureBossBlueprint> = {
  "hija-del-pozo": {
    id: "hija-del-pozo",
    label: "Hija del pozo",
    title: "Viene por las mesas que juegan a controlar demasiado.",
    intendedTableId: "boss",
    pressureModel: {
      target: 185,
      advanceMin: 3,
      advanceMax: 5,
      decaySpikeRounds: [3, 6, 9],
    },
    behaviors: ["Niega un sello dirigido cada 2 rondas", "Aumenta decay si detecta cash alto sin gastar"],
    counterBuildTags: ["timing-kiosco", "trampa-dirigida"],
    rewardHooks: ["deuda-silente"],
  },
  "contador-de-luto": {
    id: "contador-de-luto",
    label: "Contador de luto",
    title: "Premia eficiencia, castiga improvisacion.",
    intendedTableId: "boss",
    pressureModel: {
      target: 175,
      advanceMin: 2,
      advanceMax: 4,
      decaySpikeRounds: [4, 8],
    },
    behaviors: ["Duplica castigo por bolilla inutil", "Reduce payout de fila si se repite patron"],
    counterBuildTags: ["fila-constante", "diagonal-clutch"],
    rewardHooks: ["marca-fantasma"],
  },
  "gemelas-del-sello": {
    id: "gemelas-del-sello",
    label: "Gemelas del sello",
    title: "Dos ritmos de Parca en una sola mesa final.",
    intendedTableId: "boss",
    pressureModel: {
      target: 190,
      advanceMin: 2,
      advanceMax: 6,
      decaySpikeRounds: [2, 5, 7, 10],
    },
    behaviors: ["Alterna ronda de control y ronda de caos", "Bloquea el kiosco cada tercera visita"],
    counterBuildTags: ["trampa-dirigida", "fila-constante"],
    rewardHooks: ["hora-ciega", "marca-fantasma"],
  },
};

export const RUN_ARCHETYPE_IDS: RunArchetypeId[] = Object.keys(RUN_ARCHETYPES) as RunArchetypeId[];
export const BUILD_IDENTITY_IDS: BuildIdentityId[] = Object.keys(BUILD_IDENTITIES) as BuildIdentityId[];
export const SECRET_HOOK_IDS: SecretHookId[] = Object.keys(SECRET_HOOKS) as SecretHookId[];
export const FUTURE_BOSS_IDS: FutureBossId[] = Object.keys(FUTURE_BOSS_BLUEPRINTS) as FutureBossId[];
