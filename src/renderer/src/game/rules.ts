import { applyBlackjackPayout } from "./blackjack.js";
import {
  MULTIPLIER_DECAY_PER_BALL,
  PERMANENT_BONUSES,
  ROUND_SECONDS,
  SHOP_ITEMS,
  STARTING_MULTIPLIER,
  TABLE_CONFIGS
} from "./config.js";
import {
  applyContractEffectsToNextTable,
  chooseContractOfferIds
} from "./contracts.js";
import type { ContractId } from "./contracts.js";
import type {
  BoardCell,
  BossAction,
  BossState,
  DirectedShopItemId,
  PermanentBonusId,
  ParcaMark,
  PatternReward,
  RandomFn,
  RunState,
  ShopUsageCheck,
  ShopItemId,
  TableConfig
} from "./types.js";

const PARCA_MARK_THRESHOLD = 1.12;
const PARCA_MARK_PENALTY = 0.08;
const PARCA_MARK_RECOVERY = 0.05;

export function createInitialRun(random: RandomFn = Math.random): RunState {
  return createMenuState(random);
}

export function createMenuState(random: RandomFn = Math.random): RunState {
  return {
    ...createTableState(0, random, {
      score: 0,
      multiplier: STARTING_MULTIPLIER,
      ownedBonusIds: []
    }),
    phase: "menu",
    currentBall: null,
    calledBalls: [],
    round: 0,
    lastMessage: "TIMBA! espera una mesa."
  };
}

export function createTutorialRun(random: RandomFn = Math.random): RunState {
  return createTableState(0, random, {
    score: 0,
    multiplier: STARTING_MULTIPLIER,
    ownedBonusIds: []
  });
}

export function createPlayRun(random: RandomFn = Math.random): RunState {
  return createTableState(1, random, {
    score: 0,
    multiplier: STARTING_MULTIPLIER,
    ownedBonusIds: []
  });
}

export function createTableState(
  tableIndex: number,
  random: RandomFn = Math.random,
  carry?: {
    score: number;
    multiplier: number;
    money?: number;
    ownedBonusIds?: PermanentBonusId[];
    activeContractIds?: ContractId[];
  }
): RunState {
  const config = TABLE_CONFIGS[tableIndex];
  if (!config) {
    throw new Error(`Unknown table index ${tableIndex}`);
  }

  return {
    phase: config.isTutorial ? "tutorial" : "table",
    tableIndex,
    board: createBoard(config, random),
    calledBalls: [],
    currentBall: null,
    forcedBall: null,
    selectedCellId: null,
    swapFirstCellId: null,
    swapMode: false,
    fuzzyStampMode: false,
    money: carry?.money ?? config.startingMoney,
    score: carry?.score ?? 0,
    multiplier: carry?.multiplier ?? STARTING_MULTIPLIER,
    round: 0,
    kioskSeconds: ROUND_SECONDS,
    kioskOfferRound: null,
    shopOfferIds: [],
    upgradeOfferIds: [],
    ownedBonusIds: carry?.ownedBonusIds ?? [],
    contractOfferIds: [],
    activeContractIds: carry?.activeContractIds ?? [],
    scoredPatternIds: new Set<string>(),
    recentRewards: [],
    tutorialStep: 0,
    pendingShopAction: null,
    blackjackPlayedThisVisit: false,
    blackjack: null,
    boss: createBossState(config),
    bossAction: null,
    parcaMark: null,
    lastMessage: config.isTutorial ? tutorialStepMessage(0) : "La mesa espera la primera bolilla.",
    lostReason: ""
  };
}

export function createBoard(config: TableConfig, random: RandomFn = Math.random): BoardCell[] {
  const pool = range(config.ballMin, config.ballMax);
  shuffle(pool, random);
  const values = pool.slice(0, config.boardSize * config.boardSize);

  return values.map((value, id) => ({
    id,
    row: Math.floor(id / config.boardSize),
    col: id % config.boardSize,
    value,
    marked: false
  }));
}

