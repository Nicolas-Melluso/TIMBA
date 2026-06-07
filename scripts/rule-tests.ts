import assert from "node:assert/strict";
import {
  applyBlackjackPayout,
  blackjackHit,
  blackjackStand,
  createBlackjackState,
  drawCard,
  handLabel,
  handValue,
  startBlackjackSideGame
} from "../src/renderer/src/game/blackjack.js";
import { MULTIPLIER_DECAY_PER_BALL, PERMANENT_BONUSES, TABLE_CONFIGS } from "../src/renderer/src/game/config.js";
import {
  achievementIdsFromBlackjackResult,
  achievementIdsFromKioskVisits,
  achievementIdsFromRunState
} from "../src/renderer/src/game/achievementTriggers.js";
import { clampVolumeLevel, clampVolumeMultiplier } from "../src/renderer/src/audio/volumeSettings.js";
import {
  CONTRACT_IDS,
  applyContractEffectsToNextTable,
  chooseContractOfferIds,
  getContractDifficulty,
  getContractHint,
  getContractLabel,
  getContractStyle,
  getContractTags
} from "../src/renderer/src/game/contracts.js";
import {
  LEADERBOARD_SCORE_VERSION,
  LEADERBOARD_STORAGE_KEY,
  createRunSummary,
  getBestEntry,
  getLocalChaseProgress,
  getLocalChaseTargetScore,
  getLeaderboardScoreBreakdown,
  insertLeaderboardEntry,
  loadLeaderboard,
  rankEntry,
  saveLeaderboard,
  scoreRunForLeaderboard,
  type Leaderboard
} from "../src/renderer/src/game/leaderboard.js";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_DEFINITIONS,
  PROFILE_STORAGE_KEY,
  createDefaultProfile,
  getProfilePointProgress,
  getProfileProgress,
  getProfileProgressByCategory,
  loadProfile,
  listAchievementsByCategory,
  listLockedAchievements,
  listRecentUnlocks,
  listUnlockedCosmeticRewards,
  saveProfile,
  unlockAchievements
} from "../src/renderer/src/game/profile.js";
import { TUTORIAL_GUIDE } from "../src/renderer/src/game/tutorialGuide.js";
import {
  advanceAfterTableWin,
  advanceTutorialStep,
  adjustedShopCost,
  applyDirectedShopAction,
  applyImmediateShopItem,
  buyPermanentBonus,
  blockedShopMessage,
  cancelPendingShopAction,
  canUseShopItem,
  chooseShopOfferIds,
  chooseTableContract,
  chooseUpgradeOfferIds,
  createInitialRun,
  createPlayRun,
  createTableState,
  createTutorialRun,
  drawGuidedTutorialBall,
  drawNextBall,
  enterKiosk,
  eraseLastBadCall,
  forceNextUsefulBall,
  fuzzyStampCell,
  detectPatternRewards,
  isFullBoard,
  leaveKiosk,
  lowerCellNumber,
  markMatchingCell,
  recoverMultiplier,
  returnFromBlackjack,
  skipPermanentBonus,
  skipTableContract,
  startNextTable,
  startPendingShopAction,
  swapCells,
  wardParcaMark
} from "../src/renderer/src/game/rules.js";
import type { BlackjackState, BoardCell, PermanentBonusId, RunState } from "../src/renderer/src/game/types.js";

function deterministicRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    }
  };
}

function markCells(state: RunState, cells: BoardCell[]): RunState {
  return cells.reduce((next, cell) => markMatchingCell({ ...next, currentBall: cell.value }, cell.id), state);
}

{
  const state = createTableState(1, deterministicRandom([0.2, 0.7, 0.4, 0.9]));
  const values = state.board.map((cell) => cell.value);
  assert.equal(state.board.length, 9);
  assert.equal(new Set(values).size, 9);
  assert.ok(values.every((value) => value >= 1 && value <= 30));
}

{
  const base = createTableState(1, deterministicRandom([0.2]));
  const target = base.board[0];
  const stamped = fuzzyStampCell({ ...base, phase: "kiosk", fuzzyStampMode: true }, target.id);
  assert.equal(stamped.board[target.id].marked, true);
  assert.equal(stamped.board[target.id].dirty, true);
  assert.equal(stamped.phase, "table");
  assert.equal(stamped.fuzzyStampMode, false);
}

{
  const base = { ...createTableState(1, deterministicRandom([0.2])), ownedBonusIds: ["blurred-sigil" as const] };
  const target = base.board[0];
  const stamped = fuzzyStampCell({ ...base, phase: "kiosk", fuzzyStampMode: true, multiplier: 2 }, target.id);
  assert.equal(stamped.money, base.money + 8);
  assert.equal(stamped.multiplier, 2.1);
}

{
  const base = createTableState(1, deterministicRandom([0.2]));
  const first = base.board[0];
  const second = base.board[1];
  const swapped = swapCells({ ...base, swapMode: true, swapFirstCellId: first.id }, first.id, second.id);
  assert.equal(swapped.board[first.id].value, second.value);
  assert.equal(swapped.board[second.id].value, first.value);
  assert.equal(swapped.board[first.id].dirty, true);
  assert.equal(swapped.board[second.id].dirty, true);
  assert.equal(swapped.swapMode, false);
  assert.equal(swapped.swapFirstCellId, null);
}

{
  const table = createTableState(1, deterministicRandom([0.2]));
  const uselessBall = drawNextBall(table, deterministicRandom([0.1]));
  const erased = eraseLastBadCall(uselessBall);
  assert.equal(erased.calledBalls.length, uselessBall.calledBalls.length - 1);
  assert.equal(erased.multiplier, Number((uselessBall.multiplier + 0.15).toFixed(2)));

  const usefulValue = table.board[0].value;
  const usefulState = { ...table, calledBalls: [usefulValue], currentBall: usefulValue };
  const kept = eraseLastBadCall(usefulState);
  assert.deepEqual(kept.calledBalls, usefulState.calledBalls);
  assert.equal(kept.multiplier, usefulState.multiplier);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const recovered = recoverMultiplier({ ...state, multiplier: 1.23 }, 0.37);
  assert.equal(recovered.multiplier, 1.6);
}

