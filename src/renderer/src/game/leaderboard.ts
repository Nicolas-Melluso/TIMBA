export const LEADERBOARD_STORAGE_KEY = "timba.leaderboard.v1";
export const LEADERBOARD_SCORE_VERSION = "v4";
export const LEADERBOARD_GRADE_ORDER = ["D", "C", "B", "A", "S", "SS", "SSS"] as const;

export type LeaderboardGrade = (typeof LEADERBOARD_GRADE_ORDER)[number];
export type LeaderboardMedal = "none" | "bronze" | "silver" | "gold";
export type LeaderboardScoreComponentId =
  | "base"
  | "money"
  | "table-progress"
  | "win"
  | "multiplier"
  | "round-discipline"
  | "pressure"
  | "collection"
  | "consistency"
  | "clutch"
  | "streak"
  | "local-chase";
export type LeaderboardScoreTone = "core" | "economy" | "progress" | "skill" | "pressure" | "collection";

export const LEADERBOARD_GRADE_THRESHOLDS: Record<LeaderboardGrade, number> = {
  D: 0,
  C: 2000,
  B: 4500,
  A: 8000,
  S: 12000,
  SS: 18000,
  SSS: 26000
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RunSummaryInput {
  score: number;
  money: number;
  tableIndex: number;
  tableTitle: string;
  won: boolean;
  reason: string;
  rounds: number;
  calledBalls: number;
  multiplier: number;
  ownedBonusIds: readonly string[];
  timestamp?: number;
  scoreVersion?: string;
}

export interface RunSummary {
  score: number;
  money: number;
  tableIndex: number;
  tableTitle: string;
  won: boolean;
  reason: string;
  rounds: number;
  calledBalls: number;
  multiplier: number;
  ownedBonusIds: string[];
  timestamp: number;
  scoreVersion: string;
}

export interface LeaderboardEntry extends RunSummary {
  leaderboardScore: number;
}

export type Leaderboard = LeaderboardEntry[];

export interface LeaderboardScoreComponent {
  id: LeaderboardScoreComponentId;
  label: string;
  points: number;
  tone: LeaderboardScoreTone;
}

export interface LeaderboardScoreBreakdown {
  baseScore: number;
  moneyBonus: number;
  tableProgressBonus: number;
  winBonus: number;
  multiplierBonus: number;
  roundDisciplineBonus: number;
  pressureBonus: number;
  collectionBonus: number;
  consistencyBonus: number;
  clutchBonus: number;
  streakBonus: number;
  localChaseBonus: number;
  rawTotal: number;
  finalScore: number;
  grade: LeaderboardGrade;
  nextGrade: LeaderboardGrade | null;
  nextGradeScore: number | null;
  scoreToNextGrade: number;
  gradeProgress: number;
  medal: LeaderboardMedal;
  medalLabel: string;
  components: LeaderboardScoreComponent[];
}

function toFiniteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function toNonNegativeInteger(value: number, fallback = 0): number {
  const safe = Math.floor(toFiniteNumber(value, fallback));
  return safe >= 0 ? safe : fallback;
}

function toTimestamp(value: number | undefined): number {
  const now = Date.now();
  if (value === undefined) {
    return now;
  }
  const safe = Math.floor(toFiniteNumber(value, now));
  return safe > 0 ? safe : now;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueOwnedBonusCount(summary: RunSummary): number {
  return new Set(summary.ownedBonusIds.map((id) => id.trim()).filter(Boolean)).size;
}

function pressureCount(summary: RunSummary): number {
  return Math.max(summary.rounds, summary.calledBalls);
}

function scoreComponent(
  id: LeaderboardScoreComponentId,
  label: string,
  points: number,
  tone: LeaderboardScoreTone
): LeaderboardScoreComponent {
  return { id, label, points, tone };
}

export function getLocalChaseTargetScore(tableIndex: number): number {
  const safeTableIndex = toNonNegativeInteger(tableIndex);
  return 1800 + safeTableIndex * 950 + safeTableIndex * safeTableIndex * 120;
}

export function getLocalChaseProgress(score: number, tableIndex: number): number {
  const safeScore = toNonNegativeInteger(score);
  const target = getLocalChaseTargetScore(tableIndex);
  return clamp(safeScore / target, 0, 1.35);
}

export function createRunSummary(input: RunSummaryInput): RunSummary {
  return {
    score: toNonNegativeInteger(input.score),
    money: toNonNegativeInteger(input.money),
    tableIndex: toNonNegativeInteger(input.tableIndex),
    tableTitle: String(input.tableTitle ?? "").trim(),
    won: Boolean(input.won),
    reason: String(input.reason ?? "").trim(),
    rounds: toNonNegativeInteger(input.rounds),
    calledBalls: toNonNegativeInteger(input.calledBalls),
    multiplier: Math.max(0, toFiniteNumber(input.multiplier, 0)),
    ownedBonusIds: [...input.ownedBonusIds].map((id) => String(id)),
    timestamp: toTimestamp(input.timestamp),
    scoreVersion: String(input.scoreVersion ?? LEADERBOARD_SCORE_VERSION)
  };
}

export function getLeaderboardGrade(score: number): LeaderboardGrade {
  const safe = toNonNegativeInteger(score);

  for (let index = LEADERBOARD_GRADE_ORDER.length - 1; index >= 0; index -= 1) {
    const grade = LEADERBOARD_GRADE_ORDER[index];
    if (safe >= LEADERBOARD_GRADE_THRESHOLDS[grade]) {
      return grade;
    }
  }

  return "D";
}

export function getNextLeaderboardGrade(score: number): LeaderboardGrade | null {
  const grade = getLeaderboardGrade(score);
  const index = LEADERBOARD_GRADE_ORDER.indexOf(grade);
  return LEADERBOARD_GRADE_ORDER[index + 1] ?? null;
}

export function getLeaderboardMedal(score: number): LeaderboardMedal {
  const grade = getLeaderboardGrade(score);
  if (grade === "SSS" || grade === "SS") {
    return "gold";
  }
  if (grade === "S" || grade === "A") {
    return "silver";
  }
  if (grade === "B" || grade === "C") {
    return "bronze";
  }
  return "none";
}

export function getLeaderboardMedalLabel(medal: LeaderboardMedal): string {
  if (medal === "gold") {
    return "Oro";
  }
  if (medal === "silver") {
    return "Plata";
  }
  if (medal === "bronze") {
    return "Bronce";
  }
  return "Sin medalla";
}

export function getLeaderboardScoreBreakdown(summary: RunSummary): LeaderboardScoreBreakdown {
  const pressure = pressureCount(summary);
  const ownedCount = uniqueOwnedBonusCount(summary);
  const baseScore = summary.score;
  const moneyBonus = Math.floor(Math.sqrt(summary.money) * 44);
  const tableProgressBonus = summary.tableIndex * 360;
  const winBonus = summary.won ? 1250 : 0;
  const multiplierBonus = Math.floor(Math.max(0, summary.multiplier - 1) * 360);
  const expectedPressure = 9 + summary.tableIndex * 3;
  const roundDisciplineBonus = pressure > 0 ? Math.floor(clamp((expectedPressure + 3 - pressure) * 55, -360, 820)) : 0;
  const pressureBonus = Math.floor(Math.log2(pressure + 1) * 190);
  const collectionBonus = ownedCount * 75 + (ownedCount >= 3 ? 180 : 0) + (ownedCount >= 6 ? 320 : 0);
  const consistencyBonus = summary.won && pressure >= 5 ? 260 + Math.min(620, pressure * 22) : 0;
  const clutchBonus =
    summary.won && summary.multiplier <= 0.85 ? 700 + Math.floor(clamp((0.85 - summary.multiplier) / 0.85, 0, 1) * 800) : 0;
  const streakBonus = summary.won ? Math.floor(clamp((summary.tableIndex + 1) * 220 + ownedCount * 35, 0, 1600)) : 0;
  const localTarget = getLocalChaseTargetScore(summary.tableIndex);
  const localProgress = getLocalChaseProgress(summary.score, summary.tableIndex);
  const localProgressBonus = Math.floor(localProgress * 900);
  const localClearBonus = summary.score >= localTarget ? 400 + Math.min(500, Math.floor((summary.score - localTarget) / 180)) : 0;
  const localWinBonus = summary.won ? 250 : 0;
  const localChaseBonus = localProgressBonus + localClearBonus + localWinBonus;

  const rawTotal =
    baseScore +
    moneyBonus +
    tableProgressBonus +
    winBonus +
    multiplierBonus +
    roundDisciplineBonus +
    pressureBonus +
    collectionBonus +
    consistencyBonus +
    clutchBonus +
    streakBonus +
    localChaseBonus;
  const finalScore = Math.max(0, Math.floor(rawTotal));
  const grade = getLeaderboardGrade(finalScore);
  const nextGrade = getNextLeaderboardGrade(finalScore);
  const nextGradeScore = nextGrade ? LEADERBOARD_GRADE_THRESHOLDS[nextGrade] : null;
  const scoreToNextGrade = nextGradeScore ? Math.max(0, nextGradeScore - finalScore) : 0;
  const currentGradeScore = LEADERBOARD_GRADE_THRESHOLDS[grade];
  const gradeProgress =
    nextGradeScore === null ? 1 : clamp((finalScore - currentGradeScore) / (nextGradeScore - currentGradeScore), 0, 1);
  const medal = getLeaderboardMedal(finalScore);
  const medalLabel = getLeaderboardMedalLabel(medal);
  const components = [
    scoreComponent("base", "Mesa", baseScore, "core"),
    scoreComponent("money", "Plata guardada", moneyBonus, "economy"),
    scoreComponent("table-progress", "Progreso de mesa", tableProgressBonus, "progress"),
    scoreComponent("win", "Cierre ganador", winBonus, "skill"),
    scoreComponent("multiplier", "Multiplicador vivo", multiplierBonus, "skill"),
    scoreComponent("round-discipline", "Ritmo limpio", roundDisciplineBonus, "skill"),
    scoreComponent("pressure", "Presion aguantada", pressureBonus, "pressure"),
    scoreComponent("collection", "Trampas compradas", collectionBonus, "collection"),
    scoreComponent("consistency", "Cierre estable", consistencyBonus, "skill"),
    scoreComponent("clutch", "Clutch contra la Parca", clutchBonus, "pressure"),
    scoreComponent("streak", "Racha de mesas", streakBonus, "progress"),
    scoreComponent("local-chase", "Objetivo local de mesa", localChaseBonus, "progress")
  ].filter((component) => component.points !== 0 || component.id === "base");

  return {
    baseScore,
    moneyBonus,
    tableProgressBonus,
    winBonus,
    multiplierBonus,
    roundDisciplineBonus,
    pressureBonus,
    collectionBonus,
    consistencyBonus,
    clutchBonus,
    streakBonus,
    localChaseBonus,
    rawTotal,
    finalScore,
    grade,
    nextGrade,
    nextGradeScore,
    scoreToNextGrade,
    gradeProgress,
    medal,
    medalLabel,
    components
  };
}

export function scoreRunForLeaderboard(summary: RunSummary): number {
  return getLeaderboardScoreBreakdown(summary).finalScore;
}

function compareEntriesDesc(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.leaderboardScore !== b.leaderboardScore) {
    return b.leaderboardScore - a.leaderboardScore;
  }
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  if (a.tableIndex !== b.tableIndex) {
    return b.tableIndex - a.tableIndex;
  }
  return b.timestamp - a.timestamp;
}

export function insertLeaderboardEntry(board: Leaderboard, entry: LeaderboardEntry, max = 10): Leaderboard {
  const limit = Math.max(1, toNonNegativeInteger(max, 10));
  return [...board, entry].sort(compareEntriesDesc).slice(0, limit);
}

export function loadLeaderboard(storage: StorageLike): Leaderboard {
  const raw = storage.getItem(LEADERBOARD_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const source = item as Partial<LeaderboardEntry>;
        const summary = createRunSummary({
          score: Number(source.score),
          money: Number(source.money),
          tableIndex: Number(source.tableIndex),
          tableTitle: String(source.tableTitle ?? ""),
          won: Boolean(source.won),
          reason: String(source.reason ?? ""),
          rounds: Number(source.rounds),
          calledBalls: Number(source.calledBalls),
          multiplier: Number(source.multiplier),
          ownedBonusIds: Array.isArray(source.ownedBonusIds) ? source.ownedBonusIds.map((v) => String(v)) : [],
          timestamp: Number(source.timestamp),
          scoreVersion: LEADERBOARD_SCORE_VERSION
        });

        return {
          ...summary,
          leaderboardScore: scoreRunForLeaderboard(summary)
        };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort(compareEntriesDesc);
  } catch {
    return [];
  }
}

export function saveLeaderboard(storage: StorageLike, board: Leaderboard): void {
  storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(board));
}