export function drawNextBall(state: RunState, random: RandomFn = Math.random, options?: { free?: boolean }): RunState {
  const resolvedMark = options?.free ? state : resolveExpiredParcaMark(state);
  if (resolvedMark.phase === "lost") {
    return resolvedMark;
  }

  const hadExpiredMark = Boolean(state.parcaMark);
  const blockMarkSpawn = hadExpiredMark || Boolean(options?.free);
  const config = TABLE_CONFIGS[resolvedMark.tableIndex];
  const available = range(config.ballMin, config.ballMax).filter((value) => !resolvedMark.calledBalls.includes(value));
  if (available.length === 0) {
    return { ...resolvedMark, phase: "lost", lostReason: "No quedan bolillas en el bolillero." };
  }

  const forced = resolvedMark.forcedBall !== null && available.includes(resolvedMark.forcedBall) ? resolvedMark.forcedBall : null;
  const currentBall = forced ?? pick(available, random);
  const boss = options?.free ? resolvedMark.boss : resolvedMark.boss ? advanceBoss(resolvedMark.boss, config, random) : null;
  const contractCarry = applyContractEffectsToNextTable({}, resolvedMark.activeContractIds);
  const slowDeathDelta = resolvedMark.ownedBonusIds.includes("slow-death") ? -0.06 : 0;
  const multiplierDecay = options?.free
    ? 0
    : Math.max(0.03, MULTIPLIER_DECAY_PER_BALL + contractCarry.parcaDecayDelta! + slowDeathDelta);
  const multiplier = roundMultiplier(Math.max(0, resolvedMark.multiplier - multiplierDecay));
  const nextState: RunState = {
    ...resolvedMark,
    phase: resolvedMark.phase === "tutorial" ? "tutorial" : "table",
    currentBall,
    forcedBall: null,
    calledBalls: [...resolvedMark.calledBalls, currentBall],
    round: resolvedMark.round + 1,
    multiplier,
    boss,
    bossAction: null,
    parcaMark: null,
    kioskOfferRound: null,
    shopOfferIds: [],
    kioskSeconds: ROUND_SECONDS,
    blackjackPlayedThisVisit: false,
    pendingShopAction: null,
    swapMode: false,
    fuzzyStampMode: false,
    swapFirstCellId: null,
    recentRewards: [],
    lastMessage: calledBallMessage(resolvedMark.board, currentBall, Boolean(options?.free))
  };

  if (boss && boss.progress >= boss.target) {
    return { ...nextState, phase: "lost", lostReason: `${boss.name} canto TIMBA! antes que vos.` };
  }

  if (multiplier <= 0) {
    return { ...nextState, phase: "lost", lostReason: "La Parca llego a x0.0." };
  }

  if (boss && nextState.round % 3 === 0) {
    return maybeSpawnParcaMark(applyBossCheat(nextState, random), random, blockMarkSpawn);
  }

  return maybeSpawnParcaMark(nextState, random, blockMarkSpawn);
}

export function drawGuidedTutorialBall(state: RunState): RunState {
  const next = state.board.find((cell) => !cell.marked);
  if (!next) {
    return state;
  }

  return {
    ...state,
    currentBall: next.value,
    calledBalls: state.calledBalls.includes(next.value) ? state.calledBalls : [...state.calledBalls, next.value],
    round: state.round + 1,
    recentRewards: [],
    bossAction: null,
    lastMessage: `Bolilla guiada: ${next.value}.`
  };
}

export function markMatchingCell(state: RunState, cellId: number, quickSecondsRemaining = 0): RunState {
  const cell = state.board.find((candidate) => candidate.id === cellId);
  if (!cell) {
    return {
      ...state,
      selectedCellId: cellId,
      lastMessage: "Esa casilla no existe en este carton."
    };
  }
  if (cell.marked) {
    return {
      ...state,
      selectedCellId: cellId,
      lastMessage: `El ${cell.value} ya esta sellado.`
    };
  }
  if (state.currentBall === null) {
    return {
      ...state,
      selectedCellId: cellId,
      lastMessage: "Todavia no hay bolilla cantada."
    };
  }
  if (state.currentBall !== cell.value) {
    return {
      ...state,
      selectedCellId: cellId,
      lastMessage: `La bolilla cantada es ${state.currentBall}; el ${cell.value} no se puede sellar.`
    };
  }

  const board = state.board.map((candidate) =>
    candidate.id === cellId ? { ...candidate, marked: true, dirty: candidate.dirty } : candidate
  );

  const marked = applyMarkRewards({
    ...state,
    board,
    parcaMark: state.parcaMark?.cellId === cellId ? null : state.parcaMark,
    selectedCellId: cellId,
    score: state.score + Math.round((12 + stampBonus(state)) * Math.max(state.multiplier, 0.1)),
    lastMessage: `Sellaste el ${cell.value}.`
  }, quickStampReward(state, quickSecondsRemaining));

  if (state.parcaMark?.cellId !== cellId) {
    return marked;
  }

  return {
    ...marked,
    multiplier: roundMultiplier(marked.multiplier + PARCA_MARK_RECOVERY),
    lastMessage: `Sellaste la Marca de la Parca: respiras x${roundMultiplier(marked.multiplier + PARCA_MARK_RECOVERY).toFixed(1)}.`
  };
}

export function wardParcaMark(state: RunState, cellId: number): RunState {
  if (!state.parcaMark || state.parcaMark.cellId !== cellId) {
    return state;
  }

  const target = state.board.find((cell) => cell.id === cellId);
  return {
    ...state,
    selectedCellId: cellId,
    parcaMark: null,
    multiplier: roundMultiplier(state.multiplier + PARCA_MARK_RECOVERY),
    lastMessage: target
      ? `Ahuyentaste la Marca de la Parca del ${target.value}: +x${PARCA_MARK_RECOVERY.toFixed(2)}.`
      : `Ahuyentaste la Marca de la Parca: +x${PARCA_MARK_RECOVERY.toFixed(2)}.`
  };
}

