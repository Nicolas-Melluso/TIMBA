import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "package.json",
  "electron.vite.config.ts",
  "tsconfig.json",
  "src/main/index.ts",
  "src/preload/index.ts",
  "src/renderer/index.html",
  "src/renderer/src/main.ts",
  "src/renderer/src/game/types.ts",
  "src/renderer/src/game/buildInfo.ts",
  "src/renderer/src/game/config.ts",
  "src/renderer/src/game/rules.ts",
  "src/renderer/src/game/blackjack.ts",
  "src/renderer/src/game/contracts.ts",
  "src/renderer/src/game/leaderboard.ts",
  "src/renderer/src/game/profile.ts",
  "src/renderer/src/game/achievementTriggers.ts",
  "src/renderer/src/game/tutorialGuide.ts",
  "src/renderer/src/game/runArchetypes.ts",
  "src/renderer/src/audio/audioTypes.ts",
  "src/renderer/src/audio/TimbaMusic.ts",
  "src/renderer/src/audio/TimbaSfx.ts",
  "src/renderer/src/audio/volumeSettings.ts",
  "src/renderer/src/ui/art/casinoSurfaces.ts",
  "src/renderer/src/ui/animation/microAnimations.ts",
  "src/renderer/src/ui/effects.ts",
  "src/renderer/src/ui/primitives.ts",
  "src/renderer/src/ui/screens/boardLayout.ts",
  "src/renderer/src/ui/screens/hudReadouts.ts",
  "src/renderer/src/ui/screens/menuScreen.ts",
  "src/renderer/src/ui/screens/phaseRenderContext.ts",
  "src/renderer/src/ui/screens/terminalScreen.ts",
  "src/renderer/src/ui/theme.ts",
  "src/renderer/src/scenes/TimbaScene.ts",
  "src/renderer/src/styles.css",
  "tsconfig.rules.json",
  "scripts/rule-tests.ts",
  "docs/ROADMAP.md",
  "docs/PACKAGING.md",
  "README.md"
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));

if (missing.length > 0) {
  console.error(`Missing files:\n${missing.join("\n")}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = ["dev", "build", "validate", "test:rules"];
const missingScripts = scripts.filter((script) => !pkg.scripts?.[script]);

if (missingScripts.length > 0) {
  console.error(`Missing package scripts: ${missingScripts.join(", ")}`);
  process.exit(1);
}

const moduleChecks = [
  {
    name: "renderer",
    files: ["src/renderer/src/main.ts", "src/renderer/src/scenes/TimbaScene.ts", "src/renderer/src/game/config.ts"],
    terms: ["TIMBA!", "Blackjack 21", "Kiosco de caf", "Multiplicador"]
  },
  {
    name: "profile",
    files: [
      "src/renderer/src/game/profile.ts",
      "src/renderer/src/game/achievementTriggers.ts",
      "src/renderer/src/game/buildInfo.ts",
      "src/renderer/src/game/tutorialGuide.ts",
      "src/renderer/src/game/runArchetypes.ts"
    ],
    terms: [
      "PROFILE_STORAGE_KEY",
      "ACHIEVEMENT_DEFINITIONS",
      "listRecentUnlocks",
      "getProfileProgressByCategory",
      "achievementIdsFromRunState",
      "APP_BUILD_LABEL",
      "TUTORIAL_GUIDE",
      "RUN_ARCHETYPES",
      "BUILD_IDENTITIES",
      "FUTURE_BOSS_BLUEPRINTS"
    ]
  },
  {
    name: "leaderboard",
    files: ["src/renderer/src/game/leaderboard.ts"],
    terms: ["LEADERBOARD_STORAGE_KEY", "LEADERBOARD_SCORE_VERSION", "createRunSummary", "scoreRunForLeaderboard", "insertLeaderboardEntry"]
  },
  {
    name: "contracts",
    files: ["src/renderer/src/game/contracts.ts"],
    terms: [
      "CONTRACTS",
      "CONTRACT_IDS",
      "chooseContractOfferIds",
      "applyContractEffectsToNextTable",
      "getContractLabel",
      "getContractHint",
      "getContractDifficulty",
      "getContractStyle"
    ]
  },
  {
    name: "audio",
    files: ["src/renderer/src/audio/audioTypes.ts", "src/renderer/src/audio/TimbaMusic.ts", "src/renderer/src/audio/TimbaSfx.ts", "src/renderer/src/audio/volumeSettings.ts"],
    terms: ["TIMBA_SFX_CUES", "TIMBA_SFX_BUSES", "class TimbaMusic", "class TimbaSfx", "clampVolumeLevel"]
  },
  {
    name: "ui",
    files: [
      "src/renderer/src/ui/effects.ts",
      "src/renderer/src/ui/primitives.ts",
      "src/renderer/src/ui/theme.ts",
      "src/renderer/src/ui/art/casinoSurfaces.ts",
      "src/renderer/src/ui/animation/microAnimations.ts",
      "src/renderer/src/ui/screens/boardLayout.ts",
      "src/renderer/src/ui/screens/hudReadouts.ts",
      "src/renderer/src/ui/screens/menuScreen.ts",
      "src/renderer/src/ui/screens/phaseRenderContext.ts",
      "src/renderer/src/ui/screens/terminalScreen.ts"
    ],
    terms: [
      "drawParcaPressure",
      "drawRewardToast",
      "createButton",
      "createPanel",
      "createBallTimerRef",
      "updateKioskTimerRef",
      "UI_LAYOUT",
      "PALETTE",
      "drawFeltTexture",
      "playStampSeal",
      "boardMetricsForSize",
      "buildPressureReadout",
      "menuCosmeticBadges",
      "createPhaseRenderContext",
      "endStateLayout"
    ]
  }
];

for (const check of moduleChecks) {
  const content = check.files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
  const missingTerms = check.terms.filter((term) => !content.includes(term));

  if (missingTerms.length > 0) {
    console.error(`${check.name} module is missing expected terms: ${missingTerms.join(", ")}`);
    process.exit(1);
  }
}

console.log("TIMBA! structure is valid.");