export function getBestEntry(board: Leaderboard): LeaderboardEntry | null {
  if (board.length === 0) {
    return null;
  }
  return [...board].sort(compareEntriesDesc)[0] ?? null;
}

export function rankEntry(board: Leaderboard, entry: LeaderboardEntry): number {
  const sorted = [...board].sort(compareEntriesDesc);
  const index = sorted.findIndex((candidate) => candidate === entry);
  if (index >= 0) {
    return index + 1;
  }

  return insertLeaderboardEntry(sorted, entry, sorted.length + 1).findIndex((candidate) => candidate === entry) + 1;
}

export function getEntryAtRank(board: Leaderboard, rank: number): LeaderboardEntry | null {
  const safeRank = toNonNegativeInteger(rank, 1);
  if (safeRank <= 0) {
    return null;
  }
  const sorted = [...board].sort(compareEntriesDesc);
  return sorted[safeRank - 1] ?? null;
}

export function getPercentileFromRank(rank: number, boardSize: number): number {
  const safeRank = toNonNegativeInteger(rank, 1);
  const safeSize = Math.max(1, toNonNegativeInteger(boardSize, 1));
  if (safeRank > safeSize) {
    return 0;
  }
  const position = (safeSize - safeRank + 1) / safeSize;
  return Math.floor(position * 100);
}

export function getScoreDeltaToNextRank(board: Leaderboard, entry: LeaderboardEntry): number {
  const rank = rankEntry(board, entry);
  const sorted = [...board].sort(compareEntriesDesc);
  if (rank <= 1) {
    return 0;
  }
  const ahead = sorted[rank - 2];
  if (!ahead) {
    return 0;
  }
  return Math.max(0, ahead.leaderboardScore - entry.leaderboardScore + 1);
}