export function fuzzyStampCell(state: RunState, cellId: number): RunState {
  const cell = state.board.find((candidate) => candidate.id === cellId);
  if (!cell || cell.marked) {
    return state;
  }

  const board = state.board.map((candidate) =>
    candidate.id === cellId ? { ...candidate, marked: true, dirty: true } : candidate
  );

  let next = applyMarkRewards({
    ...state,
    board,
    parcaMark: state.parcaMark?.cellId === cellId ? null : state.parcaMark,
    selectedCellId: cellId,
    fuzzyStampMode: false,
    phase: "table",
    score: state.score + Math.round((8 + stampBonus(state)) * Math.max(state.multiplier, 0.1)),
    lastMessage: `Sello borroso sobre el ${cell.value}.`
  });

  if (state.ownedBonusIds.includes("blurred-sigil")) {
    const sigilReward: PatternReward = {
      id: `blurred-sigil-${cell.id}-${state.round}`,
      kind: "quick",
      label: "Sigilo borroso",
      score: 0,
      money: 8,
      multiplier: 0.1
    };
    next = {
      ...next,
      money: next.money + sigilReward.money,
      multiplier: roundMultiplier(next.multiplier + sigilReward.multiplier),
      recentRewards: [...next.recentRewards, sigilReward],
      lastMessage: `${next.lastMessage} El sigilo borroso suma +$8 y x0.1.`
    };
  }

  return next;
}

export function swapCells(state: RunState, firstId: number, secondId: number): RunState {
  if (firstId === secondId) {
    return state;
  }

  const first = state.board.find((cell) => cell.id === firstId);
  const second = state.board.find((cell) => cell.id === secondId);
  if (!first || !second) {
    return state;
  }

  const board = state.board.map((cell) => {
    if (cell.id === firstId) {
      return { ...cell, value: second.value, dirty: true };
    }
    if (cell.id === secondId) {
      return { ...cell, value: first.value, dirty: true };
    }
    return cell;
  });

  return applyMarkRewards({
    ...state,
    board,
    swapMode: false,
    swapFirstCellId: null,
    selectedCellId: secondId,
    lastMessage: "Cambiaste dos numeros de lugar."
  });
}

export function bumpCellNumber(state: RunState, cellId: number): RunState {
  const config = TABLE_CONFIGS[state.tableIndex];
  const cell = state.board.find((candidate) => candidate.id === cellId);
  if (!cell || cell.marked || cell.value >= config.ballMax) {
    return { ...state, lastMessage: "Ese numero no se puede subir." };
  }

  const nextValue = cell.value + 1;
  if (state.board.some((candidate) => candidate.id !== cellId && candidate.value === nextValue)) {
    return { ...state, lastMessage: "El siguiente numero ya esta en el carton." };
  }

  const board = state.board.map((candidate) =>
    candidate.id === cellId ? { ...candidate, value: nextValue, dirty: true } : candidate
  );

  return {
    ...state,
    board,
    selectedCellId: cellId,
    lastMessage: `Subiste ${cell.value} a ${nextValue}.`
  };
}

export function lowerCellNumber(state: RunState, cellId: number): RunState {
  const config = TABLE_CONFIGS[state.tableIndex];
  const cell = state.board.find((candidate) => candidate.id === cellId);
  if (!cell || cell.marked || cell.value <= config.ballMin) {
    return { ...state, lastMessage: "Ese numero no se puede bajar." };
  }

  const nextValue = cell.value - 1;
  if (state.board.some((candidate) => candidate.id !== cellId && candidate.value === nextValue)) {
    return { ...state, lastMessage: "El numero anterior ya esta en el carton." };
  }

  const board = state.board.map((candidate) =>
    candidate.id === cellId ? { ...candidate, value: nextValue, dirty: true } : candidate
  );

  return {
    ...state,
    board,
    selectedCellId: cellId,
    lastMessage: `Bajaste ${cell.value} a ${nextValue}.`
  };
}

export function forceNextUsefulBall(state: RunState, random: RandomFn = Math.random): RunState {
  const candidates = state.board
    .filter((cell) => !cell.marked && !state.calledBalls.includes(cell.value))
    .map((cell) => cell.value);

  if (candidates.length === 0) {
    return { ...state, forcedBall: null, lastMessage: "No quedan numeros utiles para forzar." };
  }

  return {
    ...state,
    forcedBall: pick(candidates, random),
    lastMessage: "La proxima bolilla viene arreglada."
  };
}