{
  const owned: PermanentBonusId[] = [PERMANENT_BONUSES[0].id, PERMANENT_BONUSES[1].id];
  const state = { ...createTableState(1, deterministicRandom([0.2])), ownedBonusIds: owned };
  const offers = chooseUpgradeOfferIds(state, 8, deterministicRandom([0.1, 0.9, 0.3, 0.7]));
  assert.ok(offers.every((id) => !owned.includes(id)));

  const fullyOwned = { ...state, ownedBonusIds: PERMANENT_BONUSES.map((bonus) => bonus.id) };
  const none = chooseUpgradeOfferIds(fullyOwned, 3, deterministicRandom([0.5]));
  assert.equal(none.length, 0);
}

{
  const menu = createInitialRun(deterministicRandom([0.2]));
  assert.equal(menu.phase, "menu");

  const play = createPlayRun(deterministicRandom([0.2]));
  assert.equal(play.phase, "table");
  assert.equal(TABLE_CONFIGS[play.tableIndex].boardSize, 3);

  let tutorial = createTutorialRun(deterministicRandom([0.2]));
  assert.equal(tutorial.phase, "tutorial");
  for (let step = 0; step < 9; step += 1) {
    tutorial = advanceTutorialStep(tutorial, deterministicRandom([0.3]));
  }
  assert.equal(tutorial.phase, "table");
  assert.equal(TABLE_CONFIGS[tutorial.tableIndex].boardSize, 3);
}

{
  let tutorial = createTutorialRun(deterministicRandom([0.2]));
  assert.equal(tutorial.lastMessage, "Accion: lee el objetivo y pulsa Continuar.");

  tutorial = advanceTutorialStep(tutorial, deterministicRandom([0.3]));
  assert.equal(tutorial.lastMessage, "Accion: pulsa Cantar bolilla para mostrar un numero del carton.");

  tutorial = drawGuidedTutorialBall(tutorial);
  const firstBall = tutorial.currentBall;
  assert.equal(typeof firstBall, "number");

  tutorial = advanceTutorialStep(tutorial, deterministicRandom([0.3]));
  assert.equal(tutorial.lastMessage, `Accion: toca la casilla iluminada del ${firstBall}. El boton solo repite la pista.`);

  const firstCell = tutorial.board.find((cell) => cell.value === firstBall);
  assert.ok(firstCell);
  tutorial = markMatchingCell(tutorial, firstCell.id);
  tutorial = advanceTutorialStep(tutorial, deterministicRandom([0.3]));
  assert.equal(tutorial.lastMessage, "Primera marca lista. Accion: pulsa Cantar otra.");
}

{
  let state = createTableState(1, deterministicRandom([0.1, 0.2, 0.3, 0.4]));
  for (let index = 0; index < 8; index += 1) {
    state = drawNextBall(state, deterministicRandom([0.1 + index * 0.03]));
  }
  assert.equal(new Set(state.calledBalls).size, state.calledBalls.length);
}

{
  const state = createTableState(1, deterministicRandom([0.3]));
  const target = state.board[0];
  const forcedValue = target.value;
  const forced = drawNextBall({ ...state, forcedBall: forcedValue }, deterministicRandom([0.9]));
  assert.equal(forced.currentBall, forcedValue);
  assert.equal(
    forced.lastMessage,
    `Salio la bolilla ${forcedValue}. Esta en tu carton: fila ${target.row + 1}, columna ${target.col + 1}.`
  );

  const preMarked = {
    ...state,
    board: state.board.map((cell) => (cell.id === target.id ? { ...cell, marked: true } : cell)),
    forcedBall: forcedValue
  };
  const alreadyMarked = drawNextBall(preMarked, deterministicRandom([0.9]));
  assert.equal(alreadyMarked.lastMessage, `Salio la bolilla ${forcedValue}. Ya lo tenias sellado.`);

  const ignored = drawNextBall({ ...state, forcedBall: forcedValue, calledBalls: [forcedValue] }, deterministicRandom([0]));
  assert.notEqual(ignored.currentBall, forcedValue);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const cell = state.board[0];
  const other = state.board[1];
  const marked = markMatchingCell({ ...state, currentBall: cell.value }, cell.id);
  assert.equal(marked.board[cell.id].marked, true);

  const miss = markMatchingCell({ ...state, currentBall: other.value }, cell.id);
  assert.equal(miss.board[cell.id].marked, false);
  assert.equal(miss.lastMessage, `La bolilla cantada es ${other.value}; el ${cell.value} no se puede sellar.`);

  const withoutBall = markMatchingCell(state, cell.id);
  assert.equal(withoutBall.lastMessage, "Todavia no hay bolilla cantada.");

  const repeated = markMatchingCell(marked, cell.id);
  assert.equal(repeated.lastMessage, `El ${cell.value} ya esta sellado.`);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const firstRow = state.board.filter((cell) => cell.row === 0);
  const scored = markCells(state, firstRow);
  const scoreAfterRow = scored.score;
  const moneyAfterRow = scored.money;
  const rowReward = scored.recentRewards.find((reward) => reward.kind === "row");
  assert.equal(rowReward?.score, 225);
  assert.equal(rowReward?.money, TABLE_CONFIGS[state.tableIndex].rowPayout);
  const repeated = markMatchingCell({ ...scored, currentBall: firstRow[0].value }, firstRow[0].id);
  assert.equal(repeated.score, scoreAfterRow);
  assert.equal(repeated.money, moneyAfterRow);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const diagonal = state.board.filter((cell) => cell.row === cell.col);
  const scored = markCells(state, diagonal);
  const multiplierAfterDiagonal = scored.multiplier;
  const repeated = markMatchingCell({ ...scored, currentBall: diagonal[0].value }, diagonal[0].id);
  assert.equal(repeated.multiplier, multiplierAfterDiagonal);
}

{
  const state = { ...createTableState(1, deterministicRandom([0.2])), ownedBonusIds: ["cross-charm" as const] };
  const diagonal = state.board.filter((cell) => cell.row === cell.col);
  const scored = markCells(state, diagonal);
  assert.equal(scored.multiplier, 3.75);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const won = markCells(state, state.board);
  assert.equal(won.phase, "tableWon");
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const config = TABLE_CONFIGS[state.tableIndex];
  const exhausted = {
    ...state,
    calledBalls: Array.from({ length: config.ballMax - config.ballMin + 1 }, (_, index) => config.ballMin + index)
  };
  const lost = drawNextBall(exhausted, deterministicRandom([0.1]));
  assert.equal(lost.phase, "lost");
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const opened = drawNextBall(state, deterministicRandom([0.1]), { free: true });
  assert.equal(opened.multiplier, state.multiplier);
  assert.equal(opened.calledBalls.length, 1);

  const regular = drawNextBall(state, deterministicRandom([0.1]));
  assert.equal(regular.multiplier, Number((state.multiplier - MULTIPLIER_DECAY_PER_BALL).toFixed(2)));
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const cell = state.board[0];
  const fast = markMatchingCell({ ...state, currentBall: cell.value }, cell.id, 10);
  assert.ok(fast.recentRewards.some((reward) => reward.kind === "quick"));
  assert.equal(fast.money, state.money + 10);

  const slow = markMatchingCell({ ...state, currentBall: cell.value }, cell.id, 3);
  assert.equal(slow.recentRewards.some((reward) => reward.kind === "quick"), false);
  assert.equal(slow.money, state.money);
}

