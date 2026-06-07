import { TABLE_CONFIGS } from "./config.js";
import type { AchievementId } from "./profile.js";
import type { RunState } from "./types.js";

type RunAchievementState = Pick<
  RunState,
  "activeContractIds" | "ownedBonusIds" | "phase" | "recentRewards" | "scoredPatternIds" | "tableIndex"
>;

function hasReward(state: RunAchievementState, kind: RunState["recentRewards"][number]["kind"]): boolean {
  return state.recentRewards.some((reward) => reward.kind === kind);
}

function isClutchFullReward(reward: RunState["recentRewards"][number]): boolean {
  if (reward.kind !== "full") return false;
  if (reward.multiplier >= 0.6) return true;
  return reward.label.toLowerCase().includes("limite");
}

export function achievementIdsFromRunState(state: RunAchievementState): AchievementId[] {
  const idSet = new Set<AchievementId>();

  if (hasReward(state, "row")) {
    idSet.add("first-row");
  }
  if (hasReward(state, "diagonal")) {
    idSet.add("first-diagonal");
  }
  if (hasReward(state, "quick")) {
    idSet.add("speed-stamp");
  }

  const scoredRows = Array.from(state.scoredPatternIds).filter((id) => id.startsWith("row-")).length;
  if (scoredRows >= 3) {
    idSet.add("row-chain-3");
  }

  if (state.recentRewards.some((reward) => isClutchFullReward(reward))) {
    idSet.add("clutch-timba");
  }

  if (state.phase === "tableWon" && !TABLE_CONFIGS[state.tableIndex].isTutorial) {
    idSet.add("first-table");
    idSet.add("first-timba");
    if (state.tableIndex === TABLE_CONFIGS.length - 1) {
      idSet.add("boss-defeated");
    }
  }

  if (state.activeContractIds.length >= 1) {
    idSet.add("first-contract");
  }
  if (state.ownedBonusIds.length >= 1) {
    idSet.add("first-amulet");
  }
  if (state.ownedBonusIds.length >= 3) {
    idSet.add("amulet-trinity");
  }
  if (state.ownedBonusIds.length >= 6) {
    idSet.add("amulet-collector");
  }

  if (state.activeContractIds.length >= 3) {
    idSet.add("contract-streak");
  }

  return Array.from(idSet);
}

export function achievementIdsFromKioskVisits(uniqueVisitCount: number): AchievementId[] {
  return uniqueVisitCount >= 3 ? ["first-kiosk", "kiosk-regular"] : ["first-kiosk"];
}

export function achievementIdsFromBlackjackResult(result: "playing" | "win" | "lose" | "push" | undefined, winStreak: number): AchievementId[] {
  if (result !== "win") {
    return [];
  }
  return winStreak >= 3 ? ["first-blackjack", "blackjack-streak"] : ["first-blackjack"];
}