export function eraseLastBadCall(state: RunState): RunState {
  const last = state.calledBalls[state.calledBalls.length - 1];
  if (last === undefined) {
    return { ...state, lastMessage: "Todavia no hay bolillas para borrar." };
  }

  const useful = state.board.some((cell) => !cell.marked && cell.value === last);
  if (useful) {
    return { ...state, lastMessage: "Esa bolilla todavia sirve. Nadie la borra." };
  }

  const calledBalls = state.calledBalls.slice(0, -1);
  return {
    ...state,
    calledBalls,
    currentBall: calledBalls.at(-1) ?? null,
    multiplier: roundMultiplier(state.multiplier + 0.15),
    lastMessage: `Borraste la bolilla inutil ${last}.`
  };
}

export function enterKiosk(state: RunState, random: RandomFn = Math.random): RunState {
  const contractCarry = applyContractEffectsToNextTable({}, state.activeContractIds);
  const offerCount = Math.min(5, (state.ownedBonusIds.includes("wide-kiosk") ? 4 : 3) + contractCarry.kioskOfferCapDelta!);
  const hasCurrentOffers = state.kioskOfferRound === state.round && state.shopOfferIds.length > 0;
  return {
    ...state,
    phase: "kiosk",
    kioskSeconds: hasCurrentOffers ? state.kioskSeconds : ROUND_SECONDS,
    kioskOfferRound: state.round,
    shopOfferIds: hasCurrentOffers ? state.shopOfferIds : chooseShopOfferIds(offerCount, random),
    recentRewards: [],
    blackjackPlayedThisVisit: hasCurrentOffers ? state.blackjackPlayedThisVisit : false,
    blackjack: null,
    swapMode: false,
    fuzzyStampMode: false,
    swapFirstCellId: null,
    pendingShopAction: null,
    lastMessage: "El kiosco abre por 20 segundos."
  };
}

export function leaveKiosk(state: RunState): RunState {
  return {
    ...state,
    phase: "table",
    blackjack: null,
    recentRewards: [],
    pendingShopAction: null,
    lastMessage: "La mesa vuelve a girar."
  };
}

export function startPendingShopAction(state: RunState, itemId: DirectedShopItemId, cost: number): RunState {
  return {
    ...state,
    phase: "table",
    pendingShopAction: { itemId, cost, firstCellId: null },
    swapMode: false,
    fuzzyStampMode: false,
    swapFirstCellId: null,
    selectedCellId: null,
    lastMessage: pendingShopActionMessage(itemId)
  };
}

export function cancelPendingShopAction(state: RunState): RunState {
  return {
    ...state,
    phase: "kiosk",
    pendingShopAction: null,
    selectedCellId: null,
    lastMessage: "Cancelaste la trampa. El mostrador sigue igual."
  };
}

export function isDirectedShopItem(itemId: ShopItemId): itemId is DirectedShopItemId {
  return itemId === "fuzzy-stamp" || itemId === "swap-cells" || itemId === "bump-number" || itemId === "lower-number";
}

export function chooseShopOfferIds(count: number, random: RandomFn = Math.random): ShopItemId[] {
  const ids = SHOP_ITEMS.map((item) => item.id);
  shuffle(ids, random);
  return ids.slice(0, Math.min(count, ids.length));
}

export function canSpend(state: RunState, cost: number): boolean {
  return state.money >= cost;
}

export function spend(state: RunState, cost: number): RunState {
  if (!canSpend(state, cost)) {
    return { ...state, lastMessage: "No te alcanza la plata ficticia." };
  }
  return { ...state, money: state.money - cost };
}

export function adjustedShopCost(state: RunState, itemId: ShopItemId, baseCost: number): number {
  let adjusted = baseCost;
  if (itemId === "force-ball" && state.ownedBonusIds.includes("marked-cage")) {
    adjusted -= 10;
  }
  if (state.ownedBonusIds.includes("kiosk-amulet")) {
    adjusted -= 5;
  }
  const contractCarry = applyContractEffectsToNextTable({}, state.activeContractIds);
  adjusted += contractCarry.shopItemCostDelta!;
  return Math.max(5, adjusted);
}

export function blockedShopMessage(state: RunState, itemId: ShopItemId): string | null {
  if (itemId === "fuzzy-stamp") {
    const selected = selectedCell(state);
    if (!selected) {
      return "Primero elegi una casilla del carton.";
    }
    return selected.marked ? "Esa casilla ya esta marcada." : null;
  }

  if (itemId === "bump-number") {
    const selected = selectedCell(state);
    const table = TABLE_CONFIGS[state.tableIndex];
    if (!selected) {
      return "Primero elegi una casilla del carton.";
    }
    if (selected.marked || selected.value >= table.ballMax) {
      return "Ese numero no se puede subir.";
    }
    if (state.board.some((cell) => cell.id !== selected.id && cell.value === selected.value + 1)) {
      return "El siguiente numero ya esta en el carton.";
    }
    return null;
  }

  if (itemId === "force-ball") {
    const candidates = state.board.filter((cell) => !cell.marked && !state.calledBalls.includes(cell.value));
    return candidates.length === 0 ? "No quedan numeros utiles para forzar." : null;
  }

  if (itemId === "erase-bad-call") {
    const last = state.calledBalls[state.calledBalls.length - 1];
    if (last === undefined) {
      return "Todavia no hay bolillas para borrar.";
    }
    const useful = state.board.some((cell) => !cell.marked && cell.value === last);
    return useful ? "Esa bolilla todavia sirve. Nadie la borra." : null;
  }

  return null;
}