{
  let state: RunState = {
    ...createTableState(1, deterministicRandom([0.2])),
    ownedBonusIds: ["quick-ritual"],
    money: 0
  };
  const targets = [state.board[0], state.board[4], state.board[7]];
  for (const target of targets) {
    state = markMatchingCell({ ...state, currentBall: target.value }, target.id, 10);
  }
  assert.equal(state.money, 48);
  assert.ok(state.recentRewards.some((reward) => reward.id === "quick-chain-3"));
}

{
  assert.equal(
    handValue([
      { label: "A", value: 11 },
      { label: "9", value: 9 },
      { label: "A", value: 11 }
    ]),
    21
  );
}

{
  const kiosk = enterKiosk(createTableState(1, deterministicRandom([0.2])), deterministicRandom([0.1, 0.5, 0.8]));
  assert.equal(kiosk.blackjackPlayedThisVisit, false);
  assert.equal(kiosk.shopOfferIds.length, 3);
  assert.equal(new Set(kiosk.shopOfferIds).size, 3);
  const started = startBlackjackSideGame(kiosk, deterministicRandom([0.1, 0.2, 0.3, 0.4]));
  assert.equal(started.phase, "blackjack");
  assert.equal(started.blackjackPlayedThisVisit, true);
  const blocked = startBlackjackSideGame(started, deterministicRandom([0.5]));
  assert.equal(blocked.blackjack, started.blackjack);
}

{
  const table = drawNextBall(createTableState(1, deterministicRandom([0.2])), deterministicRandom([0.1]));
  const kiosk = enterKiosk(table, deterministicRandom([0.1, 0.5, 0.8]));
  const reopened = enterKiosk({ ...kiosk, phase: "table", kioskSeconds: 11 }, deterministicRandom([0.9, 0.9, 0.9]));
  assert.deepEqual(reopened.shopOfferIds, kiosk.shopOfferIds);
  assert.equal(reopened.kioskSeconds, 11);

  const nextBall = drawNextBall(reopened, deterministicRandom([0.4]));
  const nextKiosk = enterKiosk(nextBall, deterministicRandom([0.9, 0.8, 0.7]));
  assert.notDeepEqual(nextKiosk.shopOfferIds, kiosk.shopOfferIds);
}

{
  const table = createTableState(1, deterministicRandom([0.2]));
  const cell = table.board.find((candidate) => candidate.value > TABLE_CONFIGS[table.tableIndex].ballMin)!;
  const lowered = lowerCellNumber(table, cell.id);
  assert.equal(lowered.board[cell.id].value, cell.value - 1);

  const duplicate = {
    ...table,
    board: table.board.map((candidate, index) => (index === 0 ? { ...candidate, value: 2 } : index === 1 ? { ...candidate, value: 1 } : candidate))
  };
  const rejected = lowerCellNumber(duplicate, 0);
  assert.equal(rejected.board[0].value, 2);
}

{
  const table = { ...createTableState(1, deterministicRandom([0.2])), money: 50 };
  const pending = startPendingShopAction(table, "bump-number", 25);
  assert.equal(pending.phase, "table");
  assert.equal(pending.money, 50);
  assert.equal(pending.pendingShopAction?.itemId, "bump-number");
  const canceled = cancelPendingShopAction(pending);
  assert.equal(canceled.phase, "kiosk");
  assert.equal(canceled.money, 50);
  assert.equal(canceled.pendingShopAction, null);
}

{
  const kiosk = enterKiosk(createTableState(1, deterministicRandom([0.2])), deterministicRandom([0.1, 0.5, 0.8]));
  const left = leaveKiosk({ ...kiosk, blackjack: createBlackjackState(deterministicRandom([0.1, 0.2, 0.3, 0.4])) });
  assert.equal(left.phase, "table");
  assert.equal(left.blackjack, null);
}

{
  const table = { ...createTableState(1, deterministicRandom([0.2])), money: 100 };
  const forced = applyImmediateShopItem(table, "force-ball", 40, deterministicRandom([0]));
  assert.equal(forced.money, 60);
  assert.ok(forced.forcedBall !== null);

  const coffee = applyImmediateShopItem({ ...table, multiplier: 1.2 }, "strong-coffee", 20);
  assert.equal(coffee.money, 80);
  assert.equal(coffee.multiplier, 1.5);

  const empty = { ...table, board: table.board.map((cell) => ({ ...cell, marked: true })) };
  assert.equal(canUseShopItem(empty, "force-ball").allowed, false);
  assert.equal(blockedShopMessage(empty, "force-ball"), "No quedan numeros utiles para forzar.");
}

{
  const table = { ...createTableState(1, deterministicRandom([0.2])), money: 100 };
  const target = table.board[0];
  const pending = startPendingShopAction(table, "fuzzy-stamp", 35);
  const applied = applyDirectedShopAction(pending, target.id);
  assert.equal(applied.money, 65);
  assert.equal(applied.pendingShopAction, null);
  assert.equal(applied.board[target.id].marked, true);

  const rejected = applyDirectedShopAction(startPendingShopAction({ ...table, money: 5 }, "fuzzy-stamp", 35), target.id);
  assert.equal(rejected.money, 5);
  assert.equal(rejected.board[target.id].marked, false);
}

{
  const table = { ...createTableState(1, deterministicRandom([0.2])), money: 50 };
  const first = table.board[0];
  const second = table.board[1];
  const pending = startPendingShopAction(table, "swap-cells", 25);
  const firstPick = applyDirectedShopAction(pending, first.id);
  assert.equal(firstPick.pendingShopAction?.firstCellId, first.id);
  assert.equal(firstPick.money, 50);
  const swapped = applyDirectedShopAction(firstPick, second.id);
  assert.equal(swapped.money, 25);
  assert.equal(swapped.board[first.id].value, second.value);
  assert.equal(swapped.pendingShopAction, null);
}

