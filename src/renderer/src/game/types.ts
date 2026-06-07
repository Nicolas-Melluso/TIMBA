import type { ContractId } from "./contracts.js";

export type GamePhase =
  | "menu"
  | "tutorial"
  | "table"
  | "kiosk"
  | "blackjack"
  | "tableWon"
  | "contract"
  | "upgrade"
  | "runWon"
  | "lost";

export type PatternKind = "row" | "diagonal" | "full" | "quick";

export type ShopItemId =
  | "force-ball"
  | "fuzzy-stamp"
  | "swap-cells"
  | "strong-coffee"
  | "bump-number"
  | "lower-number"
  | "erase-bad-call";

export type DirectedShopItemId = "fuzzy-stamp" | "swap-cells" | "bump-number" | "lower-number";

export type TableId = "tutorial" | "asilo-inicio" | "asilo-patio" | "asilo-tv" | "bar" | "boss";

export type PermanentBonusId =
  | "heavy-stamp"
  | "lucky-cup"
  | "marked-cage"
  | "wide-kiosk"
  | "slow-death"
  | "dirty-ledger"
  | "blurred-sigil"
  | "quick-ritual"
  | "cross-charm"
  | "house-amulet"
  | "kiosk-amulet";

export type RandomFn = () => number;

export type TableConfig = {
  id: TableId;
  title: string;
  subtitle: string;
  boardSize: number;
  ballMin: number;
  ballMax: number;
  startingMoney: number;
  rowPayout: number;
  fullBoardPayout: {
    normal: number;
    clutch: number;
  };
  isTutorial?: boolean;
  boss?: {
    name: string;
    target: number;
    advanceMin: number;
    advanceMax: number;
  };
};

export type BoardCell = {
  id: number;
  row: number;
  col: number;
  value: number;
  marked: boolean;
  dirty?: boolean;
};

export type PatternReward = {
  id: string;
  kind: PatternKind;
  label: string;
  score: number;
  money: number;
  multiplier: number;
};

export type ShopItem = {
  id: ShopItemId;
  label: string;
  cost: number;
  hint: string;
  flavor: string;
};

export type PermanentBonus = {
  id: PermanentBonusId;
  label: string;
  cost: number;
  hint: string;
  flavor: string;
};

export type BossState = {
  name: string;
  progress: number;
  target: number;
};

export type BossAction = {
  label: string;
  detail: string;
  cellId?: number;
};

export type ParcaMark = {
  cellId: number;
  round: number;
};

export type BlackjackCard = {
  label: string;
  value: number;
};

export type BlackjackState = {
  playerHand: BlackjackCard[];
  dealerHand: BlackjackCard[];
  settled: boolean;
  result: "playing" | "win" | "lose" | "push";
};

export type PendingShopAction = {
  itemId: DirectedShopItemId;
  cost: number;
  firstCellId: number | null;
};

export type ShopUsageCheck = {
  allowed: boolean;
  blockedMessage: string | null;
};

export type RunState = {
  phase: GamePhase;
  tableIndex: number;
  board: BoardCell[];
  calledBalls: number[];
  currentBall: number | null;
  forcedBall: number | null;
  selectedCellId: number | null;
  swapFirstCellId: number | null;
  swapMode: boolean;
  fuzzyStampMode: boolean;
  money: number;
  score: number;
  multiplier: number;
  round: number;
  kioskSeconds: number;
  kioskOfferRound: number | null;
  shopOfferIds: ShopItemId[];
  upgradeOfferIds: PermanentBonusId[];
  ownedBonusIds: PermanentBonusId[];
  contractOfferIds: ContractId[];
  activeContractIds: ContractId[];
  scoredPatternIds: Set<string>;
  recentRewards: PatternReward[];
  tutorialStep: number;
  pendingShopAction: PendingShopAction | null;
  blackjackPlayedThisVisit: boolean;
  blackjack: BlackjackState | null;
  boss: BossState | null;
  bossAction: BossAction | null;
  parcaMark: ParcaMark | null;
  lastMessage: string;
  lostReason: string;
};