export function canUseShopItem(state: RunState, itemId: ShopItemId): ShopUsageCheck {
  const blocked = blockedShopMessage(state, itemId);
  return { allowed: blocked === null, blockedMessage: blocked };
}

export function applyImmediateShopItem(
  state: RunState,
  itemId: ShopItemId,
  cost: number,
  random: RandomFn = Math.random
): RunState {
  if (isDirectedShopItem(itemId)) {
    return startPendingShopAction(state, itemId, cost);
  }

  const check = canUseShopItem(state, itemId);
  if (!check.allowed) {
    return { ...state, lastMessage: check.blockedMessage ?? state.lastMessage };
  }

  let next = spend(state, cost);
  if (itemId === "force-ball") {
    next = forceNextUsefulBall(next, random);
  } else if (itemId === "strong-coffee") {
    next = recoverMultiplier(next, 0.3);
  } else if (itemId === "erase-bad-call") {
    next = eraseLastBadCall(next);
  }

  return next;
}

export function applyDirectedShopAction(state: RunState, targetCellId: number): RunState {
  const action = state.pendingShopAction;
  if (!action) {
    return state;
  }

  if (action.itemId === "swap-cells" && action.firstCellId === null) {
    return {
      ...state,
      pendingShopAction: { ...action, firstCellId: targetCellId },
      selectedCellId: targetCellId,
      lastMessage: "Primera casilla elegida. Toca la segunda para cambiar posiciones."
    };
  }

  const beforeMoney = state.money;
  let paid = spend({ ...state, pendingShopAction: null }, action.cost);
  if (paid.money === beforeMoney && action.cost > 0) {
    return { ...state, lastMessage: "No te alcanza la plata ficticia." };
  }

  const beforeBoard = state.board;
  if (action.itemId === "fuzzy-stamp") {
    paid = fuzzyStampCell(paid, targetCellId);
  } else if (action.itemId === "bump-number") {
    paid = bumpCellNumber(paid, targetCellId);
  } else if (action.itemId === "lower-number") {
    paid = lowerCellNumber(paid, targetCellId);
  } else if (action.firstCellId !== null) {
    paid = swapCells(paid, action.firstCellId, targetCellId);
  }

  const changed = paid.board !== beforeBoard;
  if (!changed) {
    return {
      ...state,
      selectedCellId: targetCellId,
      lastMessage: paid.lastMessage
    };
  }

  return {
    ...paid,
    phase: paid.phase === "tableWon" ? "tableWon" : "table",
    pendingShopAction: null,
    selectedCellId: targetCellId
  };
}

export function returnFromBlackjack(state: RunState): RunState {
  if (!state.blackjack) {
    return { ...state, phase: "kiosk" };
  }

  if (!state.blackjack.settled) {
    return { ...state, phase: "kiosk", blackjack: null };
  }

  const paid = applyBlackjackPayout(state, state.blackjack);
  return {
    ...paid,
    phase: "kiosk",
    blackjack: null
  };
}

export function recoverMultiplier(state: RunState, amount: number): RunState {
  return {
    ...state,
    multiplier: roundMultiplier(state.multiplier + amount),
    lastMessage: `Cafe cargado: multiplicador x${roundMultiplier(state.multiplier + amount).toFixed(1)}.`
  };
}

export function isFullBoard(board: BoardCell[]): boolean {
  return board.every((cell) => cell.marked);
}