{
  const offers = chooseShopOfferIds(3, deterministicRandom([0.2, 0.8, 0.1, 0.5]));
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers).size, 3);
}

{
  const tutorial = createTableState(0, deterministicRandom([0.2]));
  const firstTable = advanceAfterTableWin({ ...tutorial, phase: "tableWon" }, deterministicRandom([0.3]));
  assert.equal(TABLE_CONFIGS[firstTable.tableIndex].boardSize, 3);

  const asilo = createTableState(1, deterministicRandom([0.2]));
  const contracts = advanceAfterTableWin({ ...asilo, phase: "tableWon" }, deterministicRandom([0.3, 0.6, 0.9]));
  assert.equal(contracts.phase, "contract");
  assert.equal(contracts.contractOfferIds.length, 3);
  const upgrade = skipTableContract(contracts, deterministicRandom([0.3]));
  assert.equal(upgrade.phase, "upgrade");
  assert.equal(upgrade.upgradeOfferIds.length, 3);

  const patio = startNextTable(upgrade, deterministicRandom([0.4]));
  const tv = startNextTable({ ...patio, phase: "tableWon" }, deterministicRandom([0.5]));
  const bar = startNextTable({ ...tv, phase: "tableWon" }, deterministicRandom([0.6]));
  const boss = startNextTable({ ...bar, phase: "tableWon" }, deterministicRandom([0.7]));
  assert.equal(TABLE_CONFIGS[patio.tableIndex].boardSize, 3);
  assert.equal(TABLE_CONFIGS[tv.tableIndex].boardSize, 3);
  assert.equal(TABLE_CONFIGS[bar.tableIndex].boardSize, 4);
  assert.equal(TABLE_CONFIGS[boss.tableIndex].boardSize, 5);

  const exhausted = {
    ...createTableState(1, deterministicRandom([0.2])),
    phase: "tableWon" as const,
    ownedBonusIds: PERMANENT_BONUSES.map((bonus) => bonus.id),
    activeContractIds: CONTRACT_IDS
  };
  const withoutUpgrade = advanceAfterTableWin(exhausted, deterministicRandom([0.3]));
  assert.equal(withoutUpgrade.phase, "table");
  assert.equal(withoutUpgrade.tableIndex, exhausted.tableIndex + 1);

  const lastTable = {
    ...createTableState(TABLE_CONFIGS.length - 1, deterministicRandom([0.2])),
    phase: "tableWon" as const
  };
  const ended = advanceAfterTableWin(lastTable, deterministicRandom([0.2]));
  assert.equal(ended.phase, "runWon");
}

{
  const offers = chooseContractOfferIds([], [], 3, deterministicRandom([0.1, 0.5, 0.9]));
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers).size, 3);
  const nextOffers = chooseContractOfferIds(offers, offers, 3, deterministicRandom([0.1, 0.5, 0.9]));
  assert.equal(nextOffers.length, 3);
  assert.ok(nextOffers.every((id) => !offers.includes(id)));

  const carry = applyContractEffectsToNextTable({}, ["dirty-cash", "parca-delay", "thin-air"]);
  assert.equal(carry.moneyDelta, 20);
  assert.equal(carry.multiplierDelta, 0.2);
  assert.equal(carry.parcaDecayDelta, 0);

  assert.ok(CONTRACT_IDS.includes("visitor-hour"));
  assert.ok(CONTRACT_IDS.includes("asylum-oath"));
  const asiloCarry = applyContractEffectsToNextTable({}, ["visitor-hour", "asylum-oath"]);
  assert.equal(asiloCarry.moneyDelta, 14);
  assert.equal(asiloCarry.kioskOfferCapDelta, 1);
  assert.equal(asiloCarry.shopItemCostDelta, 4);
  assert.equal(asiloCarry.parcaDecayDelta, -0.02);
  assert.equal(asiloCarry.rowMoneyDelta, -6);
}

{
  const allowedDifficulties = new Set(["easy", "medium", "hard"]);
  const allowedStyles = new Set(["economia", "ritmo", "riesgo", "tablero", "kiosco"]);
  const seenTags = new Set<string>();
  for (const contractId of CONTRACT_IDS) {
    const label = getContractLabel(contractId);
    const hint = getContractHint(contractId);
    const difficulty = getContractDifficulty(contractId);
    const style = getContractStyle(contractId);
    const tags = getContractTags(contractId);

    assert.ok(label.trim().length > 0);
    assert.ok(hint.trim().length > 0);
    assert.ok(allowedDifficulties.has(difficulty));
    assert.ok(allowedStyles.has(style));
    assert.ok(tags.length >= 2);
    for (const tag of tags) {
      assert.ok(tag.trim().length > 0);
      seenTags.add(tag);
    }
  }
  assert.ok(seenTags.has("asilo"));
  assert.ok(seenTags.has("kiosco-caro"));
}

{
  const won = {
    ...createTableState(1, deterministicRandom([0.2])),
    phase: "contract" as const,
    money: 100,
    contractOfferIds: ["dirty-cash"] as RunState["contractOfferIds"]
  };
  const signed = chooseTableContract(won, "dirty-cash", deterministicRandom([0.4]));
  assert.ok(signed.activeContractIds.includes("dirty-cash"));
  const next = startNextTable(signed, deterministicRandom([0.5]));
  assert.equal(next.money, 100 + TABLE_CONFIGS[2].startingMoney + 35);
  assert.ok(next.activeContractIds.includes("dirty-cash"));
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const delayed = drawNextBall(
    {
      ...state,
      activeContractIds: ["parca-delay"] as RunState["activeContractIds"]
    },
    deterministicRandom([0.1])
  );
  assert.equal(delayed.multiplier, Number((state.multiplier - Math.max(0.03, MULTIPLIER_DECAY_PER_BALL - 0.03)).toFixed(2)));

  const pact = {
    ...createTableState(1, deterministicRandom([0.2])),
    activeContractIds: ["diagonal-pact"] as RunState["activeContractIds"]
  };
  const row = pact.board.filter((cell) => cell.row === 0);
  const rowScored = markCells(pact, row);
  assert.equal(rowScored.recentRewards.find((reward) => reward.kind === "row")?.money, 19);

  const diagonal = pact.board.filter((cell) => cell.row === cell.col);
  const diagonalScored = markCells(pact, diagonal);
  assert.equal(diagonalScored.multiplier, 3.7);
}

