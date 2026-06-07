export type ContractId =
  | "kiosk-friend"
  | "thin-air"
  | "dirty-cash"
  | "diagonal-pact"
  | "parca-delay"
  | "tight-belt"
  | "lucky-rush"
  | "cold-math"
  | "double-edge"
  | "slow-gain"
  | "visitor-hour"
  | "asylum-oath";

export type RandomFn = () => number;

export type TableContract = {
  id: ContractId;
  label: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
  style: "economia" | "ritmo" | "riesgo" | "tablero" | "kiosco";
  tags: readonly string[];
};

export type NextTableCarry = {
  moneyDelta?: number;
  multiplierDelta?: number;
  parcaDecayDelta?: number;
  rowMoneyDelta?: number;
  diagonalMultiplierDelta?: number;
  shopItemCostDelta?: number;
  kioskOfferCapDelta?: number;
};

type NormalizedCarry = {
  moneyDelta: number;
  multiplierDelta: number;
  parcaDecayDelta: number;
  rowMoneyDelta: number;
  diagonalMultiplierDelta: number;
  shopItemCostDelta: number;
  kioskOfferCapDelta: number;
};

export const CONTRACTS: Record<ContractId, TableContract> = {
  "kiosk-friend": {
    id: "kiosk-friend",
    label: "Mostrador amigo",
    hint: "+1 oferta de kiosco. Mas opciones, misma deuda.",
    difficulty: "easy",
    style: "kiosco",
    tags: ["opciones", "kiosco"],
  },
  "thin-air": {
    id: "thin-air",
    label: "Aire prestado",
    hint: "+x0.2 al empezar la mesa, pero -$15.",
    difficulty: "medium",
    style: "ritmo",
    tags: ["multiplicador", "inicio"],
  },
  "dirty-cash": {
    id: "dirty-cash",
    label: "Billete sucio",
    hint: "+$35 al empezar la mesa, pero la Parca baja +x0.03 por bolilla.",
    difficulty: "hard",
    style: "riesgo",
    tags: ["dinero", "presion"],
  },
  "diagonal-pact": {
    id: "diagonal-pact",
    label: "Pacto cruzado",
    hint: "Diagonales dan +x0.2 adicional, filas pagan -$5.",
    difficulty: "medium",
    style: "tablero",
    tags: ["diagonal", "filas"],
  },
  "parca-delay": {
    id: "parca-delay",
    label: "Mora de la Parca",
    hint: "La Parca baja -x0.03 por bolilla, pero el kiosco cobra +$5.",
    difficulty: "medium",
    style: "ritmo",
    tags: ["defensivo", "kiosco-caro"],
  },
  "tight-belt": {
    id: "tight-belt",
    label: "Cinturon apretado",
    hint: "-$8 en items del kiosco, pero -$16 al empezar.",
    difficulty: "easy",
    style: "kiosco",
    tags: ["ahorro", "inicio-duro"],
  },
  "lucky-rush": {
    id: "lucky-rush",
    label: "Envion de suerte",
    hint: "+x0.1 al empezar y +$10 por fila, pero la Parca baja +x0.02 por bolilla.",
    difficulty: "hard",
    style: "riesgo",
    tags: ["agresivo", "presion"],
  },
  "cold-math": {
    id: "cold-math",
    label: "Calculo frio",
    hint: "Diagonales dan +x0.1 y la Parca baja -x0.01, pero -$5 por fila.",
    difficulty: "medium",
    style: "tablero",
    tags: ["tecnico", "control"],
  },
  "double-edge": {
    id: "double-edge",
    label: "Filo doble",
    hint: "+$20 al empezar y +x0.1 al empezar, pero items +$5.",
    difficulty: "medium",
    style: "economia",
    tags: ["aceleracion", "costo-tardio"],
  },
  "slow-gain": {
    id: "slow-gain",
    label: "Renta lenta",
    hint: "+$7 por fila, pero -x0.1 al empezar.",
    difficulty: "easy",
    style: "economia",
    tags: ["constante", "inicio-lento"],
  },
  "visitor-hour": {
    id: "visitor-hour",
    label: "Hora de visita",
    hint: "+1 oferta de kiosco y +$14 al empezar, pero items +$4.",
    difficulty: "medium",
    style: "kiosco",
    tags: ["opciones", "visita", "kiosco-caro"],
  },
  "asylum-oath": {
    id: "asylum-oath",
    label: "Juramento del asilo",
    hint: "La Parca baja -x0.02 por bolilla, pero filas pagan -$6.",
    difficulty: "medium",
    style: "ritmo",
    tags: ["defensivo", "filas", "asilo"],
  },
};