export function detectPatternRewards(state: RunState): PatternReward[] {
  const config = TABLE_CONFIGS[state.tableIndex];
  const rewards: PatternReward[] = [];

  const rowMoneyBonus = state.ownedBonusIds.includes("lucky-cup") ? 10 : 0;
  const contractCarry = applyContractEffectsToNextTable({}, state.activeContractIds);

  for (let row = 0; row < config.boardSize; row += 1) {
    const id = `row-${row}`;
    if (!state.scoredPatternIds.has(id) && state.board.filter((cell) => cell.row === row).every((cell) => cell.marked)) {
      rewards.push({
        id,
        kind: "row",
        label: `Linea horizontal ${row + 1}`,
        score: 75,
        money: Math.max(0, config.rowPayout + rowMoneyBonus + contractCarry.rowMoneyDelta!),
        multiplier: 0
      });
    }
  }

  const diagonalA = state.board.filter((cell) => cell.row === cell.col);
  if (!state.scoredPatternIds.has("diag-a") && diagonalA.every((cell) => cell.marked)) {
    const diagonalBonus = state.ownedBonusIds.includes("cross-charm") ? 0.25 : 0;
    rewards.push({
      id: "diag-a",
      kind: "diagonal",
      label: "Diagonal principal",
      score: 20,
      money: 20,
      multiplier: Math.max(0, 0.5 + diagonalBonus + contractCarry.diagonalMultiplierDelta!)
    });
  }

  const diagonalB = state.board.filter((cell) => cell.row + cell.col === config.boardSize - 1);
  if (!state.scoredPatternIds.has("diag-b") && diagonalB.every((cell) => cell.marked)) {
    const diagonalBonus = state.ownedBonusIds.includes("cross-charm") ? 0.25 : 0;
    rewards.push({
      id: "diag-b",
      kind: "diagonal",
      label: "Diagonal cruzada",
      score: 20,
      money: 20,
      multiplier: Math.max(0, 0.5 + diagonalBonus + contractCarry.diagonalMultiplierDelta!)
    });
  }

  const fullBoardId = "full-board";
  if (!state.scoredPatternIds.has(fullBoardId) && isFullBoard(state.board)) {
    const clutchClear = state.multiplier <= 0.8;
    const fullBoardMoney = clutchClear ? config.fullBoardPayout.clutch : config.fullBoardPayout.normal;
    rewards.push({
      id: fullBoardId,
      kind: "full",
      label: clutchClear ? "TIMBA! Carton lleno al limite" : "TIMBA! Carton lleno",
      score: clutchClear ? 340 : 220,
      money: fullBoardMoney,
      multiplier: clutchClear ? 0.6 : 0.4
    });
  }

  return rewards;
}

export function advanceAfterTableWin(state: RunState, random: RandomFn = Math.random): RunState {
  if (TABLE_CONFIGS[state.tableIndex].isTutorial) {
    return startNextTable(state, random);
  }

  if (!TABLE_CONFIGS[state.tableIndex + 1]) {
    return { ...state, phase: "runWon", lastMessage: "Ganaste toda la noche." };
  }

  const contractOfferIds = chooseContractOfferIds(state.activeContractIds, state.activeContractIds, 3, random);
  if (contractOfferIds.length > 0) {
    return {
      ...state,
      phase: "contract",
      contractOfferIds,
      recentRewards: [],
      lastMessage: "Elegi un contrato para torcer la proxima mesa."
    };
  }

  return advanceAfterContractChoice(state, random);
}

export function chooseTableContract(state: RunState, contractId: ContractId, random: RandomFn = Math.random): RunState {
  if (!state.contractOfferIds.includes(contractId)) {
    return { ...state, lastMessage: "Ese contrato no esta sobre la mesa." };
  }

  return advanceAfterContractChoice(
    {
      ...state,
      activeContractIds: [...state.activeContractIds, contractId],
      contractOfferIds: [],
      lastMessage: "Firmaste el contrato. La mesa cambia de humor."
    },
    random
  );
}

export function skipTableContract(state: RunState, random: RandomFn = Math.random): RunState {
  return advanceAfterContractChoice(
    {
      ...state,
      contractOfferIds: [],
      lastMessage: "No firmaste nada. La noche sigue limpia."
    },
    random
  );
}

function advanceAfterContractChoice(state: RunState, random: RandomFn = Math.random): RunState {
  const offers = chooseUpgradeOfferIds(state, 3, random);
  if (offers.length > 0 && TABLE_CONFIGS[state.tableIndex + 1]) {
    return {
      ...state,
      phase: "upgrade",
      upgradeOfferIds: offers,
      recentRewards: [],
      lastMessage: "Elegi un amuleto permanente antes de la proxima mesa."
    };
  }

  return startNextTable(state, random);
}

export function startNextTable(state: RunState, random: RandomFn = Math.random): RunState {
  const nextIndex = state.tableIndex + 1;
  if (!TABLE_CONFIGS[nextIndex]) {
    return { ...state, phase: "runWon", lastMessage: "Ganaste toda la noche." };
  }

  const ledgerMoney = state.ownedBonusIds.includes("dirty-ledger") ? 25 : 0;
  const contractCarry = applyContractEffectsToNextTable({}, state.activeContractIds);
  return createTableState(nextIndex, random, {
    score: state.score,
    multiplier: Math.max(0.4, Math.max(STARTING_MULTIPLIER, state.multiplier) + contractCarry.multiplierDelta!),
    money: Math.max(0, state.money + TABLE_CONFIGS[nextIndex].startingMoney + ledgerMoney + contractCarry.moneyDelta!),
    ownedBonusIds: state.ownedBonusIds,
    activeContractIds: state.activeContractIds
  });
}

export function buyPermanentBonus(state: RunState, bonusId: PermanentBonusId): RunState {
  const bonus = PERMANENT_BONUSES.find((candidate) => candidate.id === bonusId);
  if (!bonus) {
    return state;
  }
  if (state.ownedBonusIds.includes(bonusId)) {
    return { ...state, lastMessage: "Ese amuleto ya es tuyo." };
  }
  if (state.money < bonus.cost) {
    return { ...state, lastMessage: "No te alcanza para ese amuleto." };
  }

  return {
    ...state,
    money: state.money - bonus.cost,
    ownedBonusIds: [...state.ownedBonusIds, bonusId],
    lastMessage: `${bonus.label} queda activo para toda la noche.`
  };
}