{
  let boss = createTableState(5, deterministicRandom([0.2]));
  const freeOpen = drawNextBall(boss, deterministicRandom([0.1, 0.2]), { free: true });
  assert.equal(freeOpen.boss?.progress, 0);

  boss = drawNextBall(boss, deterministicRandom([0.1, 0.2]));
  boss = drawNextBall(boss, deterministicRandom([0.1, 0.2]));
  boss = drawNextBall(boss, deterministicRandom([0.1, 0.2]));
  assert.ok(boss.bossAction);
  assert.ok(boss.board.some((cell) => cell.dirty));
}

{
  const rich = { ...createTableState(1, deterministicRandom([0.2])), money: 100 };
  const bought = buyPermanentBonus(rich, "marked-cage");
  assert.ok(bought.ownedBonusIds.includes("marked-cage"));
  assert.equal(adjustedShopCost(bought, "force-ball", 40), 30);
}

{
  const cagedKiosk = {
    ...createTableState(1, deterministicRandom([0.2])),
    ownedBonusIds: ["marked-cage" as const, "kiosk-amulet" as const],
    money: 200
  };
  assert.equal(adjustedShopCost(cagedKiosk, "force-ball", 40), 25);
  assert.equal(adjustedShopCost(cagedKiosk, "swap-cells", 25), 20);
}

{
  const wide = { ...createTableState(1, deterministicRandom([0.2])), ownedBonusIds: ["wide-kiosk" as const] };
  const kiosk = enterKiosk(wide, deterministicRandom([0.1, 0.5, 0.8]));
  assert.equal(kiosk.shopOfferIds.length, 4);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const forced = forceNextUsefulBall(state, deterministicRandom([0]));
  assert.ok(forced.forcedBall !== null);
  assert.ok(state.board.some((cell) => cell.value === forced.forcedBall));
}

{
  const winState: BlackjackState = {
    playerHand: [
      { label: "10", value: 10 },
      { label: "9", value: 9 }
    ],
    dealerHand: [
      { label: "8", value: 8 },
      { label: "8", value: 8 }
    ],
    settled: false,
    result: "playing"
  };
  const winSettled = blackjackStand(winState, deterministicRandom([0]));
  assert.equal(winSettled.result, "win");

  const pushState: BlackjackState = {
    playerHand: [
      { label: "10", value: 10 },
      { label: "8", value: 8 }
    ],
    dealerHand: [
      { label: "10", value: 10 },
      { label: "8", value: 8 }
    ],
    settled: false,
    result: "playing"
  };
  const pushSettled = blackjackStand(pushState, deterministicRandom([0.5]));
  assert.equal(pushSettled.result, "push");

  const loseState: BlackjackState = {
    playerHand: [
      { label: "9", value: 9 },
      { label: "8", value: 8 }
    ],
    dealerHand: [
      { label: "10", value: 10 },
      { label: "8", value: 8 }
    ],
    settled: false,
    result: "playing"
  };
  const loseSettled = blackjackStand(loseState, deterministicRandom([0.5]));
  assert.equal(loseSettled.result, "lose");

  const run = { ...createTableState(1, deterministicRandom([0.2])), money: 100 };
  assert.equal(applyBlackjackPayout(run, winSettled).money, 130);
  assert.equal(applyBlackjackPayout(run, pushSettled).money, 105);
  assert.equal(applyBlackjackPayout(run, loseSettled).money, 85);
  assert.equal(applyBlackjackPayout({ ...run, ownedBonusIds: ["house-amulet"] }, winSettled).money, 140);
  assert.equal(applyBlackjackPayout({ ...run, ownedBonusIds: ["house-amulet"] }, pushSettled).money, 110);
  assert.equal(applyBlackjackPayout({ ...run, ownedBonusIds: ["house-amulet"] }, loseSettled).money, 90);
}

{
  const base: RunState = {
    ...createTableState(1, deterministicRandom([0.2])),
    phase: "blackjack",
    money: 100,
    blackjack: {
      playerHand: [{ label: "10", value: 10 }],
      dealerHand: [{ label: "9", value: 9 }],
      settled: true,
      result: "win"
    }
  };
  const upgraded = returnFromBlackjack({ ...base, ownedBonusIds: ["house-amulet" as const] });
  const regular = returnFromBlackjack(base);
  assert.equal(upgraded.money, 140);
  assert.equal(regular.money, 130);
  assert.equal(upgraded.phase, "kiosk");
  assert.equal(upgraded.blackjack, null);
}

{
  const live: BlackjackState = {
    playerHand: [
      { label: "10", value: 10 },
      { label: "5", value: 5 }
    ],
    dealerHand: [{ label: "9", value: 9 }],
    settled: false,
    result: "playing"
  };
  const hit = blackjackHit(live, deterministicRandom([0]));
  assert.equal(hit.settled, false);
  assert.equal(hit.playerHand.length, 3);
  assert.equal(handLabel(hit.playerHand).length > 0, true);
  assert.equal(drawCard(deterministicRandom([0])).label, "A");
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  assert.equal(isFullBoard(state.board), false);
  const row = state.board.filter((cell) => cell.row === 0).map((cell) => ({ ...cell, marked: true }));
  const board = state.board.map((cell) => row.find((marked) => marked.id === cell.id) ?? cell);
  const rewards = detectPatternRewards({ ...state, board });
  assert.ok(rewards.some((reward) => reward.kind === "row"));

  const skipped = skipPermanentBonus({ ...state, money: 44 });
  assert.equal(skipped.money, 44);
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const fullBoard = state.board.map((cell) => ({ ...cell, marked: true }));
  const normal = detectPatternRewards({ ...state, board: fullBoard, multiplier: 0.81 });
  const clutch = detectPatternRewards({ ...state, board: fullBoard, multiplier: 0.8 });
  const normalFull = normal.find((reward) => reward.id === "full-board");
  const clutchFull = clutch.find((reward) => reward.id === "full-board");

  assert.ok(normalFull);
  assert.ok(clutchFull);
  assert.equal(normalFull.money, TABLE_CONFIGS[state.tableIndex].fullBoardPayout.normal);
  assert.equal(clutchFull.money, TABLE_CONFIGS[state.tableIndex].fullBoardPayout.clutch);
  assert.ok(clutchFull.score > normalFull.score);
  assert.ok(clutchFull.multiplier > normalFull.multiplier);
}