export const CONTRACT_IDS: ContractId[] = Object.keys(CONTRACTS) as ContractId[];

function toUniqueValidContractIds(ids: readonly string[]): ContractId[] {
  const seen = new Set<ContractId>();
  const result: ContractId[] = [];
  for (const id of ids) {
    if ((id as ContractId) in CONTRACTS) {
      const typed = id as ContractId;
      if (!seen.has(typed)) {
        seen.add(typed);
        result.push(typed);
      }
    }
  }
  return result;
}

function normalizeCarry(baseCarry: NextTableCarry): NormalizedCarry {
  return {
    moneyDelta: baseCarry.moneyDelta ?? 0,
    multiplierDelta: baseCarry.multiplierDelta ?? 0,
    parcaDecayDelta: baseCarry.parcaDecayDelta ?? 0,
    rowMoneyDelta: baseCarry.rowMoneyDelta ?? 0,
    diagonalMultiplierDelta: baseCarry.diagonalMultiplierDelta ?? 0,
    shopItemCostDelta: baseCarry.shopItemCostDelta ?? 0,
    kioskOfferCapDelta: baseCarry.kioskOfferCapDelta ?? 0,
  };
}

export function chooseContractOfferIds(
  ownedContractIds: readonly string[],
  activeContractIds: readonly string[],
  count: number,
  random: RandomFn,
): ContractId[] {
  const owned = new Set(toUniqueValidContractIds(ownedContractIds));
  const active = new Set(toUniqueValidContractIds(activeContractIds));
  const pool = CONTRACT_IDS.filter((id) => !owned.has(id) && !active.has(id));

  const picks: ContractId[] = [];
  const target = Math.max(0, Math.min(Math.floor(count), pool.length));

  while (picks.length < target && pool.length > 0) {
    const roll = random();
    const safeRoll = Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 0.9999999999) : 0;
    const index = Math.floor(safeRoll * pool.length);
    const [picked] = pool.splice(index, 1);
    picks.push(picked);
  }

  return picks;
}

export function applyContractEffectsToNextTable(
  baseCarry: NextTableCarry,
  activeContractIds: readonly string[],
): NextTableCarry {
  const carry = normalizeCarry(baseCarry);
  const active = toUniqueValidContractIds(activeContractIds);

  for (const id of active) {
    switch (id) {
      case "kiosk-friend":
        carry.kioskOfferCapDelta += 1;
        break;
      case "thin-air":
        carry.multiplierDelta += 0.2;
        carry.moneyDelta -= 15;
        break;
      case "dirty-cash":
        carry.moneyDelta += 35;
        carry.parcaDecayDelta += 0.03;
        break;
      case "diagonal-pact":
        carry.diagonalMultiplierDelta += 0.2;
        carry.rowMoneyDelta -= 5;
        break;
      case "parca-delay":
        carry.parcaDecayDelta -= 0.03;
        carry.shopItemCostDelta += 5;
        break;
      case "tight-belt":
        carry.shopItemCostDelta -= 8;
        carry.moneyDelta -= 16;
        break;
      case "lucky-rush":
        carry.multiplierDelta += 0.1;
        carry.rowMoneyDelta += 10;
        carry.parcaDecayDelta += 0.02;
        break;
      case "cold-math":
        carry.diagonalMultiplierDelta += 0.1;
        carry.parcaDecayDelta -= 0.01;
        carry.rowMoneyDelta -= 5;
        break;
      case "double-edge":
        carry.moneyDelta += 20;
        carry.multiplierDelta += 0.1;
        carry.shopItemCostDelta += 5;
        break;
      case "slow-gain":
        carry.rowMoneyDelta += 7;
        carry.multiplierDelta -= 0.1;
        break;
      case "visitor-hour":
        carry.kioskOfferCapDelta += 1;
        carry.moneyDelta += 14;
        carry.shopItemCostDelta += 4;
        break;
      case "asylum-oath":
        carry.parcaDecayDelta -= 0.02;
        carry.rowMoneyDelta -= 6;
        break;
    }
  }

  return carry;
}

export function getContractLabel(contractId: ContractId): string {
  return CONTRACTS[contractId].label;
}

export function getContractHint(contractId: ContractId): string {
  return CONTRACTS[contractId].hint;
}

export function getContractDifficulty(contractId: ContractId): TableContract["difficulty"] {
  return CONTRACTS[contractId].difficulty;
}

export function getContractStyle(contractId: ContractId): TableContract["style"] {
  return CONTRACTS[contractId].style;
}

export function getContractTags(contractId: ContractId): readonly string[] {
  return CONTRACTS[contractId].tags;
}