export function skipPermanentBonus(state: RunState): RunState {
  return {
    ...state,
    lastMessage: "Guardaste la plata para la proxima mesa."
  };
}

export function chooseUpgradeOfferIds(state: RunState, count: number, random: RandomFn = Math.random): PermanentBonusId[] {
  const ids = PERMANENT_BONUSES.map((bonus) => bonus.id).filter((id) => !state.ownedBonusIds.includes(id));
  shuffle(ids, random);
  return ids.slice(0, Math.min(count, ids.length));
}

export function advanceTutorialStep(state: RunState, random: RandomFn = Math.random): RunState {
  const nextStep = state.tutorialStep + 1;
  if (nextStep >= 9) {
    return createPlayRun(random);
  }

  return {
    ...state,
    tutorialStep: nextStep,
    lastMessage: tutorialStepMessage(nextStep, state)
  };
}

function applyMarkRewards(state: RunState, quickReward?: PatternReward | null): RunState {
  const rewards = quickReward ? [quickReward, ...detectPatternRewards(state)] : detectPatternRewards(state);
  const recentRewards: PatternReward[] = [];
  const scoredPatternIds = new Set(state.scoredPatternIds);
  let score = state.score;
  let money = state.money;
  let multiplier = state.multiplier;
  let lastMessage = state.lastMessage;

  for (const reward of rewards) {
    const appliedScore = Math.round(reward.score * Math.max(multiplier, 0.1));
    scoredPatternIds.add(reward.id);
    score += appliedScore;
    money += reward.money;
    multiplier = roundMultiplier(multiplier + reward.multiplier);
    recentRewards.push({ ...reward, score: appliedScore });
    lastMessage = `${reward.label}: +${appliedScore} puntos, +$${reward.money}.`;
  }

  const quickMarks = Array.from(scoredPatternIds).filter((id) => id.startsWith("quick-mark-")).length;
  if (quickReward && state.ownedBonusIds.includes("quick-ritual") && quickMarks > 0 && quickMarks % 3 === 0) {
    const chainReward: PatternReward = {
      id: `quick-chain-${quickMarks}`,
      kind: "quick",
      label: "Cadena veloz",
      score: 0,
      money: 18,
      multiplier: 0
    };
    scoredPatternIds.add(chainReward.id);
    money += chainReward.money;
    recentRewards.push(chainReward);
    lastMessage = `${chainReward.label}: +$${chainReward.money}.`;
  }

  const full = isFullBoard(state.board);
  return {
    ...state,
    scoredPatternIds,
    score,
    money,
    multiplier,
    recentRewards,
    phase: full ? "tableWon" : state.phase,
    lastMessage: full ? "TIMBA! Carton lleno." : lastMessage
  };
}

function stampBonus(state: RunState): number {
  return state.ownedBonusIds.includes("heavy-stamp") ? 6 : 0;
}

function pendingShopActionMessage(itemId: DirectedShopItemId): string {
  if (itemId === "fuzzy-stamp") {
    return "Elegiste Sello viudo. Toca una casilla para marcarla borrosa.";
  }
  if (itemId === "swap-cells") {
    return "Elegiste Bajo la mesa. Toca dos casillas para intercambiarlas.";
  }
  if (itemId === "bump-number") {
    return "Elegiste Tinta corrida. Toca una casilla para subirla +1.";
  }
  return "Elegiste Tinta en reversa. Toca una casilla para bajarla -1.";
}

function selectedCell(state: RunState): BoardCell | null {
  if (state.selectedCellId === null) {
    return null;
  }
  return state.board.find((cell) => cell.id === state.selectedCellId) ?? null;
}

function tutorialStepMessage(step: number, state?: RunState): string {
  const guidedValue = state?.currentBall ?? null;
  const markTarget = guidedValue === null ? "la casilla iluminada" : `la casilla iluminada del ${guidedValue}`;
  const messages = [
    "Accion: lee el objetivo y pulsa Continuar.",
    "Accion: pulsa Cantar bolilla para mostrar un numero del carton.",
    `Accion: toca ${markTarget}. El boton solo repite la pista.`,
    "Primera marca lista. Accion: pulsa Cantar otra.",
    `Accion: toca ${markTarget}. Es la segunda marca guiada.`,
    "Segunda marca lista. Accion: pulsa Continuar para ver premios.",
    "Accion: pulsa Continuar; el multiplicador baja con cada bolilla.",
    "Accion: pulsa Continuar; x0.0 pierde la mesa.",
    "Accion: pulsa Ir a mesa para entrar al Asilo 3x3 real."
  ];
  return messages[step] ?? messages[0];
}