{
  assert.equal(TABLE_CONFIGS[3].boardSize, 3);
  assert.equal(TABLE_CONFIGS[4].boardSize, 4);
  assert.equal(TABLE_CONFIGS[5].boardSize, 5);
  assert.ok(TABLE_CONFIGS[4].rowPayout > TABLE_CONFIGS[3].rowPayout);
  assert.ok(TABLE_CONFIGS[5].rowPayout > TABLE_CONFIGS[4].rowPayout);
  assert.ok(TABLE_CONFIGS[4].fullBoardPayout.normal > TABLE_CONFIGS[3].fullBoardPayout.normal);
  assert.ok(TABLE_CONFIGS[5].fullBoardPayout.normal > TABLE_CONFIGS[4].fullBoardPayout.normal);
}

{
  const asiloInicio = createTableState(1, deterministicRandom([0.2]));
  const asiloRow = asiloInicio.board.filter((cell) => cell.row === 0);
  const asiloScored = markCells(asiloInicio, asiloRow);
  assert.equal(asiloScored.recentRewards.find((reward) => reward.kind === "row")?.money, TABLE_CONFIGS[1].rowPayout);

  const bar = createTableState(4, deterministicRandom([0.2]));
  const barRow = bar.board.filter((cell) => cell.row === 0);
  const barScored = markCells(bar, barRow);
  assert.equal(barScored.recentRewards.find((reward) => reward.kind === "row")?.money, TABLE_CONFIGS[4].rowPayout);
  assert.notEqual(TABLE_CONFIGS[1].rowPayout, TABLE_CONFIGS[4].rowPayout);
}

{
  const asiloInicio = createTableState(1, deterministicRandom([0.2]));
  const asiloFullBoard = asiloInicio.board.map((cell) => ({ ...cell, marked: true }));
  const asiloRewards = detectPatternRewards({ ...asiloInicio, board: asiloFullBoard, multiplier: 0.81 });
  assert.equal(
    asiloRewards.find((reward) => reward.id === "full-board")?.money,
    TABLE_CONFIGS[1].fullBoardPayout.normal
  );

  const boss = createTableState(5, deterministicRandom([0.2]));
  const bossFullBoard = boss.board.map((cell) => ({ ...cell, marked: true }));
  const bossRewards = detectPatternRewards({ ...boss, board: bossFullBoard, multiplier: 0.81 });
  assert.equal(
    bossRewards.find((reward) => reward.id === "full-board")?.money,
    TABLE_CONFIGS[5].fullBoardPayout.normal
  );
  assert.notEqual(TABLE_CONFIGS[1].fullBoardPayout.normal, TABLE_CONFIGS[5].fullBoardPayout.normal);
}

{
  const lowPressure = {
    ...createTableState(1, deterministicRandom([0.2])),
    round: 2,
    multiplier: 1.1
  };
  const marked = drawNextBall(lowPressure, deterministicRandom([0, 0]));
  assert.equal(marked.round, 3);
  assert.ok(marked.parcaMark);
  assert.equal(marked.phase, "table");
  assert.notEqual(marked.board.find((cell) => cell.id === marked.parcaMark?.cellId)?.value, marked.currentBall);

  const warded = wardParcaMark(marked, marked.parcaMark!.cellId);
  assert.equal(warded.parcaMark, null);
  assert.equal(warded.multiplier, Number((marked.multiplier + 0.05).toFixed(2)));
  assert.equal(warded.selectedCellId, marked.parcaMark!.cellId);
}

{
  const base = {
    ...createTableState(1, deterministicRandom([0.2])),
    round: 2,
    multiplier: 1.1
  };
  const marked = drawNextBall(base, deterministicRandom([0, 0]));
  const markedCellId = marked.parcaMark!.cellId;
  const expired = drawNextBall(marked, deterministicRandom([0]));
  assert.equal(expired.parcaMark, null);
  assert.equal(expired.board.find((cell) => cell.id === markedCellId)?.dirty, true);
  assert.equal(expired.multiplier, Number((marked.multiplier - 0.08 - MULTIPLIER_DECAY_PER_BALL).toFixed(2)));
  assert.equal(expired.phase, "table");
}

{
  const state = createTableState(1, deterministicRandom([0.2]));
  const target = state.board[0];
  const stamped = markMatchingCell(
    {
      ...state,
      currentBall: target.value,
      multiplier: 1,
      parcaMark: { cellId: target.id, round: state.round }
    },
    target.id
  );
  assert.equal(stamped.parcaMark, null);
  assert.equal(stamped.multiplier, 1.05);
  assert.equal(stamped.board[target.id].marked, true);
}

{
  const tutorial = {
    ...createTableState(0, deterministicRandom([0.2])),
    round: 2,
    multiplier: 0.9
  };
  const next = drawNextBall(tutorial, deterministicRandom([0, 0]));
  assert.equal(next.parcaMark, null);

  const freeOpen = {
    ...createTableState(1, deterministicRandom([0.2])),
    round: 2,
    multiplier: 0.9
  };
  assert.equal(drawNextBall(freeOpen, deterministicRandom([0, 0]), { free: true }).parcaMark, null);
}

{
  const bossConfig = TABLE_CONFIGS[5].boss;
  assert.ok(bossConfig);
  assert.equal(bossConfig.target >= 160, true);
  assert.equal(bossConfig.advanceMax <= 5, true);
}

{
  const storage = memoryStorage();
  const created = createDefaultProfile(new Date("2026-01-01T00:00:00.000Z"));
  const unlocked = unlockAchievements(created, ["first-row", "first-row", "first-contract"], new Date("2026-01-02T00:00:00.000Z"));
  assert.equal(unlocked.newlyUnlocked.length, 2);
  assert.equal(getProfileProgress(unlocked.profile).unlocked, 2);
  saveProfile(storage, unlocked.profile);
  const loaded = loadProfile(storage);
  assert.equal(getProfileProgress(loaded).unlocked, 2);
  assert.equal(unlockAchievements(loaded, ["first-row"]).newlyUnlocked.length, 0);
}