function quickStampReward(state: RunState, secondsRemaining: number): PatternReward | null {
  const quickId = `quick-mark-${state.round}-${state.board.filter((cell) => cell.marked).length}`;
  if (secondsRemaining >= 9) {
    return {
      id: quickId,
      kind: "quick",
      label: "Sello relampago",
      score: 30,
      money: 10,
      multiplier: 0
    };
  }

  if (secondsRemaining >= 5) {
    return {
      id: quickId,
      kind: "quick",
      label: "Sello rapido",
      score: 15,
      money: 5,
      multiplier: 0
    };
  }

  return null;
}

function calledBallMessage(board: BoardCell[], currentBall: number, free: boolean): string {
  const prefix = free ? `La mesa abre con la bolilla ${currentBall}.` : `Salio la bolilla ${currentBall}.`;
  const matchingCell = board.find((cell) => cell.value === currentBall);
  if (!matchingCell) {
    return `${prefix} No esta en tu carton.`;
  }

  if (matchingCell.marked) {
    return `${prefix} Ya lo tenias sellado.`;
  }

  return `${prefix} Esta en tu carton: fila ${matchingCell.row + 1}, columna ${matchingCell.col + 1}.`;
}

function createBossState(config: TableConfig): BossState | null {
  if (!config.boss) {
    return null;
  }
  return {
    name: config.boss.name,
    progress: 0,
    target: config.boss.target
  };
}

function advanceBoss(boss: BossState, config: TableConfig, random: RandomFn): BossState {
  if (!config.boss) {
    return boss;
  }
  const advance = config.boss.advanceMin + Math.floor(random() * (config.boss.advanceMax - config.boss.advanceMin + 1));
  return {
    ...boss,
    progress: Math.min(boss.target, boss.progress + advance)
  };
}

function applyBossCheat(state: RunState, random: RandomFn): RunState {
  const candidates = state.board.filter((cell) => !cell.marked);
  if (candidates.length === 0) {
    return state;
  }

  const target = pick(candidates, random);
  const board = state.board.map((cell) => (cell.id === target.id ? { ...cell, dirty: true } : cell));
  const action: BossAction = {
    label: "Trampa del Nono",
    detail: `Ensucio el ${target.value} y te raspo x0.1.`,
    cellId: target.id
  };
  const multiplier = roundMultiplier(Math.max(0, state.multiplier - 0.1));

  return {
    ...state,
    board,
    multiplier,
    bossAction: action,
    lastMessage: action.detail,
    phase: multiplier <= 0 ? "lost" : state.phase,
    lostReason: multiplier <= 0 ? "El Nono te dejo sin multiplicador." : state.lostReason
  };
}

function resolveExpiredParcaMark(state: RunState): RunState {
  if (!state.parcaMark) {
    return state;
  }

  const target = state.board.find((cell) => cell.id === state.parcaMark?.cellId);
  const board = target
    ? state.board.map((cell) => (cell.id === target.id ? { ...cell, dirty: true } : cell))
    : state.board;
  const multiplier = roundMultiplier(Math.max(0, state.multiplier - PARCA_MARK_PENALTY));
  return {
    ...state,
    board,
    parcaMark: null,
    multiplier,
    lastMessage: target
      ? `La Marca de la Parca mordio el ${target.value}: -x${PARCA_MARK_PENALTY.toFixed(2)}.`
      : `La Marca de la Parca cobro: -x${PARCA_MARK_PENALTY.toFixed(2)}.`,
    phase: multiplier <= 0 ? "lost" : state.phase,
    lostReason: multiplier <= 0 ? "La Marca de la Parca te dejo en x0.0." : state.lostReason
  };
}

function maybeSpawnParcaMark(state: RunState, random: RandomFn, blockedByExpiredMark: boolean): RunState {
  if (
    blockedByExpiredMark ||
    state.phase !== "table" ||
    TABLE_CONFIGS[state.tableIndex].isTutorial ||
    state.parcaMark ||
    state.multiplier > PARCA_MARK_THRESHOLD ||
    state.round < 3 ||
    state.round % 3 !== 0
  ) {
    return state;
  }

  const candidates = state.board.filter((cell) => !cell.marked);
  if (candidates.length === 0) {
    return state;
  }

  const priority = candidates.filter((cell) => cell.value !== state.currentBall);
  const target = pick(priority.length > 0 ? priority : candidates, random);
  const parcaMark: ParcaMark = {
    cellId: target.id,
    round: state.round
  };
  return {
    ...state,
    parcaMark,
    lastMessage: `La Parca marco el ${target.value}. Tocalo antes de la proxima bolilla o raspa x${PARCA_MARK_PENALTY.toFixed(2)}.`
  };
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => index + min);
}

function shuffle<T>(items: T[], random: RandomFn): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function pick<T>(items: T[], random: RandomFn): T {
  return items[Math.floor(random() * items.length)];
}

function roundMultiplier(value: number): number {
  return Number(value.toFixed(2));
}