{
  const created = createDefaultProfile(new Date("2026-01-01T00:00:00.000Z"));
  const first = unlockAchievements(created, ["first-row"], new Date("2026-01-02T00:00:00.000Z"));
  const second = unlockAchievements(first.profile, ["first-diagonal"], new Date("2026-01-03T00:00:00.000Z"));
  const third = unlockAchievements(second.profile, ["first-contract"], new Date("2026-01-04T00:00:00.000Z"));
  const recent = listRecentUnlocks(third.profile, 2);

  assert.deepEqual(
    recent.map((unlock) => unlock.id),
    ["first-contract", "first-diagonal"]
  );
  assert.equal(recent[0].unlockedAt, "2026-01-04T00:00:00.000Z");
}

{
  const created = createDefaultProfile(new Date("2026-01-01T00:00:00.000Z"));
  const categoryProgress = getProfileProgressByCategory(created);
  const amuletDefinitions = listAchievementsByCategory("amulets");

  assert.equal(Object.keys(ACHIEVEMENT_DEFINITIONS).length, 18);
  assert.deepEqual(ACHIEVEMENT_CATEGORIES, ["core", "table", "kiosk", "cards", "amulets", "contracts", "parca", "boss"]);
  assert.equal(getProfileProgress(created).total, 18);
  assert.equal(getProfilePointProgress(created).total, 42);
  assert.equal(categoryProgress.table.total, 5);
  assert.equal(categoryProgress.amulets.total, 3);
  assert.deepEqual(
    amuletDefinitions.map((definition) => definition.id),
    ["first-amulet", "amulet-trinity", "amulet-collector"]
  );

  for (const definition of Object.values(ACHIEVEMENT_DEFINITIONS)) {
    assert.ok(definition.unlockHint.trim().length > 0);
    assert.ok(definition.flavor.trim().length > 0);
    assert.ok(definition.cosmeticRewards.length > 0);
    assert.ok(definition.sortOrder > 0);
    if (definition.cosmeticFlag) {
      assert.ok(definition.cosmeticRewards.some((reward) => reward.flag === definition.cosmeticFlag));
    }
  }
}

{
  const created = createDefaultProfile(new Date("2026-01-01T00:00:00.000Z"));
  const unlocked = unlockAchievements(
    created,
    ["first-amulet", "amulet-collector", "parca-warded"],
    new Date("2026-01-05T00:00:00.000Z")
  );
  const pointProgress = getProfilePointProgress(unlocked.profile);
  const cosmeticFlags = listUnlockedCosmeticRewards(unlocked.profile).map((reward) => reward.flag);

  assert.equal(unlocked.newlyUnlocked.length, 3);
  assert.equal(pointProgress.unlocked, 9);
  assert.equal(pointProgress.locked, 33);
  assert.equal(pointProgress.percent, 21);
  assert.equal(listLockedAchievements(unlocked.profile).length, 15);
  assert.equal(unlocked.profile.cosmetics.title_coleccionista_de_amuletos, true);
  assert.equal(unlocked.profile.cosmetics.fx_amulet_constellation, true);
  assert.equal(unlocked.profile.cosmetics.frame_relicario, true);
  assert.equal(unlocked.profile.cosmetics.badge_parca_ward, true);
  assert.ok(cosmeticFlags.includes("title_coleccionista_de_amuletos"));
  assert.ok(cosmeticFlags.includes("fx_ward_glow"));
}

{
  const loaded = loadProfile(
    memoryStorage({
      [PROFILE_STORAGE_KEY]: JSON.stringify({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        achievements: {
          "amulet-collector": { unlockedAt: "2026-01-06T00:00:00.000Z" }
        },
        cosmetics: {}
      })
    })
  );
  const rewards = listUnlockedCosmeticRewards(loaded);

  assert.equal(loaded.cosmetics.title_coleccionista_de_amuletos, true);
  assert.equal(loaded.cosmetics.fx_amulet_constellation, true);
  assert.equal(loaded.cosmetics.frame_relicario, true);
  assert.equal(rewards.length, 3);
}

{
  const state = {
    ...createTableState(1, deterministicRandom([0.2])),
    phase: "tableWon" as const,
    recentRewards: [
      {
        id: "full-board",
        kind: "full" as const,
        label: "TIMBA! Carton lleno al limite",
        score: 340,
        money: 100,
        multiplier: 0.6
      }
    ],
    scoredPatternIds: new Set(["row-0", "row-1", "row-2", "full-board"]),
    ownedBonusIds: ["heavy-stamp", "lucky-cup", "house-amulet"] as PermanentBonusId[],
    activeContractIds: ["kiosk-friend", "thin-air", "dirty-cash"] as RunState["activeContractIds"]
  };
  const ids = achievementIdsFromRunState(state);

  assert.ok(ids.includes("first-table"));
  assert.ok(ids.includes("first-timba"));
  assert.ok(ids.includes("row-chain-3"));
  assert.ok(ids.includes("clutch-timba"));
  assert.ok(ids.includes("first-amulet"));
  assert.ok(ids.includes("amulet-trinity"));
  assert.ok(ids.includes("contract-streak"));
  assert.deepEqual(achievementIdsFromKioskVisits(1), ["first-kiosk"]);
  assert.deepEqual(achievementIdsFromKioskVisits(3), ["first-kiosk", "kiosk-regular"]);
  assert.deepEqual(achievementIdsFromBlackjackResult("win", 1), ["first-blackjack"]);
  assert.deepEqual(achievementIdsFromBlackjackResult("win", 3), ["first-blackjack", "blackjack-streak"]);
  assert.deepEqual(achievementIdsFromBlackjackResult("lose", 3), []);
}

{
  assert.equal(TUTORIAL_GUIDE.coverageChecklist.length, 8);
  assert.ok(TUTORIAL_GUIDE.steps.length >= 10);
  assert.ok(TUTORIAL_GUIDE.coverageChecklist.every((item) => item.required && item.stepIds.length > 0));
  assert.ok(TUTORIAL_GUIDE.orderedTopics.includes("directed-cheats"));
  assert.ok(TUTORIAL_GUIDE.orderedTopics.includes("loss-condition"));
  assert.equal(clampVolumeLevel(-1), 0);
  assert.equal(clampVolumeLevel(2), 1);
  assert.equal(clampVolumeMultiplier(-1), 0);
  assert.equal(clampVolumeMultiplier(3), 2);
}

{
  const summary = createRunSummary({
    score: 1200,
    money: 80,
    tableIndex: 3,
    tableTitle: "Bar",
    won: false,
    reason: "Prueba",
    rounds: 12,
    calledBalls: 10,
    multiplier: 1.5,
    ownedBonusIds: ["heavy-stamp"],
    timestamp: 1000
  });
  const entry = { ...summary, leaderboardScore: scoreRunForLeaderboard(summary) };
  const lowerSummary = createRunSummary({ ...summary, score: 100, timestamp: 900 });
  const lower = { ...lowerSummary, leaderboardScore: scoreRunForLeaderboard(lowerSummary) };
  const board: Leaderboard = insertLeaderboardEntry([], lower);
  const ranked = insertLeaderboardEntry(board, entry);
  assert.equal(getBestEntry(ranked), entry);
  assert.equal(rankEntry(ranked, entry), 1);

  const storage = memoryStorage();
  saveLeaderboard(storage, ranked);
  const loaded = loadLeaderboard(storage);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].leaderboardScore, entry.leaderboardScore);
}

{
  const legacySummary = createRunSummary({
    score: 800,
    money: 40,
    tableIndex: 1,
    tableTitle: "Asilo",
    won: false,
    reason: "Legacy",
    rounds: 8,
    calledBalls: 8,
    multiplier: 1.2,
    ownedBonusIds: [],
    timestamp: 500,
    scoreVersion: "v2"
  });
  const storage = memoryStorage({
    [LEADERBOARD_STORAGE_KEY]: JSON.stringify([{ ...legacySummary, leaderboardScore: 1 }])
  });
  const [loaded] = loadLeaderboard(storage);

  assert.equal(loaded.scoreVersion, LEADERBOARD_SCORE_VERSION);
  assert.equal(loaded.leaderboardScore, scoreRunForLeaderboard(loaded));
}

{
  assert.ok(getLocalChaseTargetScore(4) > getLocalChaseTargetScore(1));
  assert.equal(getLocalChaseProgress(0, 2), 0);
  assert.ok(getLocalChaseProgress(getLocalChaseTargetScore(2), 2) >= 1);
  assert.equal(getLocalChaseProgress(getLocalChaseTargetScore(2) * 2, 2), 1.35);
}

{
  const base = createRunSummary({
    score: 1000,
    money: 50,
    tableIndex: 2,
    tableTitle: "Patio",
    won: false,
    reason: "Base",
    rounds: 10,
    calledBalls: 5,
    multiplier: 1.25,
    ownedBonusIds: []
  });
  const baseScore = scoreRunForLeaderboard(base);
  assert.ok(scoreRunForLeaderboard({ ...base, money: 60 }) > baseScore);
  assert.ok(scoreRunForLeaderboard({ ...base, multiplier: 2.25 }) > baseScore);
  assert.ok(scoreRunForLeaderboard({ ...base, ownedBonusIds: ["heavy-stamp"] }) > baseScore);
  assert.ok(scoreRunForLeaderboard({ ...base, won: true }) > baseScore);
}

{
  const clutch = createRunSummary({
    score: 4200,
    money: 140,
    tableIndex: 4,
    tableTitle: "Bar de mala muerte",
    won: true,
    reason: "Cierre al borde de la Parca.",
    rounds: 18,
    calledBalls: 17,
    multiplier: 0.72,
    ownedBonusIds: ["quick-ritual", "slow-death", "house-amulet"],
    timestamp: 2000
  });
  const breakdown = getLeaderboardScoreBreakdown(clutch);
  const componentTotal = breakdown.components.reduce((sum, component) => sum + component.points, 0);

  assert.equal(breakdown.finalScore, scoreRunForLeaderboard(clutch));
  assert.equal(componentTotal, breakdown.rawTotal);
  assert.ok(breakdown.clutchBonus > 0);
  assert.ok(breakdown.streakBonus > 0);
  assert.ok(breakdown.localChaseBonus > 0);
  assert.ok(breakdown.components.some((component) => component.id === "clutch" && component.tone === "pressure"));
  assert.ok(breakdown.components.some((component) => component.id === "streak" && component.tone === "progress"));
  assert.ok(breakdown.components.some((component) => component.id === "local-chase" && component.tone === "progress"));
  assert.ok(breakdown.scoreToNextGrade >= 0);
  assert.ok(breakdown.gradeProgress >= 0 && breakdown.gradeProgress <= 1);
  assert.ok(breakdown.medalLabel.length > 0);
}

{
  const lateLoss = createRunSummary({
    score: 4200,
    money: 140,
    tableIndex: 4,
    tableTitle: "Bar de mala muerte",
    won: false,
    reason: "La Parca cerro la mesa.",
    rounds: 18,
    calledBalls: 17,
    multiplier: 0.72,
    ownedBonusIds: ["quick-ritual", "slow-death", "house-amulet"],
    timestamp: 2100
  });
  const lateWin = createRunSummary({
    score: 4200,
    money: 140,
    tableIndex: 4,
    tableTitle: "Bar de mala muerte",
    won: true,
    reason: "Cierre al borde de la Parca.",
    rounds: 18,
    calledBalls: 17,
    multiplier: 0.72,
    ownedBonusIds: ["quick-ritual", "slow-death", "house-amulet"],
    timestamp: 2200
  });
  const earlyWin = createRunSummary({
    score: 4200,
    money: 140,
    tableIndex: 1,
    tableTitle: "Asilo",
    won: true,
    reason: "Cierre temprano.",
    rounds: 18,
    calledBalls: 17,
    multiplier: 0.72,
    ownedBonusIds: ["quick-ritual", "slow-death", "house-amulet"],
    timestamp: 2300
  });
  const lateLossBreakdown = getLeaderboardScoreBreakdown(lateLoss);
  const lateWinBreakdown = getLeaderboardScoreBreakdown(lateWin);
  const earlyWinBreakdown = getLeaderboardScoreBreakdown(earlyWin);

  assert.equal(lateLossBreakdown.clutchBonus, 0);
  assert.equal(lateLossBreakdown.streakBonus, 0);
  assert.ok(lateWinBreakdown.clutchBonus > lateLossBreakdown.clutchBonus);
  assert.ok(lateWinBreakdown.streakBonus > lateLossBreakdown.streakBonus);
  assert.ok(getLocalChaseTargetScore(lateWin.tableIndex) > getLocalChaseTargetScore(earlyWin.tableIndex));
  assert.ok(lateWinBreakdown.localChaseBonus > lateLossBreakdown.localChaseBonus);
  assert.ok(scoreRunForLeaderboard(lateWin) > scoreRunForLeaderboard(lateLoss));
  assert.ok(scoreRunForLeaderboard(lateWin) > scoreRunForLeaderboard(earlyWin));
}

console.log("TIMBA! rule tests passed.");
