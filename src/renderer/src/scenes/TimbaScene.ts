import Phaser from "phaser";
import {
  blackjackHit,
  blackjackStand,
  handLabel,
  handValue,
  startBlackjackSideGame
} from "../game/blackjack.js";
import { TimbaMusic } from "../audio/TimbaMusic.js";
import { TimbaSfx } from "../audio/TimbaSfx.js";
import { clampVolumeLevel } from "../audio/volumeSettings.js";
import { APP_BUILD_LABEL, APP_BUILD_NOTE, APP_VERSION } from "../game/buildInfo.js";
import {
  achievementIdsFromBlackjackResult,
  achievementIdsFromKioskVisits,
  achievementIdsFromRunState
} from "../game/achievementTriggers.js";
import { PERMANENT_BONUSES, ROUND_SECONDS, SHOP_ITEMS, TABLE_CONFIGS } from "../game/config.js";
import {
  adjustedShopCost,
  advanceTutorialStep,
  advanceAfterTableWin,
  buyPermanentBonus,
  cancelPendingShopAction,
  chooseTableContract,
  createInitialRun,
  createPlayRun,
  createTutorialRun,
  drawGuidedTutorialBall,
  drawNextBall,
  enterKiosk,
  applyDirectedShopAction,
  applyImmediateShopItem,
  fuzzyStampCell,
  isDirectedShopItem,
  leaveKiosk,
  markMatchingCell,
  returnFromBlackjack as resolveBlackjackReturn,
  skipPermanentBonus,
  skipTableContract,
  startNextTable,
  swapCells,
  wardParcaMark
} from "../game/rules.js";
import { CONTRACTS, type ContractId } from "../game/contracts.js";
import {
  getBestEntry,
  getLeaderboardGrade,
  getLeaderboardMedal,
  getScoreDeltaToNextRank,
  insertLeaderboardEntry,
  loadLeaderboard,
  rankEntry,
  saveLeaderboard,
  scoreRunForLeaderboard,
  createRunSummary,
  type Leaderboard,
  type LeaderboardEntry
} from "../game/leaderboard.js";
import {
  createDefaultProfile,
  getProfileProgress,
  getProfileProgressByCategory,
  listRecentUnlocks,
  listUnlocks,
  loadProfile,
  saveProfile,
  unlockAchievements,
  type AchievementDefinition,
  type AchievementId,
  type LocalProfile
} from "../game/profile.js";
import type { BlackjackCard, BoardCell, PermanentBonus, RunState, ShopItem } from "../game/types.js";
import {
  drawBallFace,
  drawBrassRivets,
  drawCardBack,
  drawCardFace,
  drawFeltTexture,
  drawPaperGrain,
  drawTicketNotches,
  drawWoodFrame
} from "../ui/art/casinoSurfaces.js";
import { drawParcaMarkAura, playBallDrop, playHudRewardPop, playKioskEntrance, playPatternRewardSweep, playStampSeal } from "../ui/animation/microAnimations.js";
import {
  drawParcaEndSilhouette,
  drawParcaPressure as renderParcaPressure,
  drawParcaVictoryBreak,
  drawRewardToast as renderRewardToast
} from "../ui/effects.js";
import { addStatChip, createBallTimerRef, createButton, createPanel, createText, createUiText, updateBallTimerRef, updateKioskTimerRef } from "../ui/primitives.js";
import { boardMetricsForSize, type BoardMetrics } from "../ui/screens/boardLayout.js";
import { menuCosmeticBadges, menuMusicLabel, menuPanelBorder } from "../ui/screens/menuScreen.js";
import { createPhaseRenderContext, isTerminalPhase } from "../ui/screens/phaseRenderContext.js";
import { endStateLayout } from "../ui/screens/terminalScreen.js";
import { BALL_SECONDS, GAME_HEIGHT, GAME_WIDTH, HUD, PALETTE, PLAY_AREA, type TimerUiRef } from "../ui/theme.js";

export class TimbaScene extends Phaser.Scene {
  private static readonly volumeStorageKey = "timba.masterVolume.v1";
  private state: RunState = createInitialRun();
  private profile: LocalProfile = createDefaultProfile();
  private leaderboard: Leaderboard = [];
  private latestRunEntry: LeaderboardEntry | null = null;
  private latestRunRank: number | null = null;
  private recordedRunKey: string | null = null;
  private achievementToasts: AchievementDefinition[] = [];
  private boardLayer!: Phaser.GameObjects.Container;
  private parcaLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private actionLayer!: Phaser.GameObjects.Container;
  private effectsLayer!: Phaser.GameObjects.Container;
  private kioskTimer?: Phaser.Time.TimerEvent;
  private ballTimer?: Phaser.Time.TimerEvent;
  private parcaPulseTimer?: Phaser.Time.TimerEvent;
  private duckReleaseTimer?: Phaser.Time.TimerEvent;
  private ballSecondsRemaining = BALL_SECONDS;
  private audio = new TimbaSfx({ masterGain: 0.82 });
  private music = new TimbaMusic();
  private volumeLevel = 0.82;
  private parcaCueStage = 0;
  private parcaAlertStage: number | null = null;
  private duckRequests: Array<{ amount: number; until: number }> = [];
  private ballTimerUi?: TimerUiRef;
  private kioskTimerUi?: TimerUiRef;
  private hoverPreview?: Phaser.GameObjects.Container;
  private pendingBallDropValue: number | null = null;
  private pendingKioskEntrance = false;
  private visitedKioskRounds = new Set<number>();
  private blackjackWinStreak = 0;
  private pendingProgressReset = false;

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.loadLocalProgress();
    this.boardLayer = this.add.container(0, 0);
    this.parcaLayer = this.add.container(0, 0);
    this.effectsLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.actionLayer = this.add.container(0, 0);
    this.state = createInitialRun();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownScene());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdownScene());
    this.render();
  }

  private render(): void {
    this.syncMusic();
    this.ballTimerUi = undefined;
    this.kioskTimerUi = undefined;
    this.boardLayer.removeAll(true);
    this.parcaLayer.removeAll(true);
    this.hudLayer.removeAll(true);
    this.actionLayer.removeAll(true);
    this.effectsLayer.removeAll(true);
    this.hoverPreview = undefined;

    if (this.state.phase === "menu") {
      this.clearParcaPulse();
      this.drawMenu();
      return;
    }

    this.drawRoom();
    this.drawBoard();
    this.drawHud();
    this.drawParcaPressure();
    this.drawParcaAlert();
    this.recordTerminalRunIfNeeded();

    if (this.state.phase === "tutorial") {
      this.drawTutorialActions();
    } else if (this.state.phase === "table") {
      this.drawTableActions();
    } else if (this.state.phase === "kiosk" || this.state.phase === "blackjack") {
      this.drawKiosk();
    } else if (this.state.phase === "tableWon") {
      this.drawTableWon();
    } else if (this.state.phase === "contract") {
      this.drawContractChoice();
    } else if (this.state.phase === "upgrade") {
      this.drawUpgradeShop();
    } else if (this.state.phase === "runWon") {
      this.drawEndState("TIMBA!", "Le ganaste la noche a la Parca.", "Menu", () => this.restartRun());
    } else if (this.state.phase === "lost") {
      this.drawEndState("x0.0", this.state.lostReason || "La Parca cobro la cuenta.", "Menu", () => this.restartRun());
    }

    this.drawRewardToast();
    this.drawAchievementToast();
    this.flushPendingMicroAnimations();
    this.syncParcaMotion();
  }

  private flushPendingMicroAnimations(): void {
    if (this.pendingBallDropValue !== null && (this.state.phase === "table" || this.state.phase === "tutorial") && this.state.currentBall !== null) {
      playBallDrop(this, this.hudLayer, this.pendingBallDropValue);
    }
    this.pendingBallDropValue = null;

    if (this.pendingKioskEntrance && (this.state.phase === "kiosk" || this.state.phase === "blackjack")) {
      playKioskEntrance(this, this.actionLayer);
    }
    this.pendingKioskEntrance = false;
  }

  private restartRun(): void {
    this.clearKioskTimer();
    this.clearBallTimer();
    this.resetRunFeedback();
    this.ballSecondsRemaining = BALL_SECONDS;
    this.state = createInitialRun();
    this.render();
  }

  private startPlay(): void {
    this.clearKioskTimer();
    this.clearBallTimer();
    this.resetRunFeedback();
    this.ballSecondsRemaining = BALL_SECONDS;
    this.state = createPlayRun();
    this.primeOpeningBall();
    this.unlockLocalAchievements(["first-table"]);
    this.render();
  }

  private startTutorial(): void {
    this.clearKioskTimer();
    this.clearBallTimer();
    this.resetRunFeedback();
    this.ballSecondsRemaining = BALL_SECONDS;
    this.state = createTutorialRun();
    this.render();
  }

  private resetRunFeedback(): void {
    this.recordedRunKey = null;
    this.latestRunEntry = null;
    this.latestRunRank = null;
    this.parcaCueStage = 0;
    this.parcaAlertStage = null;
    this.pendingBallDropValue = null;
    this.pendingKioskEntrance = false;
    this.pendingProgressReset = false;
    this.duckRequests = [];
    this.visitedKioskRounds = new Set<number>();
    this.blackjackWinStreak = 0;
    this.clearParcaPulse();
    this.clearDuckRelease();
    this.music.setDuck(0);
  }

  private drawMenu(): void {
    const ctx = createPhaseRenderContext(this.state, this.music.isMuted());
    const g = this.add.graphics();
    g.fillStyle(PALETTE.shadow, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(PALETTE.wall, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x070609, 0.62);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x271b27, 0.72);
    g.fillRect(0, 0, GAME_WIDTH, 94);
    g.fillStyle(0x111820, 0.64);
    g.fillRect(0, 94, GAME_WIDTH, 46);
    g.fillStyle(PALETTE.shadow, 0.32);
    g.fillEllipse(640, 650, 760, 44);
    g.fillStyle(PALETTE.table, 1);
    g.fillRoundedRect(260, 96, 760, 548, 24);
    g.fillStyle(0xffffff, 0.04);
    g.fillRoundedRect(272, 108, 736, 94, 18);
    g.fillStyle(PALETTE.feltDark, 1);
    g.fillRoundedRect(304, 148, 672, 436, 20);
    g.fillStyle(PALETTE.feltLight, 0.08);
    g.fillRoundedRect(322, 166, 636, 86, 18);
    g.fillStyle(0x07110e, 0.16);
    g.fillEllipse(640, 510, 566, 90);
    g.lineStyle(4, PALETTE.coffee, 1);
    g.strokeRoundedRect(260, 96, 760, 548, 24);
    g.lineStyle(1, PALETTE.gold, 0.42);
    g.strokeRoundedRect(270, 106, 740, 528, 18);
    g.fillStyle(0x050405, 0.36);
    g.fillEllipse(640, 616, 590, 32);
    this.boardLayer.add(g);

    this.boardLayer.add(this.text(640, 158, "TIMBA!", 82, "#f2d06b", "center"));
    this.boardLayer.add(this.uiText(640, 248, "Mesa de bingo contra la Parca", 22, "#f0dfba", "center"));
    this.boardLayer.add(this.uiText(640, 286, "Sin dinero real. Sin premios reales ni retiros.", 16, "#9fe7db", "center"));
    this.boardLayer.add(this.uiText(640, 318, APP_BUILD_NOTE, 12, "#bca06d", "center"));
    this.drawMenuBuildChips(340, 342);

    this.actionLayer.add(this.button(374, 410, 300, 56, "Jugar 3x3", () => this.startPlay()));
    this.actionLayer.add(this.button(374, 486, 300, 56, "Tutorial", () => this.startTutorial()));
    this.actionLayer.add(this.button(392, 558, 226, 38, menuMusicLabel(ctx.musicMuted), () => this.toggleMusic()));
    this.actionLayer.add(this.button(374, 604, 82, 34, "Vol -", () => this.adjustVolume(-0.1)));
    this.actionLayer.add(this.uiText(466, 613, this.volumeLabel(), 13, "#f0dfba", "center", 100));
    this.actionLayer.add(this.button(576, 604, 82, 34, "Vol +", () => this.adjustVolume(0.1)));
    this.drawMenuProgress();
  }

  private drawMenuBuildChips(x: number, y: number): void {
    const chips = [
      APP_BUILD_LABEL.toUpperCase(),
      "OFFLINE",
      "TESTER LOCAL"
    ];

    chips.forEach((label, index) => {
      const chipX = x + index * 190;
      const chip = this.add.graphics();
      chip.fillStyle(0x171116, 0.86);
      chip.fillRoundedRect(chipX, y, 172, 24, 12);
      chip.lineStyle(1, index === 0 ? PALETTE.gold : PALETTE.teal, index === 0 ? 0.66 : 0.42);
      chip.strokeRoundedRect(chipX, y, 172, 24, 12);
      this.actionLayer.add(chip);
      this.actionLayer.add(this.uiText(chipX + 86, y + 6, label, 9, index === 0 ? "#f2d06b" : "#9fe7db", "center", 156));
    });
  }

  private drawMenuProgress(): void {
    const progress = getProfileProgress(this.profile);
    const categoryProgress = getProfileProgressByCategory(this.profile);
    const best = getBestEntry(this.leaderboard);
    const bestRank = best ? rankEntry(this.leaderboard, best) : null;
    const bestGrade = best ? this.scoreGrade(best.leaderboardScore) : { label: "Sin grado", medal: "-", color: "#d7c8aa" };
    const latestUnlocks = listRecentUnlocks(this.profile, 3);
    const unlocked = listUnlocks(this.profile);
    const achievementPoints = unlocked.reduce((sum, unlock) => sum + unlock.points, 0);
    const cosmetics = this.profile.cosmetics;
    const border = menuPanelBorder(cosmetics);
    const panel = this.add.graphics();
    panel.fillStyle(0x171116, 0.94);
    panel.fillRoundedRect(716, 330, 234, 222, 8);
    panel.lineStyle(border.width, cosmetics.frame_contract_gold ? PALETTE.gold : PALETTE.teal, border.alpha);
    panel.strokeRoundedRect(716, 330, 234, 222, 8);
    if (cosmetics.frame_contract_gold) {
      panel.lineStyle(1, 0xffffff, 0.32);
      panel.strokeRoundedRect(720, 334, 226, 214, 6);
    }
    this.actionLayer.add(panel);
    this.actionLayer.add(this.uiText(734, 348, "PROGRESO LOCAL", 11, "#bca06d", "left"));
    this.actionLayer.add(this.text(734, 368, `${progress.unlocked}/${progress.total} logros`, 20, "#f0dfba", "left"));
    this.actionLayer.add(this.uiText(870, 374, `${achievementPoints} pts`, 12, "#f2d06b", "left", 64));
    this.actionLayer.add(this.uiText(734, 398, best ? `Mejor mesa: ${best.tableTitle}` : "Mejor mesa: sin runs", 12, "#d7c8aa", "left", 192));
    this.actionLayer.add(this.text(734, 420, best ? `${best.leaderboardScore} pts` : "0 pts", 24, "#f2d06b", "left"));
    this.actionLayer.add(this.uiText(734, 452, `Top local: ${bestRank ? `#${bestRank}` : "sin puesto"}`, 12, "#9fe7db", "left", 130));
    this.actionLayer.add(this.uiText(846, 452, this.scoreGradeText(bestGrade), 12, bestGrade.color, "left", 98));
    this.actionLayer.add(this.uiText(734, 478, `Coleccion: core ${categoryProgress.core.unlocked}/${categoryProgress.core.total} / mesa ${categoryProgress.table.unlocked}/${categoryProgress.table.total}`, 11, "#9fe7db", "left", 192));
    this.actionLayer.add(this.uiText(734, 502, latestUnlocks.length > 0 ? latestUnlocks.map((unlock) => unlock.name).join(" / ") : "Desbloqueos: todavia ninguno", 11, "#d7c8aa", "left", 192));
    this.drawCosmeticBadges(734, 526);
    this.drawMenuResetControls(716, 564);
  }

  private drawMenuResetControls(x: number, y: number): void {
    if (!this.pendingProgressReset) {
      this.actionLayer.add(this.button(x, y, 112, 30, "Reset local", () => {
        this.pendingProgressReset = true;
        this.render();
      }));
      this.actionLayer.add(this.uiText(x + 122, y + 5, "Borra logros y ranking", 10, "#8f8068", "left", 106));
      return;
    }

    const warn = this.add.graphics();
    warn.fillStyle(0x2b1116, 0.95);
    warn.fillRoundedRect(x, y - 8, 234, 54, 7);
    warn.lineStyle(1, PALETTE.red, 0.74);
    warn.strokeRoundedRect(x, y - 8, 234, 54, 7);
    this.actionLayer.add(warn);
    this.actionLayer.add(this.uiText(x + 10, y - 2, "Confirmar borrado local", 10, "#ffcbcb", "left", 210));
    this.actionLayer.add(this.button(x + 10, y + 18, 96, 24, "Confirmar", () => this.resetLocalProgress()));
    this.actionLayer.add(this.button(x + 118, y + 18, 78, 24, "Cancelar", () => {
      this.pendingProgressReset = false;
      this.render();
    }));
  }

  private drawCosmeticBadges(x: number, y: number): void {
    const badges = menuCosmeticBadges(this.profile.cosmetics);

    if (badges.length === 0) {
      this.actionLayer.add(this.uiText(x, y, "Cosmeticos: desbloquea logros para vestir la mesa.", 10, "#8f8068", "left", 186));
      return;
    }

    badges.slice(0, 2).forEach((badge, index) => {
      const chip = this.add.graphics();
      const chipX = x + index * 98;
      chip.fillStyle(0x241d20, 1);
      chip.fillRoundedRect(chipX, y, 88, 18, 9);
      chip.lineStyle(1, PALETTE.gold, 0.55);
      chip.strokeRoundedRect(chipX, y, 88, 18, 9);
      this.actionLayer.add(chip);
      this.actionLayer.add(this.uiText(chipX + 44, y + 4, badge.label, 8, badge.color, "center", 78));
    });
  }

  private drawRoom(): void {
    const table = TABLE_CONFIGS[this.state.tableIndex];
    const g = this.add.graphics();
    g.fillStyle(PALETTE.shadow, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(PALETTE.wall, 1);
    g.fillRect(0, 0, GAME_WIDTH, 235);
    g.fillStyle(0x130f17, 1);
    g.fillRect(0, 235, GAME_WIDTH, GAME_HEIGHT - 235);
    g.lineStyle(1, 0x312533, 0.34);
    for (let y = 258; y < GAME_HEIGHT; y += 38) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(GAME_WIDTH, y + 10);
      g.strokePath();
    }
    g.fillStyle(0x2e2226, 1);
    g.fillRect(0, 210, GAME_WIDTH, 30);
    g.fillStyle(0x070609, 0.42);
    g.fillRect(0, 0, GAME_WIDTH, 76);
    g.fillStyle(0xe8d78e, 0.55);
    g.fillRoundedRect(330, 38, 330, 8, 4);
    g.fillRoundedRect(718, 38, 150, 8, 4);

    g.fillStyle(0x151116, 0.92);
    g.fillRoundedRect(54, 18, 270, 76, 8);
    g.lineStyle(1, PALETTE.gold, 0.5);
    g.strokeRoundedRect(54, 18, 270, 76, 8);

    g.fillStyle(0x171318, 0.92);
    g.fillRoundedRect(346, 18, 548, 76, 8);
    g.lineStyle(1, 0x5a4d45, 1);
    g.strokeRoundedRect(346, 18, 548, 76, 8);

    drawWoodFrame(g, PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.width, PLAY_AREA.height, 30);
    drawBrassRivets(g, PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.width, PLAY_AREA.height);
    drawFeltTexture(g, PLAY_AREA.x + 34, PLAY_AREA.y + 34, PLAY_AREA.width - 68, PLAY_AREA.height - 74);
    g.lineStyle(5, PALETTE.coffee, 1);
    g.strokeRoundedRect(PLAY_AREA.x, PLAY_AREA.y, PLAY_AREA.width, PLAY_AREA.height, 28);
    g.lineStyle(1, 0x9a744a, 0.65);
    g.strokeRoundedRect(PLAY_AREA.x + 30, PLAY_AREA.y + 32, PLAY_AREA.width - 60, PLAY_AREA.height - 68, 22);
    g.fillStyle(0x1a171b, 0.42);
    g.fillEllipse(PLAY_AREA.centerX, PLAY_AREA.y + PLAY_AREA.height - 38, 690, 28);
    this.drawTableProps(g);

    const crackLevel = Phaser.Math.Clamp((1.3 - this.state.multiplier) / 1.3, 0, 1);
    if (crackLevel > 0) {
      g.lineStyle(2 + crackLevel * 5, PALETTE.redDark, 0.7);
      g.beginPath();
      g.moveTo(340, 156);
      g.lineTo(382, 250);
      g.lineTo(356, 336);
      g.lineTo(424, 444);
      g.lineTo(384, 658);
      g.strokePath();
    }

    this.boardLayer.add(g);
    this.boardLayer.add(this.text(74, 24, "TIMBA!", 45, "#f2d06b", "left"));
    this.boardLayer.add(this.uiText(74, 70, "bingo clandestino", 13, "#bca06d", "left"));
    this.boardLayer.add(this.uiText(374, 30, `Mesa ${this.state.tableIndex + 1}/${TABLE_CONFIGS.length}`, 14, "#bca06d", "left"));
    this.boardLayer.add(this.text(374, 50, table.title, 25, "#f0dfba", "left", 230));
    this.boardLayer.add(this.uiText(604, 38, table.subtitle, 14, "#d7c8aa", "left", 250));
    this.boardLayer.add(this.uiText(760, 72, "SIN DINERO REAL / SIN PREMIOS", 12, "#9fe7db", "left"));
  }

  private drawTableProps(g: Phaser.GameObjects.Graphics): void {
    drawCardBack(g, 104, 156, 54, 76);
    drawCardFace(g, 130, 168, 54, 76);
    g.fillStyle(0x4c2f22, 1);
    g.fillRoundedRect(92, 246, 104, 34, 11);
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(100, 251, 88, 8, 5);
    for (let index = 0; index < 4; index += 1) {
      const chipX = 112 + index * 18;
      g.fillStyle(index % 2 === 0 ? PALETTE.redDark : PALETTE.teal, 1);
      g.fillEllipse(chipX, 270 - index * 4, 28, 10);
      g.lineStyle(1, PALETTE.gold, 0.45);
      g.strokeEllipse(chipX, 270 - index * 4, 28, 10);
    }

    drawCardFace(g, 748, 158, 100, 132);
    drawPaperGrain(g, 756, 168, 84, 112);
    g.lineStyle(1, 0x8f7854, 0.8);
    for (let y = 196; y < 270; y += 18) {
      g.beginPath();
      g.moveTo(770, y);
      g.lineTo(834, y);
      g.strokePath();
    }
    g.fillStyle(0x4f3328, 0.22);
    g.fillRoundedRect(760, 174, 80, 18, 3);
    g.fillStyle(PALETTE.redDark, 0.85);
    g.fillCircle(830, 274, 6);
    g.fillStyle(0x171116, 0.62);
    g.fillRoundedRect(736, 306, 120, 16, 8);
    g.fillStyle(PALETTE.gold, 0.75);
    g.fillRoundedRect(748, 310, 70, 4, 2);

    g.fillStyle(0x242126, 1);
    g.fillEllipse(820, 650, 92, 30);
    g.fillStyle(0x3d3a3d, 1);
    g.fillEllipse(820, 644, 72, 20);
    g.fillStyle(0xd7d0bd, 0.75);
    g.fillRoundedRect(786, 630, 72, 7, 4);
    g.fillStyle(PALETTE.redDark, 1);
    g.fillCircle(850, 632, 5);

    g.fillStyle(0x161014, 0.62);
    g.fillRoundedRect(198, 622, 116, 28, 14);
    g.fillStyle(PALETTE.paperDark, 1);
    g.fillEllipse(222, 632, 34, 18);
    g.fillStyle(0x2b1a16, 1);
    g.fillEllipse(222, 631, 24, 10);
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(216, 628, 10, 4);
  }

  private drawBoard(): void {
    const { size, cellSize, gap, boardWidth, boardHeight, startX, startY } = this.boardMetrics();

    this.drawBoardBacking(startX, startY, boardWidth, boardHeight, cellSize, gap, size);
    this.drawPatternHints(startX, startY, cellSize, gap, size);
    for (const cell of this.state.board) {
      const x = startX + cell.col * (cellSize + gap);
      const y = startY + cell.row * (cellSize + gap);
      this.drawCell(cell, x, y, cellSize);
    }

    this.drawPatternHighlights(startX, startY, cellSize, gap, size);
    this.drawTutorialTargetHint(startX, startY, cellSize, gap);
  }

  private boardMetrics(): BoardMetrics {
    const table = TABLE_CONFIGS[this.state.tableIndex];
    return boardMetricsForSize(table.boardSize);
  }

  private drawBoardBacking(
    startX: number,
    startY: number,
    boardWidth: number,
    boardHeight: number,
    cellSize: number,
    gap: number,
    size: number
  ): void {
    const g = this.add.graphics();
    g.fillStyle(0x050405, 0.32);
    g.fillRoundedRect(startX - 32, startY + 22, boardWidth + 64, boardHeight + 46, 16);
    g.fillStyle(0x241b17, 1);
    g.fillRoundedRect(startX - 26, startY - 26, boardWidth + 52, boardHeight + 52, 14);
    g.lineStyle(3, PALETTE.gold, 0.52);
    g.strokeRoundedRect(startX - 26, startY - 26, boardWidth + 52, boardHeight + 52, 14);
    g.lineStyle(2, 0x3a2a21, 0.72);
    g.strokeRoundedRect(startX - 23, startY - 23, boardWidth + 46, boardHeight + 46, 12);
    g.fillStyle(0xd7c292, 1);
    g.fillRoundedRect(startX - 12, startY - 12, boardWidth + 24, boardHeight + 24, 8);
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(startX - 10, startY - 10, boardWidth + 20, 10, 6);
    g.lineStyle(1, 0x8d754d, 0.12);
    for (let y = startY + 18; y < startY + boardHeight - 12; y += 28) {
      g.beginPath();
      g.moveTo(startX - 4, y);
      g.lineTo(startX + boardWidth + 4, y + 5);
      g.strokePath();
    }
    g.lineStyle(1, 0x6c5131, 0.6);
    g.strokeRoundedRect(startX - 12, startY - 12, boardWidth + 24, boardHeight + 24, 8);
    g.fillStyle(0x0b090a, 0.14);
    g.fillRoundedRect(startX - 8, startY + boardHeight - 2, boardWidth + 16, 8, 3);

    g.fillStyle(0x8f7854, 0.28);
    for (let col = 1; col < size; col += 1) {
      const x = startX + col * cellSize + (col - 1) * gap + gap / 2;
      g.fillRect(x - 1, startY - 10, 2, boardHeight + 20);
    }
    for (let row = 1; row < size; row += 1) {
      const y = startY + row * cellSize + (row - 1) * gap + gap / 2;
      g.fillRect(startX - 10, y - 1, boardWidth + 20, 2);
    }
    this.boardLayer.add(g);
  }

  private drawCell(cell: BoardCell, x: number, y: number, cellSize: number): void {
    const isSelected = this.state.selectedCellId === cell.id;
    const canStamp = this.state.currentBall === cell.value && !cell.marked;
    const isParcaMarked = this.state.parcaMark?.cellId === cell.id;
    const parcaMarkPulse = isParcaMarked ? 0.5 + 0.5 * Math.sin((this.time.now / 1000) * 7.2) : 0;
    const fill = cell.marked ? PALETTE.gold : canStamp ? 0xfff1c7 : PALETTE.paper;
    const card = this.add.graphics();
    card.fillStyle(0x050405, 0.22);
    card.fillRoundedRect(x + 5, y + 7, cellSize, cellSize, 9);
    card.fillStyle(fill, 1);
    card.fillRoundedRect(x, y, cellSize, cellSize, 8);
    drawPaperGrain(card, x + 5, y + 5, cellSize - 10, cellSize - 10);
    card.fillStyle(0x171116, cell.marked ? 0.05 : 0.03);
    card.fillRoundedRect(x + 4, y + cellSize * 0.52, cellSize - 8, cellSize * 0.4, 6);
    card.fillStyle(0xffffff, canStamp ? 0.26 : 0.12);
    card.fillRoundedRect(x + 8, y + 8, cellSize - 16, Math.max(16, cellSize * 0.18), 6);
    card.fillStyle(isParcaMarked ? PALETTE.redDark : PALETTE.redDark, isParcaMarked ? 0.34 : 0.16);
    card.fillCircle(x + 14, y + cellSize - 16, 3);
    card.fillCircle(x + cellSize - 14, y + 16, 3);
    card.lineStyle(
      isParcaMarked ? 5 + parcaMarkPulse * 2 : isSelected || canStamp ? 5 : 2,
      isParcaMarked ? PALETTE.red : canStamp ? PALETTE.teal : isSelected ? PALETTE.gold : 0x6f6041,
      isParcaMarked ? 0.86 + parcaMarkPulse * 0.14 : 1
    );
    card.strokeRoundedRect(x, y, cellSize, cellSize, 8);
    if (canStamp) {
      card.lineStyle(3, PALETTE.teal, 0.42);
      card.strokeRoundedRect(x - 7, y - 7, cellSize + 14, cellSize + 14, 12);
    }
    if (isParcaMarked) {
      card.lineStyle(4 + parcaMarkPulse * 2, PALETTE.redDark, 0.82 + parcaMarkPulse * 0.16);
      card.strokeRoundedRect(x - 12, y - 12, cellSize + 24, cellSize + 24, 14);
      card.fillStyle(0x481018, 0.22 + parcaMarkPulse * 0.08);
      card.fillRoundedRect(x + 7, y + 7, cellSize - 14, cellSize - 14, 8);
      card.lineStyle(3, 0x230307, 0.72);
      card.strokeEllipse(x + cellSize / 2, y + cellSize * 0.56, cellSize * 0.64, cellSize * 0.22);
      card.lineStyle(3, PALETTE.red, 0.72 + parcaMarkPulse * 0.22);
      card.beginPath();
      card.moveTo(x + cellSize * 0.2, y + cellSize * 0.78);
      card.lineTo(x + cellSize * 0.82, y + cellSize * 0.22);
      card.strokePath();
      card.beginPath();
      card.moveTo(x + cellSize * 0.18, y + cellSize * 0.22);
      card.lineTo(x + cellSize * 0.82, y + cellSize * 0.78);
      card.strokePath();
      card.fillStyle(PALETTE.redDark, 0.76 + parcaMarkPulse * 0.18);
      card.fillTriangle(x + cellSize * 0.12, y + cellSize * 0.12, x + cellSize * 0.3, y + cellSize * 0.06, x + cellSize * 0.2, y + cellSize * 0.28);
      card.fillTriangle(x + cellSize * 0.88, y + cellSize * 0.88, x + cellSize * 0.7, y + cellSize * 0.94, x + cellSize * 0.8, y + cellSize * 0.72);
    }
    this.boardLayer.add(card);
    if (isParcaMarked) {
      drawParcaMarkAura(this, this.effectsLayer, x + cellSize / 2, y + cellSize / 2, cellSize);
    }

    const hit = this.add.zone(x, y, cellSize, cellSize).setOrigin(0);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => this.handleCellClick(cell));
    hit.on("pointerover", () => this.showCellPreview(cell, x, y, cellSize));
    hit.on("pointerout", () => this.clearCellPreview());
    this.boardLayer.add(hit);

    if (cellSize >= 90) {
      this.boardLayer.add(this.uiText(x + 12, y + 9, String(cell.value), cellSize >= 120 ? 12 : 10, "#6b2f2f", "left", 36));
      this.boardLayer.add(this.uiText(x + cellSize - 28, y + cellSize - 25, String(cell.value), cellSize >= 120 ? 12 : 10, "#6b2f2f", "left", 36));
    }
    this.boardLayer.add(this.text(x + cellSize / 2, y + cellSize * 0.26, String(cell.value), cellSize >= 120 ? 52 : cellSize >= 90 ? 38 : 28, "#171116", "center"));
    if (cell.dirty) {
      this.boardLayer.add(this.text(x + cellSize - 22, y + 10, "?", 24, "#80252d", "center"));
    }
    if (isParcaMarked) {
      const markText = this.uiText(x + cellSize / 2, y + cellSize - 30, "MARCA PARCA", cellSize >= 120 ? 11 : 9, "#ffcbcb", "center", cellSize - 16);
      markText.setShadow(0, 1, "#230307", 3, true, true);
      this.boardLayer.add(markText);
    }

    if (cell.marked) {
      const stamp = this.add.graphics();
      stamp.lineStyle(cellSize >= 120 ? 10 : 7, PALETTE.red, 0.92);
      stamp.strokeCircle(x + cellSize / 2, y + cellSize / 2 + cellSize * 0.08, cellSize * 0.28);
      stamp.lineStyle(cellSize >= 120 ? 2 : 1, PALETTE.redDark, 0.4);
      stamp.strokeCircle(x + cellSize / 2 + cellSize * 0.03, y + cellSize / 2 + cellSize * 0.08, cellSize * 0.22);
      stamp.lineStyle(cellSize >= 120 ? 5 : 3, PALETTE.redDark, 0.9);
      stamp.beginPath();
      stamp.moveTo(x + cellSize * 0.28, y + cellSize * 0.7);
      stamp.lineTo(x + cellSize * 0.72, y + cellSize * 0.34);
      stamp.strokePath();
      this.boardLayer.add(stamp);
    }
  }

  private drawPatternHints(startX: number, startY: number, cellSize: number, gap: number, size: number): void {
    const g = this.add.graphics();
    g.lineStyle(4, PALETTE.teal, 0.24);
    for (let row = 0; row < size; row += 1) {
      const y = startY + row * (cellSize + gap) + cellSize / 2;
      g.beginPath();
      g.moveTo(startX - 22, y);
      g.lineTo(startX + size * cellSize + (size - 1) * gap + 22, y);
      g.strokePath();
    }

    g.lineStyle(4, PALETTE.violet, 0.24);
    g.beginPath();
    g.moveTo(startX - 14, startY - 14);
    g.lineTo(startX + size * cellSize + (size - 1) * gap + 14, startY + size * cellSize + (size - 1) * gap + 14);
    g.strokePath();
    g.beginPath();
    g.moveTo(startX + size * cellSize + (size - 1) * gap + 14, startY - 14);
    g.lineTo(startX - 14, startY + size * cellSize + (size - 1) * gap + 14);
    g.strokePath();
    this.boardLayer.add(g);
  }

  private drawPatternHighlights(startX: number, startY: number, cellSize: number, gap: number, size: number): void {
    if (this.state.recentRewards.length === 0) {
      return;
    }

    const g = this.add.graphics();
    for (const reward of this.state.recentRewards) {
      if (reward.kind === "row") {
        const row = Number(reward.id.replace("row-", ""));
        const y = startY + row * (cellSize + gap) + cellSize / 2;
        g.lineStyle(10, PALETTE.gold, 0.75);
        g.beginPath();
        g.moveTo(startX - 28, y);
        g.lineTo(startX + size * cellSize + (size - 1) * gap + 28, y);
        g.strokePath();
      }

      if (reward.id === "diag-a") {
        g.lineStyle(10, PALETTE.violet, 0.7);
        g.beginPath();
        g.moveTo(startX - 18, startY - 18);
        g.lineTo(startX + size * cellSize + (size - 1) * gap + 18, startY + size * cellSize + (size - 1) * gap + 18);
        g.strokePath();
      }

      if (reward.id === "diag-b") {
        g.lineStyle(10, PALETTE.violet, 0.7);
        g.beginPath();
        g.moveTo(startX + size * cellSize + (size - 1) * gap + 18, startY - 18);
        g.lineTo(startX - 18, startY + size * cellSize + (size - 1) * gap + 18);
        g.strokePath();
      }
    }
    this.boardLayer.add(g);
  }

  private drawTutorialTargetHint(startX: number, startY: number, cellSize: number, gap: number): void {
    if (this.state.phase !== "tutorial" || this.state.currentBall === null) {
      return;
    }
    if (this.state.tutorialStep !== 2 && this.state.tutorialStep !== 4) {
      return;
    }

    const target = this.state.board.find((cell) => cell.value === this.state.currentBall && !cell.marked);
    if (!target) {
      return;
    }

    const x = startX + target.col * (cellSize + gap);
    const y = startY + target.row * (cellSize + gap);
    const hint = this.add.container(x + cellSize / 2, y + cellSize / 2);
    const g = this.add.graphics();
    g.lineStyle(7, PALETTE.teal, 0.95);
    g.strokeRoundedRect(-cellSize / 2 - 16, -cellSize / 2 - 16, cellSize + 32, cellSize + 32, 16);
    g.lineStyle(2, PALETTE.gold, 0.8);
    g.strokeRoundedRect(-cellSize / 2 - 8, -cellSize / 2 - 8, cellSize + 16, cellSize + 16, 12);
    g.fillStyle(0x0f3c35, 0.18);
    g.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 8);
    hint.add(g);
    hint.add(this.uiText(0, -cellSize / 2 - 46, "TOCA ESTA CASILLA", 13, "#9fe7db", "center", 180));
    this.effectsLayer.add(hint);
    this.tweens.add({
      targets: hint,
      scale: { from: 0.98, to: 1.04 },
      duration: 520,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  private showCellPreview(cell: BoardCell, x: number, y: number, cellSize: number): void {
    this.clearCellPreview();
    if (this.state.phase !== "table" && this.state.phase !== "tutorial") {
      return;
    }

    const preview = this.previewForCell(cell);
    const container = this.add.container(0, 0);
    const g = this.add.graphics();
    const color = preview.valid ? PALETTE.teal : PALETTE.redDark;
    g.lineStyle(4, color, preview.valid ? 0.95 : 0.72);
    g.strokeRoundedRect(x - 7, y - 7, cellSize + 14, cellSize + 14, 12);
    g.fillStyle(preview.valid ? 0x0f3c35 : 0x3a1218, 0.18);
    g.fillRoundedRect(x, y, cellSize, cellSize, 8);
    this.drawPreviewPatternLines(g, cell, preview);
    container.add(g);

    const labelWidth = 252;
    const labelX = Phaser.Math.Clamp(x + cellSize / 2 - labelWidth / 2, 88, 826 - labelWidth);
    const labelY = Math.max(126, y - 58);
    const card = this.add.graphics();
    card.fillStyle(0x171116, 0.95);
    card.fillRoundedRect(labelX, labelY, labelWidth, 46, 8);
    card.lineStyle(1, color, 0.85);
    card.strokeRoundedRect(labelX, labelY, labelWidth, 46, 8);
    container.add(card);
    container.add(this.uiText(labelX + 12, labelY + 8, preview.title, 13, preview.valid ? "#9fe7db" : "#ffcbcb", "left", labelWidth - 24));
    container.add(this.uiText(labelX + 12, labelY + 25, preview.detail, 12, "#f0dfba", "left", labelWidth - 24));

    this.effectsLayer.add(container);
    this.hoverPreview = container;
  }

  private clearCellPreview(): void {
    if (this.hoverPreview) {
      this.hoverPreview.destroy(true);
      this.hoverPreview = undefined;
    }
  }

  private previewForCell(cell: BoardCell): {
    valid: boolean;
    title: string;
    detail: string;
    row: boolean;
    diagA: boolean;
    diagB: boolean;
    full: boolean;
  } {
    if (this.state.parcaMark?.cellId === cell.id && !cell.marked && this.state.currentBall !== cell.value) {
      return {
        valid: true,
        title: "Marca de la Parca",
        detail: "Tocala para ahuyentarla antes de pedir otra bolilla.",
        row: false,
        diagA: false,
        diagB: false,
        full: false
      };
    }

    const pending = this.state.pendingShopAction;
    if (pending) {
      if (pending.itemId === "swap-cells" && pending.firstCellId === null) {
        return { valid: true, title: "Bajo la mesa", detail: "Elegis la primera casilla.", row: false, diagA: false, diagB: false, full: false };
      }
      if (pending.itemId === "swap-cells") {
        return {
          valid: pending.firstCellId !== cell.id,
          title: pending.firstCellId === cell.id ? "Misma casilla" : "Intercambiar",
          detail: pending.firstCellId === cell.id ? "Elegi otra casilla." : "Cambia los dos numeros.",
          row: false,
          diagA: false,
          diagB: false,
          full: false
        };
      }
      if (pending.itemId === "bump-number") {
        const table = TABLE_CONFIGS[this.state.tableIndex];
        const nextValue = cell.value + 1;
        const valid = !cell.marked && cell.value < table.ballMax && !this.state.board.some((candidate) => candidate.id !== cell.id && candidate.value === nextValue);
        return { valid, title: "Tinta corrida", detail: valid ? `${cell.value} pasa a ${nextValue}.` : "No se puede subir sin duplicar.", row: false, diagA: false, diagB: false, full: false };
      }
      if (pending.itemId === "lower-number") {
        const table = TABLE_CONFIGS[this.state.tableIndex];
        const nextValue = cell.value - 1;
        const valid = !cell.marked && cell.value > table.ballMin && !this.state.board.some((candidate) => candidate.id !== cell.id && candidate.value === nextValue);
        return { valid, title: "Tinta en reversa", detail: valid ? `${cell.value} baja a ${nextValue}.` : "No se puede bajar sin duplicar.", row: false, diagA: false, diagB: false, full: false };
      }
      return this.markPreview(cell, !cell.marked, "Sello viudo", "Marca una casilla borrosa.");
    }

    const canStamp = this.state.currentBall === cell.value && !cell.marked;
    if (!canStamp) {
      const current = this.state.currentBall === null ? "Pedi una bolilla." : `La bolilla actual es ${this.state.currentBall}.`;
      return { valid: false, title: cell.marked ? "Ya sellada" : "No coincide", detail: current, row: false, diagA: false, diagB: false, full: false };
    }

    return this.markPreview(cell, true, "Sello valido", this.quickBonusLabel());
  }

  private markPreview(cell: BoardCell, valid: boolean, title: string, fallbackDetail: string): {
    valid: boolean;
    title: string;
    detail: string;
    row: boolean;
    diagA: boolean;
    diagB: boolean;
    full: boolean;
  } {
    if (!valid) {
      return { valid: false, title, detail: "Objetivo invalido.", row: false, diagA: false, diagB: false, full: false };
    }

    const table = TABLE_CONFIGS[this.state.tableIndex];
    const previewBoard = this.state.board.map((candidate) => (candidate.id === cell.id ? { ...candidate, marked: true } : candidate));
    const row = previewBoard.filter((candidate) => candidate.row === cell.row).every((candidate) => candidate.marked);
    const diagA = cell.row === cell.col && previewBoard.filter((candidate) => candidate.row === candidate.col).every((candidate) => candidate.marked);
    const diagB = cell.row + cell.col === table.boardSize - 1 && previewBoard.filter((candidate) => candidate.row + candidate.col === table.boardSize - 1).every((candidate) => candidate.marked);
    const full = previewBoard.every((candidate) => candidate.marked);
    const rewards = [
      full ? "TIMBA!" : "",
      row ? `linea +$${table.rowPayout}` : "",
      diagA || diagB ? "diagonal x+0.5" : "",
      fallbackDetail
    ].filter(Boolean);

    return { valid: true, title, detail: rewards.join(" / "), row, diagA, diagB, full };
  }

  private drawPreviewPatternLines(
    g: Phaser.GameObjects.Graphics,
    cell: BoardCell,
    preview: { row: boolean; diagA: boolean; diagB: boolean; full: boolean }
  ): void {
    const { size, cellSize, gap, boardWidth, boardHeight, startX, startY } = this.boardMetrics();
    if (preview.full) {
      g.lineStyle(8, PALETTE.gold, 0.78);
      g.strokeRoundedRect(startX - 24, startY - 24, boardWidth + 48, boardHeight + 48, 18);
    }
    if (preview.row) {
      const rowY = startY + cell.row * (cellSize + gap) + cellSize / 2;
      g.lineStyle(8, PALETTE.gold, 0.82);
      g.beginPath();
      g.moveTo(startX - 30, rowY);
      g.lineTo(startX + boardWidth + 30, rowY);
      g.strokePath();
    }
    if (preview.diagA) {
      g.lineStyle(8, PALETTE.violet, 0.78);
      g.beginPath();
      g.moveTo(startX - 20, startY - 20);
      g.lineTo(startX + size * cellSize + (size - 1) * gap + 20, startY + size * cellSize + (size - 1) * gap + 20);
      g.strokePath();
    }
    if (preview.diagB) {
      g.lineStyle(8, PALETTE.violet, 0.78);
      g.beginPath();
      g.moveTo(startX + size * cellSize + (size - 1) * gap + 20, startY - 20);
      g.lineTo(startX - 20, startY + size * cellSize + (size - 1) * gap + 20);
      g.strokePath();
    }
  }

  private quickBonusLabel(): string {
    const ritual = this.state.ownedBonusIds.includes("quick-ritual");
    const quickMarks = Array.from(this.state.scoredPatternIds).filter((id) => id.startsWith("quick-mark-")).length;
    const ritualHint = ritual ? `; ritual ${3 - (quickMarks % 3)}/3` : "";
    if (this.ballSecondsRemaining >= 9) {
      return `sello relampago +$10${ritualHint}`;
    }
    if (this.ballSecondsRemaining >= 5) {
      return `sello rapido +$5${ritualHint}`;
    }
    return "sin bonus rapido";
  }

  private drawHud(): void {
    const table = TABLE_CONFIGS[this.state.tableIndex];
    const totalBalls = table.ballMax - table.ballMin + 1;
    const calledBallCount = this.state.calledBalls.length;
    const remainingBalls = Math.max(0, totalBalls - calledBallCount);
    const usefulBalls = this.state.board.filter((cell) => !cell.marked && !this.state.calledBalls.includes(cell.value)).length;
    const dangerPct = Phaser.Math.Clamp(1 - this.state.multiplier / 3, 0, 1);
    const multiplierDanger = this.state.multiplier <= 0.8;
    const multiplierColor = multiplierDanger ? "#ff6868" : "#9fe7db";
    const parcaHudPulse = this.state.parcaMark ? 0.5 + 0.5 * Math.sin((this.time.now / 1000) * 7.2) : 0;
    const panel = this.add.graphics();
    panel.fillStyle(0x0f0c11, 0.98);
    panel.fillRoundedRect(HUD.x, HUD.y, HUD.width, HUD.height, 10);
    panel.fillStyle(0x221a20, 1);
    panel.fillRoundedRect(HUD.x + 14, HUD.y + 14, HUD.width - 28, 78, 8);
    panel.lineStyle(2, 0x56483d, 1);
    panel.strokeRoundedRect(HUD.x, HUD.y, HUD.width, HUD.height, 10);
    panel.lineStyle(1, PALETTE.gold, 0.4);
    panel.strokeRoundedRect(HUD.x + 14, HUD.y + 14, HUD.width - 28, 78, 8);
    this.hudLayer.add(panel);
    const runChase = this.currentLeaderboardChase();
    const runGrade = this.scoreGrade(runChase.score);

    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 28, `MESA ${this.state.tableIndex + 1}/${TABLE_CONFIGS.length}`, 12, "#bca06d", "left"));
    this.hudLayer.add(this.text(HUD.x + 30, HUD.y + 48, table.title, 21, "#f0dfba", "left", 168));
    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 80, `Rank local #${runChase.rank} / ${runChase.score} pts`, 11, runGrade.color, "left", 172));
    this.hudLayer.add(this.button(HUD.x + 188, HUD.y + 36, 50, 28, this.music.isMuted() ? "Mute" : "Audio", () => this.toggleMusic()));
    this.hudLayer.add(this.button(HUD.x + 244, HUD.y + 36, 26, 28, "-", () => this.adjustVolume(-0.1)));
    this.hudLayer.add(this.button(HUD.x + 276, HUD.y + 36, 26, 28, "+", () => this.adjustVolume(0.1)));
    this.hudLayer.add(this.uiText(HUD.x + 190, HUD.y + 70, `${this.volumeLabel()} / Sin $ real`, 10, "#9fe7db", "left", 112));
    this.hudLayer.add(this.uiText(HUD.x + 236, HUD.y + 22, `v${APP_VERSION}`, 9, "#8f8068", "left", 48));

    this.drawStatChip(HUD.x + 18, HUD.y + 112, 128, "PUNTOS", String(Math.floor(this.state.score)), "#ffffff");
    this.drawStatChip(HUD.x + 158, HUD.y + 112, 110, "PLATA FIC.", `$${this.state.money}`, "#e0b449");

    const danger = this.add.graphics();
    danger.fillStyle(0x241d20, 1);
    danger.fillRoundedRect(HUD.x + 18, HUD.y + 172, 250, 66, 7);
    danger.lineStyle(1, multiplierDanger ? PALETTE.red : 0x5f5144, 1);
    danger.strokeRoundedRect(HUD.x + 18, HUD.y + 172, 250, 66, 7);
    danger.fillStyle(0x171116, 1);
    danger.fillRoundedRect(HUD.x + 30, HUD.y + 216, 226, 11, 6);
    danger.fillStyle(multiplierDanger ? PALETTE.red : PALETTE.teal, 0.95);
    danger.fillRoundedRect(HUD.x + 30, HUD.y + 216, Phaser.Math.Clamp(226 * (1 - dangerPct), 0, 226), 11, 6);
    this.hudLayer.add(danger);
    this.hudLayer.add(this.uiText(HUD.x + 32, HUD.y + 182, "MULTIPLICADOR", 11, "#bca06d", "left"));
    this.hudLayer.add(this.uiText(HUD.x + 176, HUD.y + 182, multiplierDanger ? "PARCA CERCA" : "PARCA", 11, multiplierDanger ? "#ff6868" : "#d7c8aa", "left", 82));
    this.hudLayer.add(this.uiText(HUD.x + 32, HUD.y + 193, `x${this.state.multiplier.toFixed(1)}`, 28, multiplierColor, "left"));
    this.hudLayer.add(this.uiText(HUD.x + 176, HUD.y + 201, "x0.0 pierde", 11, multiplierDanger ? "#ffcbcb" : "#d7c8aa", "left", 82));

    const pulse = this.add.graphics();
    pulse.fillStyle(this.state.parcaMark ? 0x2a070c : 0x171116, 1);
    pulse.fillRoundedRect(HUD.x + 18, HUD.y + 252, 250, 52, 7);
    pulse.fillStyle(PALETTE.redDark, this.state.parcaMark ? 0.16 + parcaHudPulse * 0.12 : 0);
    pulse.fillRoundedRect(HUD.x + 24, HUD.y + 258, 238, 40, 5);
    pulse.lineStyle(this.state.parcaMark ? 2 + parcaHudPulse * 2 : 1, this.state.parcaMark ? PALETTE.red : 0x5f5144, this.state.parcaMark ? 0.78 + parcaHudPulse * 0.2 : 0.75);
    pulse.strokeRoundedRect(HUD.x + 18, HUD.y + 252, 250, 52, 7);
    if (this.state.parcaMark) {
      pulse.lineStyle(2, PALETTE.bone, 0.42 + parcaHudPulse * 0.22);
      pulse.strokeEllipse(HUD.x + 236, HUD.y + 278, 42, 18);
      pulse.lineStyle(2, PALETTE.red, 0.64 + parcaHudPulse * 0.22);
      pulse.beginPath();
      pulse.moveTo(HUD.x + 218, HUD.y + 286);
      pulse.lineTo(HUD.x + 254, HUD.y + 270);
      pulse.strokePath();
    }
    this.hudLayer.add(pulse);
    const markCell = this.state.parcaMark ? this.state.board.find((cell) => cell.id === this.state.parcaMark?.cellId) : null;
    const pressureLine = this.state.parcaMark
      ? `MARCA PARCA ${markCell?.value ?? "?"}: tocar o -x0.08`
      : `RONDA ${this.state.round} / #${runChase.rank} / ${runChase.deltaToNext > 0 ? `+${runChase.deltaToNext} al top` : "lider local"}`;
    const ballsLine = `BOL ${calledBallCount}/${totalBalls} / QUEDAN ${remainingBalls} / UTILES ${usefulBalls}`;
    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 264, pressureLine, 12, this.state.parcaMark ? "#ffcbcb" : runGrade.color, "left", 226));
    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 284, ballsLine, 11, usefulBalls <= 2 ? "#ffcbcb" : "#9fe7db", "left", 226));

    const machine = this.add.graphics();
    machine.fillStyle(0x0b080b, 0.42);
    machine.fillRoundedRect(HUD.x + 18, HUD.y + 314, 268, 164, 9);
    machine.fillStyle(0x181116, 1);
    machine.fillRoundedRect(HUD.x + 28, HUD.y + 324, 248, 136, 8);
    machine.fillStyle(PALETTE.glass, 0.08);
    machine.fillRoundedRect(HUD.x + 40, HUD.y + 334, 224, 82, 12);
    machine.lineStyle(2, PALETTE.gold, 0.42);
    machine.strokeRoundedRect(HUD.x + 28, HUD.y + 324, 248, 136, 8);
    machine.lineStyle(1, 0xffffff, 0.16);
    machine.strokeRoundedRect(HUD.x + 40, HUD.y + 334, 224, 82, 12);
    machine.fillStyle(0x34221b, 1);
    machine.fillRoundedRect(HUD.x + 66, HUD.y + 444, 172, 18, 9);
    this.hudLayer.add(machine);
    this.hudLayer.add(this.uiText(HUD.x + 104, HUD.y + 318, "BOLILLERO", 12, "#bca06d", "center", 120));
    this.hudLayer.add(this.uiText(HUD.x + 206, HUD.y + 319, `${remainingBalls} quedan`, 11, remainingBalls <= 5 ? "#ffcbcb" : "#9fe7db", "left", 68));
    const ball = this.add.container(HUD.x + HUD.width / 2, HUD.y + 398);
    const ballG = this.add.graphics();
    drawBallFace(ballG, 0, 0, 70, this.state.currentBall !== null);
    ball.add(ballG);
    ball.add(this.uiText(0, -38, this.state.currentBall === null ? "--" : String(this.state.currentBall), 64, "#171116", "center"));
    ball.add(this.uiText(0, 28, this.state.currentBall === null ? "EN ESPERA" : "EN JUEGO", 10, "#6f6257", "center"));
    this.hudLayer.add(ball);
    this.drawBallTimer(HUD.x + 30, HUD.y + 486, 244, remainingBalls);
    this.drawBallCage(HUD.x + 47, HUD.y + 522);
    if (this.state.currentBall !== null) {
      this.tweens.add({ targets: ball, scale: { from: 1.11, to: 1 }, duration: 210, ease: "Back.easeOut" });
    }

    const called = this.state.calledBalls.slice(-10).join("  ");
    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 568, `ULTIMAS BOLILLAS / QUEDAN ${remainingBalls}`, 11, "#bca06d", "left"));
    this.hudLayer.add(this.uiText(HUD.x + 30, HUD.y + 586, called || "Ninguna", 16, "#f0dfba", "left", 238));
    const msg = this.add.graphics();
    msg.fillStyle(0x241d20, 1);
    msg.fillRoundedRect(HUD.x + 18, HUD.y + 612, 268, 54, 7);
    msg.lineStyle(1, PALETTE.paperDark, 0.65);
    msg.strokeRoundedRect(HUD.x + 18, HUD.y + 612, 268, 54, 7);
    this.hudLayer.add(msg);
    this.hudLayer.add(this.uiText(HUD.x + 32, HUD.y + 625, this.state.lastMessage, 13, "#d7c8aa", "left", 238));

    if (this.state.boss) {
      this.drawBossBar(this.state.boss.name, this.state.boss.progress, this.state.boss.target);
    }

    if (this.state.bossAction) {
      const bossNotice = this.add.graphics();
      bossNotice.fillStyle(0x2c1215, 0.94);
      bossNotice.fillRoundedRect(112, 126, 756, 42, 8);
      bossNotice.lineStyle(1, PALETTE.red, 0.8);
      bossNotice.strokeRoundedRect(112, 126, 756, 42, 8);
      this.hudLayer.add(bossNotice);
      this.hudLayer.add(this.uiText(132, 138, `${this.state.bossAction.label}: ${this.state.bossAction.detail}`, 15, "#ffcbcb", "left", 720));
    }

    this.drawOwnedBonusBadges();
  }

  private drawStatChip(x: number, y: number, width: number, label: string, value: string, valueColor: string): void {
    addStatChip(this, this.hudLayer, x, y, width, label, value, valueColor);
  }

  private drawBallTimer(x: number, y: number, width: number, remainingBalls: number): void {
    const isActive = this.state.phase === "table" && this.state.currentBall !== null;
    this.ballTimerUi = createBallTimerRef(this, this.hudLayer, x, y, width, remainingBalls, this.ballSecondsRemaining, BALL_SECONDS, isActive);
  }

  private drawBallCage(x: number, y: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x080608, 0.34);
    g.fillRoundedRect(x + 4, y + 5, 210, 34, 15);
    g.fillStyle(0x211a20, 1);
    g.fillRoundedRect(x, y, 210, 34, 15);
    g.fillStyle(PALETTE.glass, 0.08);
    g.fillRoundedRect(x + 6, y + 5, 198, 9, 6);
    g.lineStyle(1, 0x6a5a3f, 1);
    g.strokeRoundedRect(x, y, 210, 34, 15);
    g.lineStyle(1, PALETTE.gold, 0.22);
    g.beginPath();
    g.moveTo(x + 16, y + 27);
    g.lineTo(x + 194, y + 27);
    g.strokePath();
    this.hudLayer.add(g);

    const balls = this.state.calledBalls.slice(-7);
    const latest = balls[balls.length - 1];
    balls.forEach((ball, index) => {
      const cx = x + 22 + index * 27;
      const isLatest = ball === latest;
      const bg = this.add.graphics();
      drawBallFace(bg, cx, y + 17, isLatest ? 10 : 9, isLatest);
      if (isLatest) {
        bg.lineStyle(1, PALETTE.gold, 0.55);
        bg.strokeCircle(cx, y + 17, 13);
      }
      this.hudLayer.add(bg);
      this.hudLayer.add(this.uiText(cx, y + 10, String(ball), 9, "#171116", "center"));
    });
  }

  private drawBossBar(name: string, progress: number, target: number): void {
    const x = HUD.x + 30;
    const y = HUD.y + 96;
    const width = 244;
    const pct = Phaser.Math.Clamp(progress / target, 0, 1);
    const g = this.add.graphics();
    g.fillStyle(0x33242b, 1);
    g.fillRoundedRect(x, y, width, 18, 9);
    g.fillStyle(PALETTE.red, 1);
    g.fillRoundedRect(x, y, width * pct, 18, 9);
    this.hudLayer.add(g);
    this.hudLayer.add(this.uiText(x, y - 20, `${name} ${Math.floor(pct * 100)}%`, 13, "#ffcbcb", "left", width));
  }

  private drawOwnedBonusBadges(): void {
    if (this.state.ownedBonusIds.length === 0 && this.state.activeContractIds.length === 0) {
      return;
    }

    const labels = this.state.ownedBonusIds
      .map((id) => PERMANENT_BONUSES.find((candidate) => candidate.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    const contracts = this.state.activeContractIds.map((id) => CONTRACTS[id].label);
    const allLabels = [...labels, ...contracts.map((label) => `Contrato: ${label}`)];
    const amuletCount = labels.length;
    const contractCount = contracts.length;
    const visibleLabels = allLabels.slice(0, 2);
    const extra = allLabels.length > visibleLabels.length ? ` / +${allLabels.length - visibleLabels.length}` : "";
    const x = PLAY_AREA.x + 56;
    const y = PLAY_AREA.y + 52;
    const g = this.add.graphics();
    g.fillStyle(0x151116, 0.88);
    g.fillRoundedRect(x, y, 246, 36, 7);
    g.lineStyle(1, PALETTE.gold, 0.42);
    g.strokeRoundedRect(x, y, 246, 36, 7);
    this.hudLayer.add(g);
    this.hudLayer.add(this.uiText(x + 12, y + 6, `AMULETOS ${amuletCount} / CONTRATOS ${contractCount}`, 10, "#bca06d", "left", 218));
    this.hudLayer.add(this.uiText(x + 12, y + 20, `${visibleLabels.join(" / ")}${extra}`, 10, "#f2d06b", "left", 218));
  }

  private drawParcaPressure(): void {
    renderParcaPressure(this, this.parcaLayer, { danger: this.parcaDanger() });
  }

  private drawParcaAlert(): void {
    if (this.parcaAlertStage === null || this.state.phase !== "table") {
      return;
    }

    const stage = this.parcaAlertStage;
    const labels = ["", "La mano toca la mesa", "La capucha respira cerca", "La guadana ya apunta"];
    const alert = this.add.container(640, 116);
    const g = this.add.graphics();
    g.fillStyle(0x050306, 0.34);
    g.fillRoundedRect(-268, -30, 536, 60, 10);
    g.fillStyle(0x16070b, 0.92);
    g.fillRoundedRect(-250, -26, 500, 52, 8);
    g.lineStyle(2 + stage, stage >= 3 ? PALETTE.red : PALETTE.gold, 0.85);
    g.strokeRoundedRect(-250, -26, 500, 52, 8);
    g.fillStyle(PALETTE.redDark, 0.18 + stage * 0.09);
    g.fillRoundedRect(-242, -18, 484, 36, 6);
    g.fillStyle(PALETTE.shadow, 0.8);
    g.fillCircle(-214, 0, 15 + stage * 2);
    g.fillStyle(PALETTE.red, 0.52 + stage * 0.1);
    g.fillEllipse(-220, -2, 14, 5);
    g.fillEllipse(-208, -2, 14, 5);
    g.lineStyle(2, stage >= 3 ? PALETTE.red : PALETTE.gold, 0.58);
    g.beginPath();
    g.moveTo(204, -16);
    g.lineTo(226, 0);
    g.lineTo(204, 16);
    g.strokePath();
    alert.add(g);
    const text = this.uiText(0, -8, labels[stage] ?? "La Parca avanza", 18, stage >= 3 ? "#ffcbcb" : "#f2d06b", "center", 460);
    text.setShadow(0, 1, "#050306", 4, true, true);
    alert.add(text);
    alert.setAlpha(0.96);
    this.actionLayer.add(alert);
    this.tweens.add({
      targets: alert,
      y: 102,
      alpha: 0,
      duration: 1250,
      ease: "Cubic.easeOut",
      onComplete: () => alert.destroy(true)
    });
  }

  private parcaDanger(): number {
    return Phaser.Math.Clamp((1.45 - this.state.multiplier) / 1.45, 0, 1);
  }

  private syncParcaMotion(): void {
    const shouldAnimate = this.state.phase === "table" && this.parcaDanger() > 0.12;
    if (!shouldAnimate) {
      this.clearParcaPulse();
      return;
    }
    if (this.parcaPulseTimer) {
      return;
    }
    this.parcaPulseTimer = this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => this.refreshParcaPressureLayer()
    });
  }

  private refreshParcaPressureLayer(): void {
    if (!this.parcaLayer || this.state.phase !== "table") {
      this.clearParcaPulse();
      return;
    }
    this.parcaLayer.removeAll(true);
    this.drawParcaPressure();
  }

  private clearParcaPulse(): void {
    if (this.parcaPulseTimer) {
      this.parcaPulseTimer.remove(false);
      this.parcaPulseTimer = undefined;
    }
  }

  private drawTutorialActions(): void {
    const step = this.tutorialCopy();
    const totalSteps = 9;
    const currentStep = Math.min(this.state.tutorialStep + 1, totalSteps);
    this.actionLayer.add(this.panel(104, 614, 742, 82, 0x18131b, 0.94));
    this.actionLayer.add(this.uiText(128, 630, `Tutorial paso ${currentStep}/${totalSteps} - ${step.title}`, 12, "#bca06d", "left", 486));
    this.actionLayer.add(this.uiText(128, 648, step.text, 14, "#f0dfba", "left", 478));
    this.actionLayer.add(this.uiText(128, 672, `Accion: ${step.action}`, 12, "#9fe7db", "left", 478));
    this.actionLayer.add(this.button(628, 636, 190, 42, step.label, () => this.handleTutorialAction()));
  }

  private tutorialCopy(): { title: string; text: string; action: string; label: string } {
    const improvedSteps = [
      {
        title: "Objetivo",
        text: "Mesa guiada 3x3. Sella coincidencias del carton; todo usa plata ficticia.",
        action: "pulsa Continuar.",
        label: "Continuar"
      },
      {
        title: "Bolilla guiada",
        text: "La guia va a cantar un numero que existe en tu carton.",
        action: "pulsa Cantar bolilla.",
        label: "Cantar bolilla"
      },
      {
        title: "Marca exacta",
        text: "El numero cantado queda iluminado en el carton.",
        action: "toca esa casilla; el boton solo resalta la pista.",
        label: "Resaltar casilla"
      },
      {
        title: "Segunda bolilla",
        text: "Repetimos una vez para fijar el ritmo sin abrir otras reglas.",
        action: "pulsa Cantar otra.",
        label: "Cantar otra"
      },
      {
        title: "Segunda marca",
        text: "La nueva bolilla tambien queda marcada con brillo en el carton.",
        action: "toca la nueva casilla iluminada.",
        label: "Resaltar casilla"
      },
      {
        title: "Premios",
        text: "Las lineas pagan puntos y plata ficticia; el ranking local se mueve con puntos.",
        action: "pulsa Continuar.",
        label: "Continuar"
      },
      {
        title: "Multiplicador",
        text: "Cada bolilla baja el x. Cerrar patrones te da aire cuando la presion sube.",
        action: "pulsa Continuar.",
        label: "Continuar"
      },
      {
        title: "Parca",
        text: "Si el x llega a 0.0 pierdes la mesa. Prioriza coincidencias utiles.",
        action: "pulsa Continuar.",
        label: "Continuar"
      },
      {
        title: "Asilo 3x3",
        text: "Termina la guia y entra a una mesa real. El Kiosco aparece fuera del tutorial.",
        action: "pulsa Ir a mesa.",
        label: "Ir a mesa 3x3"
      }
    ];
    return improvedSteps[Math.min(this.state.tutorialStep, improvedSteps.length - 1)];

  }

  private handleTutorialAction(): void {
    if (this.state.tutorialStep === 1 || this.state.tutorialStep === 3) {
      this.state = drawGuidedTutorialBall(this.state);
      this.state = advanceTutorialStep(this.state);
      this.pendingBallDropValue = this.state.currentBall;
      this.audio.playBall();
      this.render();
      return;
    }
    if (this.state.tutorialStep === 2 || this.state.tutorialStep === 4) {
      this.state = { ...this.state, lastMessage: "Toca en el carton la casilla iluminada que coincide con la bolilla." };
      this.render();
      return;
    }
    if (this.state.tutorialStep >= 8) {
      this.state = advanceTutorialStep(this.state);
      this.primeOpeningBall();
      this.render();
      return;
    }
    this.state = advanceTutorialStep(this.state);
    this.render();
  }

  private drawTableActions(): void {
    if (this.state.pendingShopAction) {
      this.actionLayer.add(this.panel(92, 614, 770, 78, 0x18131b, 0.96));
      this.actionLayer.add(this.uiText(118, 630, "TRAMPA ACTIVA", 12, "#9fe7db", "left"));
      this.actionLayer.add(this.uiText(118, 650, this.state.lastMessage, 15, "#f0dfba", "left", 508));
      this.actionLayer.add(this.uiText(118, 672, "Pasa por una casilla para ver si el objetivo es valido.", 12, "#bca06d", "left", 508));
      this.actionLayer.add(this.button(682, 636, 150, 38, "Cancelar", () => this.cancelPendingShop()));
      return;
    }

    this.actionLayer.add(this.panel(918, 642, 316, 92, 0x18131b, 0.94));
    this.actionLayer.add(this.uiText(944, 656, this.state.currentBall === null ? "La mesa abre gratis." : `Bonus actual: ${this.quickBonusLabel()}`, 12, "#bca06d", "left", 260));
    this.actionLayer.add(this.button(944, 680, 158, 42, this.state.currentBall === null ? "Primera bolilla" : "Pedir bolilla", () => this.drawBall()));
    this.actionLayer.add(this.button(1114, 680, 96, 42, "Kiosco", () => this.openKiosk()));
  }

  private drawKiosk(): void {
    const offers = this.kioskOffers();
    this.actionLayer.add(this.panel(334, 70, 642, 574, 0x181316, 0.98));
    const counter = this.add.graphics();
    counter.fillStyle(0x0b0708, 0.5);
    counter.fillRoundedRect(350, 94, 594, 70, 10);
    counter.fillStyle(0x3a1f20, 1);
    counter.fillRoundedRect(360, 100, 572, 54, 8);
    for (let stripe = 0; stripe < 6; stripe += 1) {
      counter.fillStyle(stripe % 2 === 0 ? PALETTE.redDark : 0xd9c28c, 0.9);
      counter.fillRoundedRect(374 + stripe * 88, 106, 56, 42, 4);
    }
    counter.fillStyle(0x100b0d, 0.76);
    counter.fillRoundedRect(374, 178, 560, 282, 8);
    counter.lineStyle(1, PALETTE.gold, 0.22);
    counter.strokeRoundedRect(374, 178, 560, 282, 8);
    counter.fillStyle(0x2a1d1b, 1);
    counter.fillRoundedRect(382, 454, 544, 20, 8);
    counter.fillStyle(PALETTE.coffee, 1);
    counter.fillRoundedRect(334, 562, 642, 78, 12);
    counter.fillStyle(0xffffff, 0.08);
    counter.fillRoundedRect(344, 570, 620, 10, 6);
    counter.fillStyle(0x120c0f, 0.24);
    counter.fillRoundedRect(340, 596, 630, 36, 9);
    counter.fillStyle(PALETTE.paperDark, 1);
    counter.fillRect(386, 540, 108, 28);
    counter.fillRect(522, 540, 62, 28);
    counter.fillStyle(PALETTE.redDark, 1);
    counter.fillCircle(884, 570, 18);
    this.actionLayer.add(counter);

    const timerTrack = this.add.graphics();
    timerTrack.fillStyle(0x2a2224, 1);
    timerTrack.fillRoundedRect(382, 154, 404, 16, 8);
    timerTrack.fillStyle(0xffffff, 0.1);
    timerTrack.fillRoundedRect(386, 157, 178, 4, 2);
    this.actionLayer.add(timerTrack);
    const timerFill = this.add.graphics();
    this.actionLayer.add(timerFill);
    const timerText = this.text(804, 110, `${this.state.kioskSeconds}s`, 28, this.state.kioskSeconds <= 5 ? "#ff6868" : "#f0dfba", "left");
    this.kioskTimerUi = { fill: timerFill, text: timerText, x: 385, y: 157, width: 398 };
    this.updateKioskTimerDisplay();

    this.actionLayer.add(this.uiText(382, 110, "MOSTRADOR NOCTURNO", 11, "#0f0b0d", "left", 210));
    this.actionLayer.add(this.text(382, 126, `Kiosco de cafe`, 30, "#fff0bf", "left"));
    this.actionLayer.add(timerText);
    this.actionLayer.add(this.text(804, 146, `$${this.state.money}`, 22, "#e0b449", "left"));
    this.actionLayer.add(this.text(384, 176, "Plata ficticia: sin dinero real, premios reales ni retiros. Las ofertas no cambian al entrar y salir.", 15, "#f0dfba", "left", 520));
    this.actionLayer.add(this.uiText(804, 176, this.state.blackjackPlayedThisVisit ? "21 ya usado" : "1 mano de 21 disponible", 12, "#9fe7db", "left", 150));

    if (this.state.phase === "blackjack") {
      this.actionLayer.add(this.text(392, 224, "Mano en curso. El mostrador queda cerrado hasta cobrar o salir.", 18, "#f0dfba", "left", 510));
      this.drawBlackjackTray(392, 330);
    } else {
      offers.forEach((item, index) => {
        const x = 392 + index * 176;
        const y = 220;
        this.actionLayer.add(this.shopTicket(x, y, item));
      });
      const blackjackLabel = this.state.blackjackPlayedThisVisit ? "21 usado" : "Blackjack 21";
      this.actionLayer.add(this.button(392, 500, 220, 50, blackjackLabel, () => this.startBlackjack()));
      this.actionLayer.add(this.button(674, 500, 220, 50, "Volver a mesa", () => this.closeKiosk()));
    }
  }

  private kioskOffers(): ShopItem[] {
    const offered = this.state.shopOfferIds
      .map((id) => SHOP_ITEMS.find((item) => item.id === id))
      .filter((item): item is ShopItem => Boolean(item));
    return offered.length > 0 ? offered : SHOP_ITEMS.slice(0, 3);
  }

  private shopTicket(x: number, y: number, item: ShopItem): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const cost = adjustedShopCost(this.state, item.id, item.cost);
    const directed = isDirectedShopItem(item.id);
    const canBuy = this.state.money >= cost;
    const g = this.add.graphics();
    drawCardFace(g, 0, 0, 158, 226, !canBuy);
    drawTicketNotches(g, 0, 0, 158, 226, 0x0f0b0d);
    g.fillStyle(directed ? 0xd9c28c : 0xc4d4c6, 1);
    g.fillRoundedRect(0, 0, 158, 32, 5);
    g.fillStyle(0xffffff, 0.14);
    g.fillRect(8, 6, 96, 6);
    g.fillStyle(0x0c0909, 0.08);
    g.fillRoundedRect(10, 132, 138, 74, 5);
    g.fillStyle(directed ? PALETTE.redDark : PALETTE.teal, canBuy ? 0.92 : 0.46);
    g.fillCircle(132, 54, 16);
    g.lineStyle(2, 0x6c5131, 1);
    g.strokeRoundedRect(0, 0, 158, 226, 5);
    g.lineStyle(1, 0x9d855d, 0.9);
    g.beginPath();
    g.moveTo(14, 126);
    g.lineTo(144, 126);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.22);
    g.strokeCircle(132, 54, 10);
    container.add(g);
    container.add(this.text(79, 7, `$${cost}`, 18, "#171116", "center"));
    container.add(this.uiText(14, 34, directed ? "DIRIGIDA" : "INSTANTANEA", 10, directed ? "#80252d" : "#17584f", "left", 130));
    container.add(this.text(14, 44, item.label, 20, "#171116", "left", 130));
    container.add(this.text(14, 88, item.hint, 13, "#31231f", "left", 130));
    container.add(this.text(14, 138, item.flavor, 13, "#6b2f2f", "left", 130));
    container.add(this.button(18, 178, 122, 34, canBuy ? directed ? "Activar" : "Comprar" : "Sin plata", () => this.buyItem(item)));
    return container;
  }

  private drawBlackjackTray(x: number, y: number): void {
    const blackjack = this.state.blackjack;
    this.actionLayer.add(this.panel(x, y, 502, 142, 0x211820, 0.98));
    this.actionLayer.add(this.text(x + 20, y + 16, "Blackjack 21", 20, "#f2d06b", "left"));

    if (!blackjack) {
      this.actionLayer.add(this.text(x + 20, y + 50, "La bandeja esta vacia.", 16, "#f0dfba", "left"));
      this.actionLayer.add(this.button(x + 344, y + 52, 120, 42, "Volver", () => this.returnFromBlackjack()));
      return;
    }

    const playerTotal = handValue(blackjack.playerHand);
    const dealerTotal = handValue(blackjack.dealerHand);
    this.drawBlackjackHand("VOS", blackjack.playerHand, playerTotal, x + 20, y + 48, "#ffffff");
    this.drawBlackjackHand("CASA", blackjack.dealerHand, dealerTotal, x + 20, y + 94, "#d7c8aa");
    this.actionLayer.add(this.text(x + 226, y + 20, this.blackjackResultText(), 14, "#f0dfba", "left", 108));
    this.actionLayer.add(this.uiText(x + 226, y + 88, `${handLabel(blackjack.playerHand)} / ${handLabel(blackjack.dealerHand)}`, 10, "#bca06d", "left", 112));

    if (blackjack.settled) {
      this.actionLayer.add(this.button(x + 354, y + 52, 118, 44, "Cobrar", () => this.returnFromBlackjack()));
    } else {
      this.actionLayer.add(this.button(x + 336, y + 18, 72, 36, "Pedir", () => this.hitBlackjack()));
      this.actionLayer.add(this.button(x + 416, y + 18, 74, 36, "Planto", () => this.standBlackjack()));
      this.actionLayer.add(this.button(x + 376, y + 66, 74, 34, "Salir", () => this.returnFromBlackjack()));
    }
  }

  private drawBlackjackHand(label: string, cards: BlackjackCard[], total: number, x: number, y: number, color: string): void {
    this.actionLayer.add(this.uiText(x, y - 15, `${label} ${total}`, 10, color, "left", 64));
    const visibleCards = cards.length > 5 ? cards.slice(0, 4) : cards;
    visibleCards.forEach((card, index) => {
      const spacing = cards.length > 5 ? 24 : 26;
      const cardX = x + 64 + index * spacing;
      const g = this.add.graphics();
      drawCardFace(g, cardX, y - 24, 34, 42);
      this.actionLayer.add(g);
      this.actionLayer.add(this.text(cardX + 17, y - 17, card.label, 16, "#171116", "center", 28));
      this.actionLayer.add(this.uiText(cardX + 17, y + 3, card.value === 11 ? "A" : String(card.value), 8, "#80252d", "center", 26));
    });
    if (cards.length > visibleCards.length) {
      const overflow = cards.length - visibleCards.length;
      const cardX = x + 64 + visibleCards.length * 24;
      const g = this.add.graphics();
      drawCardFace(g, cardX, y - 24, 38, 42, true);
      this.actionLayer.add(g);
      this.actionLayer.add(this.text(cardX + 19, y - 15, `+${overflow}`, 16, "#171116", "center", 30));
      this.actionLayer.add(this.uiText(cardX + 19, y + 4, "mas", 8, "#80252d", "center", 30));
    }
  }

  private drawTableWon(): void {
    const isLast = this.state.tableIndex === TABLE_CONFIGS.length - 1;
    this.drawEndState("TIMBA!", isLast ? "El jefe no llego a cantar." : "Ganaste esta mesa. La noche sigue.", isLast ? "Cerrar run" : "Continuar", () => {
      this.clearKioskTimer();
      this.clearBallTimer();
      this.state = advanceAfterTableWin(this.state);
      this.primeOpeningBall();
      this.render();
    });
  }

  private drawContractChoice(): void {
    const offers = this.state.contractOfferIds.map((id) => CONTRACTS[id]);
    this.actionLayer.add(this.panel(284, 88, 730, 528, 0x181316, 0.98));
    this.actionLayer.add(this.text(650, 122, "Contratos de mesa", 38, "#f2d06b", "center"));
    this.actionLayer.add(this.text(650, 168, "Elegi una regla torcida para esta run. Son mejoras con costo: ayudan, pero cambian la noche.", 18, "#f0dfba", "center", 620));

    offers.forEach((contract, index) => {
      this.actionLayer.add(this.contractTicket(344 + index * 210, 236, contract.id));
    });

    this.actionLayer.add(this.button(532, 532, 216, 48, "Seguir sin firmar", () => this.skipContract()));
  }

  private contractTicket(x: number, y: number, contractId: ContractId): Phaser.GameObjects.Container {
    const contract = CONTRACTS[contractId];
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.paper, 1);
    g.fillRoundedRect(0, 0, 184, 238, 6);
    g.fillStyle(0x271a1c, 1);
    g.fillRect(0, 0, 184, 36);
    g.fillStyle(0x80252d, 0.16);
    g.fillRoundedRect(14, 126, 156, 68, 6);
    g.lineStyle(2, PALETTE.gold, 0.9);
    g.strokeRoundedRect(0, 0, 184, 238, 6);
    container.add(g);
    container.add(this.uiText(18, 10, "CONTRATO", 11, "#f2d06b", "left", 140));
    container.add(this.text(16, 56, contract.label, 22, "#171116", "left", 150));
    container.add(this.text(16, 108, contract.hint, 14, "#31231f", "left", 150));
    container.add(this.text(16, 164, "Se mantiene durante la run.", 12, "#6b2f2f", "left", 150));
    container.add(this.button(28, 196, 128, 34, "Firmar", () => this.chooseContract(contractId)));
    return container;
  }

  private drawUpgradeShop(): void {
    const offers = this.state.upgradeOfferIds
      .map((id) => PERMANENT_BONUSES.find((bonus) => bonus.id === id))
      .filter((bonus): bonus is PermanentBonus => Boolean(bonus));
    this.actionLayer.add(this.panel(296, 86, 710, 530, 0x181316, 0.98));
    this.actionLayer.add(this.text(650, 124, "Mesa de amuletos", 38, "#f2d06b", "center"));
    this.actionLayer.add(this.text(650, 170, "Compra un bonus permanente para que la run respire antes de subir la dificultad.", 18, "#f0dfba", "center", 610));
    this.actionLayer.add(this.text(650, 202, `Plata disponible $${this.state.money}`, 20, "#e0b449", "center"));

    offers.forEach((bonus, index) => {
      this.actionLayer.add(this.permanentTicket(352 + index * 214, 238, bonus));
    });

    this.actionLayer.add(this.button(398, 522, 190, 50, "Guardar plata", () => this.skipUpgrade()));
    this.actionLayer.add(this.button(708, 522, 190, 50, "Siguiente mesa", () => this.nextTable()));
  }

  private permanentTicket(x: number, y: number, bonus: PermanentBonus): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const owned = this.state.ownedBonusIds.includes(bonus.id);
    const canBuy = this.state.money >= bonus.cost && !owned;
    const g = this.add.graphics();
    g.fillStyle(owned ? 0xc8b078 : PALETTE.paper, 1);
    g.fillRoundedRect(0, 0, 184, 248, 6);
    g.fillStyle(0x2b211f, 1);
    g.fillRect(0, 0, 184, 34);
    g.lineStyle(2, owned ? PALETTE.gold : 0x6c5131, 1);
    g.strokeRoundedRect(0, 0, 184, 248, 6);
    container.add(g);
    container.add(this.text(92, 8, `$${bonus.cost}`, 18, "#f2d06b", "center"));
    container.add(this.text(16, 52, bonus.label, 22, "#171116", "left", 150));
    container.add(this.text(16, 102, bonus.hint, 15, "#31231f", "left", 150));
    container.add(this.text(16, 156, bonus.flavor, 14, "#6b2f2f", "left", 150));
    container.add(this.button(28, 202, 128, 36, owned ? "Comprado" : canBuy ? "Comprar" : "Sin plata", () => this.buyUpgrade(bonus)));
    return container;
  }

  private drawEndState(title: string, subtitle: string, action: string, onClick: () => void): void {
    const win = title === "TIMBA!";
    const fx = this.add.graphics();
    fx.fillStyle(win ? 0x2f2210 : 0x080407, win ? 0.34 : 0.58);
    fx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    fx.lineStyle(4, win ? PALETTE.gold : PALETTE.red, 0.32);
    for (let i = 0; i < 5; i += 1) {
      fx.strokeCircle(640, 348, 150 + i * 48);
    }
    if (win) {
      drawParcaVictoryBreak(fx);
    } else {
      drawParcaEndSilhouette(fx);
    }
    this.actionLayer.add(fx);
    const terminal = isTerminalPhase(this.state.phase);
    const layout = endStateLayout(terminal);
    this.actionLayer.add(this.panel(370, layout.panelY, 540, layout.panelHeight, 0x18131b, 0.97));
    const titleText = this.text(640, 248, title, 72, win ? "#f2d06b" : "#ff6868", "center");
    titleText.setShadow(0, 4, win ? "#2f2210" : "#3b080e", 8, true, true);
    this.actionLayer.add(titleText);
    const subtitleText = this.text(640, 348, subtitle, 24, "#f0dfba", "center", 460);
    subtitleText.setShadow(0, 2, "#050306", 5, true, true);
    this.actionLayer.add(subtitleText);
    if (layout.showRunRecap) {
      this.drawRunRecap();
    }
    this.actionLayer.add(this.button(530, layout.buttonY, 220, 56, action, onClick));
  }

  private drawRunRecap(): void {
    const entry = this.latestRunEntry;
    if (!entry) {
      return;
    }
    const rank = this.latestRunRank ? `#${this.latestRunRank}` : "fuera del top";
    const grade = this.scoreGrade(entry.leaderboardScore);
    this.actionLayer.add(this.uiText(448, 386, "RANKING LOCAL", 12, "#bca06d", "left", 160));
    this.actionLayer.add(this.text(448, 406, `${entry.leaderboardScore} pts`, 30, "#f2d06b", "left"));
    this.actionLayer.add(this.uiText(668, 414, this.scoreGradeText(grade), 16, grade.color, "left", 148));
    this.actionLayer.add(this.uiText(448, 444, `${rank} / Mesa ${entry.tableIndex + 1} / ${entry.rounds} rondas / $${entry.money}`, 14, "#f0dfba", "left", 384));
    this.actionLayer.add(this.uiText(448, 466, "Global: pendiente hasta tener backend y runs verificadas.", 12, "#9fe7db", "left", 384));
  }

  private currentLeaderboardChase(): { score: number; rank: number; deltaToNext: number } {
    const entry = this.createLiveLeaderboardEntry();
    return {
      score: entry.leaderboardScore,
      rank: rankEntry(this.leaderboard, entry),
      deltaToNext: getScoreDeltaToNextRank(this.leaderboard, entry)
    };
  }

  private createLiveLeaderboardEntry(): LeaderboardEntry {
    const table = TABLE_CONFIGS[this.state.tableIndex];
    const summary = createRunSummary({
      score: this.state.score,
      money: this.state.money,
      tableIndex: this.state.tableIndex,
      tableTitle: table.title,
      won: this.state.phase === "runWon",
      reason: this.state.phase === "runWon" ? "Ganaste toda la noche." : this.state.phase === "lost" ? this.state.lostReason || "La run termino." : "Run en curso.",
      rounds: this.state.round,
      calledBalls: this.state.calledBalls.length,
      multiplier: this.state.multiplier,
      ownedBonusIds: [...this.state.ownedBonusIds, ...this.state.activeContractIds]
    });

    return {
      ...summary,
      leaderboardScore: scoreRunForLeaderboard(summary)
    };
  }

  private scoreGrade(score: number): { label: string; medal: string; color: string } {
    const grade = getLeaderboardGrade(score);
    const medal = getLeaderboardMedal(score);
    const colors: Record<ReturnType<typeof getLeaderboardGrade>, string> = {
      D: "#d7c8aa",
      C: "#dca670",
      B: "#f0dfba",
      A: "#9fe7db",
      S: "#d7dde6",
      SS: "#f2d06b",
      SSS: "#ffdf7a"
    };
    return {
      label: grade,
      medal: medal === "none" ? "GRADO" : medal.toUpperCase(),
      color: colors[grade]
    };
  }

  private scoreGradeText(grade: { label: string; medal: string }): string {
    if (grade.medal === "-") {
      return grade.label;
    }
    return `${grade.medal} ${grade.label}`;
  }

  private handleCellClick(cell: BoardCell): void {
    this.startMusic();
    if (this.state.phase !== "tutorial" && this.state.phase !== "table") {
      return;
    }

    if (this.state.pendingShopAction) {
      this.handlePendingShopTarget(cell);
      return;
    }

    const canStampCurrentCell = this.state.currentBall === cell.value && !cell.marked;
    if (this.state.parcaMark?.cellId === cell.id && !canStampCurrentCell) {
      this.state = wardParcaMark(this.state, cell.id);
      this.duckMusic(0.28, 240);
      this.audio.playParca("warning");
      this.unlockLocalAchievements(["parca-warded"]);
      this.renderWithStampTween({ cellId: cell.id, parcaWard: true });
      return;
    }

    if (this.state.swapMode) {
      this.handleSwapClick(cell);
      return;
    }

    if (this.state.fuzzyStampMode) {
      const wasMarked = cell.marked;
      this.state = fuzzyStampCell(this.state, cell.id);
      if (!wasMarked && this.state.board[cell.id]?.marked) {
        this.playStampCue(true);
        if (this.state.recentRewards.length > 0) {
          this.playRewardCue();
        }
      } else if (!wasMarked) {
        this.playStampCue(false);
      }
      this.unlockFromCurrentState();
      this.renderWithStampTween();
      if (this.state.phase === "tableWon") {
        this.clearBallTimer();
        this.playWinCue();
      }
      return;
    }

    const wasMarked = cell.marked;
    this.state = markMatchingCell(this.state, cell.id, this.ballSecondsRemaining);
    const didMark = !wasMarked && Boolean(this.state.board[cell.id]?.marked);
    if (didMark) {
      this.playStampCue(true);
      if (this.state.recentRewards.length > 0) {
        this.playRewardCue();
      }
    } else if (this.state.currentBall !== null) {
      if (this.state.phase === "tutorial") {
        this.state = { ...this.state, lastMessage: "Esa no es la casilla guiada. Busca el numero iluminado antes de seguir." };
      }
      this.playStampCue(false);
    }
    this.unlockFromCurrentState();
    this.renderWithStampTween();
    if (didMark && this.state.phase === "tutorial") {
      this.state = advanceTutorialStep(this.state);
      this.render();
      return;
    }
    if (this.state.phase === "tableWon") {
      this.clearBallTimer();
      this.playWinCue();
    }
  }

  private handleSwapClick(cell: BoardCell): void {
    if (this.state.swapFirstCellId === null) {
      this.state = {
        ...this.state,
        swapFirstCellId: cell.id,
        selectedCellId: cell.id,
        lastMessage: "Elegiste la primera casilla. Toca otra para cambiarla."
      };
      this.render();
      return;
    }

    this.state = swapCells(this.state, this.state.swapFirstCellId, cell.id);
    this.render();
  }

  private handlePendingShopTarget(cell: BoardCell): void {
    if (!this.state.pendingShopAction) {
      return;
    }

    const beforeBoard = this.state.board;
    this.state = applyDirectedShopAction(this.state, cell.id);
    if (this.state.board === beforeBoard) {
      this.playShopCue("cancel");
      this.render();
      return;
    }

    this.playShopCue("buy");
    this.unlockFromCurrentState();
    this.renderWithStampTween();
    if (this.state.phase === "table") {
      this.startBallTimer();
    }
    if (this.state.phase === "tableWon") {
      this.clearBallTimer();
      this.playWinCue();
    }
  }

  private cancelPendingShop(): void {
    this.state = cancelPendingShopAction(this.state);
    this.playShopCue("cancel");
    this.render();
    if (this.state.kioskSeconds > 0) {
      this.startKioskTimer();
    }
  }

  private drawBall(): void {
    if (this.state.phase !== "table" && this.state.phase !== "tutorial") {
      return;
    }

    this.clearBallTimer();
    this.state = drawNextBall(this.state);
    this.ballSecondsRemaining = BALL_SECONDS;
    this.pendingBallDropValue = this.state.currentBall;
    this.audio.playBall();
    this.render();
    this.cameras.main.shake(120, 0.0042);
    this.cameras.main.flash(45, 238, 221, 172, false);
    if (this.state.phase === "table") {
      this.startBallTimer();
    }
    if (this.state.phase === "lost") {
      this.playLoseCue();
    }
  }

  private openKiosk(): void {
    this.clearBallTimer();
    this.resetParcaCueForDetour();
    this.state = enterKiosk(this.state);
    this.visitedKioskRounds.add(this.state.round);
    this.unlockLocalAchievements(achievementIdsFromKioskVisits(this.visitedKioskRounds.size));
    this.playShopCue("open");
    this.pendingKioskEntrance = true;
    this.render();
    this.startKioskTimer();
  }

  private startKioskTimer(): void {
    this.clearKioskTimer();
    if (this.state.phase !== "kiosk" || this.state.kioskSeconds <= 0) {
      return;
    }
    this.kioskTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.state.phase !== "kiosk") {
          this.clearKioskTimer();
          return;
        }
        if (this.state.kioskSeconds <= 1) {
          this.closeKiosk();
          return;
        }
        this.state = { ...this.state, kioskSeconds: this.state.kioskSeconds - 1 };
        this.updateKioskTimerDisplay();
      }
    });
  }

  private closeKiosk(): void {
    this.clearKioskTimer();
    this.state = leaveKiosk(this.state);
    this.ballSecondsRemaining = BALL_SECONDS;
    this.resetParcaCueForDetour();
    this.render();
    if (this.state.phase === "table") {
      this.startBallTimer();
    }
  }

  private buyItem(item: ShopItem): void {
    if (this.state.phase !== "kiosk") {
      return;
    }

    const cost = adjustedShopCost(this.state, item.id, item.cost);
    if (this.state.money < cost) {
      this.state = { ...this.state, lastMessage: "No te alcanza la plata ficticia." };
      this.playShopCue("cancel");
      this.render();
      return;
    }

    const moneyBefore = this.state.money;
    if (isDirectedShopItem(item.id)) {
      this.clearKioskTimer();
    }

    this.state = applyImmediateShopItem(this.state, item.id, cost);
    if (this.state.money < moneyBefore || this.state.pendingShopAction) {
      this.playShopCue("buy");
    }
    if (this.state.phase === "table") {
      this.clearKioskTimer();
      this.ballSecondsRemaining = BALL_SECONDS;
    }
    this.render();
    if (this.state.phase === "table" && !this.state.pendingShopAction) {
      this.startBallTimer();
    }
  }

  private buyUpgrade(bonus: PermanentBonus): void {
    const hadBonus = this.state.ownedBonusIds.includes(bonus.id);
    this.state = buyPermanentBonus(this.state, bonus.id);
    if (!hadBonus && this.state.ownedBonusIds.includes(bonus.id)) {
      this.unlockLocalAchievements(achievementIdsFromRunState(this.state));
    }
    this.playShopCue("buy");
    this.render();
  }

  private skipUpgrade(): void {
    this.state = skipPermanentBonus(this.state);
    this.playShopCue("cancel");
    this.render();
  }

  private chooseContract(contractId: ContractId): void {
    this.state = chooseTableContract(this.state, contractId);
    this.unlockLocalAchievements(["first-contract", ...achievementIdsFromRunState(this.state)]);
    this.playShopCue("buy");
    this.resetParcaCueForDetour();
    this.clearParcaPulse();
    this.primeOpeningBall();
    this.render();
  }

  private skipContract(): void {
    this.state = skipTableContract(this.state);
    this.playShopCue("cancel");
    this.resetParcaCueForDetour();
    this.clearParcaPulse();
    this.primeOpeningBall();
    this.render();
  }

  private nextTable(): void {
    this.clearBallTimer();
    this.resetParcaCueForDetour();
    this.clearParcaPulse();
    this.state = startNextTable(this.state);
    this.primeOpeningBall();
    this.render();
  }

  private startBlackjack(): void {
    if (this.state.phase !== "kiosk") {
      return;
    }

    if (this.state.blackjackPlayedThisVisit) {
      this.state = { ...this.state, lastMessage: "Ya jugaste 21 en este kiosco." };
      this.render();
      return;
    }

    this.clearKioskTimer();
    this.resetParcaCueForDetour();
    this.state = startBlackjackSideGame(this.state);
    this.playShopCue("open");
    this.render();
  }

  private hitBlackjack(): void {
    if (!this.state.blackjack) {
      return;
    }
    const blackjack = blackjackHit(this.state.blackjack);
    this.state = { ...this.state, blackjack };
    if (blackjack.settled) {
      this.audio.playBlackjack("bust");
    } else {
      this.audio.playBlackjack("hit");
    }
    this.render();
  }

  private standBlackjack(): void {
    if (!this.state.blackjack) {
      return;
    }
    const blackjack = blackjackStand(this.state.blackjack);
    this.state = { ...this.state, blackjack };
    this.audio.playBlackjack(blackjack.result === "lose" ? "bust" : "cashout");
    this.render();
  }

  private returnFromBlackjack(): void {
    const blackjackResult = this.state.blackjack?.result;
    this.state = resolveBlackjackReturn(this.state);
    if (blackjackResult === "win") {
      this.blackjackWinStreak += 1;
    } else if (blackjackResult === "lose") {
      this.blackjackWinStreak = 0;
    }
    this.unlockLocalAchievements(achievementIdsFromBlackjackResult(blackjackResult, this.blackjackWinStreak));
    this.resetParcaCueForDetour();
    this.playShopCue("open");
    this.render();
    this.startKioskTimer();
  }

  private resetParcaCueForDetour(): void {
    this.parcaCueStage = 0;
    this.parcaAlertStage = null;
  }

  private blackjackResultText(): string {
    const win = this.state.ownedBonusIds.includes("house-amulet") ? 40 : 30;
    const push = this.state.ownedBonusIds.includes("house-amulet") ? 10 : 5;
    const loss = this.state.ownedBonusIds.includes("house-amulet") ? 10 : 15;
    if (!this.state.blackjack || !this.state.blackjack.settled) {
      return `Gana $${win}, empate $${push}, perder cuesta $${loss}.`;
    }
    if (this.state.blackjack.result === "win") {
      return `Ganaste la mano. Cobra $${win}.`;
    }
    if (this.state.blackjack.result === "push") {
      return `Empate. Rescatas $${push}.`;
    }
    return `Perdiste la mano. La casa cobra $${loss}.`;
  }

  private renderWithStampTween(options: { cellId?: number; parcaWard?: boolean } = {}): void {
    const selectedCellId = options.cellId ?? this.state.selectedCellId;
    const rewards = [...this.state.recentRewards];
    const rewardMoney = rewards.reduce((sum, reward) => sum + reward.money, 0);
    const rewardScore = rewards.reduce((sum, reward) => sum + reward.score, 0);
    const rewardMultiplier = rewards.reduce((sum, reward) => sum + reward.multiplier, 0);
    this.render();
    if (selectedCellId !== null) {
      this.cameras.main.flash(70, 224, 180, 73, false);
      this.cameras.main.shake(85, 0.0018);
      this.drawCellPulse(selectedCellId, options.parcaWard ?? false);
    }
    if (rewards.length > 0) {
      playPatternRewardSweep(this, this.effectsLayer, rewards, this.boardMetrics());
    }
    if (rewardMoney > 0 || rewardMultiplier > 0) {
      playHudRewardPop(this, this.hudLayer, rewardMoney, rewardMultiplier);
    }
    if (rewardMoney > 0 || rewardScore > 0) {
      this.drawRewardBurst(rewardMoney, rewardScore);
    }
  }

  private drawCellPulse(cellId: number, parcaWard = false): void {
    const cell = this.state.board.find((candidate) => candidate.id === cellId);
    if (!cell) {
      return;
    }
    const { cellSize, gap, startX, startY } = this.boardMetrics();
    const x = startX + cell.col * (cellSize + gap);
    const y = startY + cell.row * (cellSize + gap);
    playStampSeal(this, this.effectsLayer, x + cellSize / 2, y + cellSize / 2, cellSize, { rewarded: this.state.recentRewards.length > 0, parcaWard });
    const pulse = this.add.container(x + cellSize / 2, y + cellSize / 2);
    const ring = this.add.graphics();
    ring.lineStyle(6, this.state.recentRewards.length > 0 ? PALETTE.gold : PALETTE.teal, 0.9);
    ring.strokeRoundedRect(-cellSize / 2 - 10, -cellSize / 2 - 10, cellSize + 20, cellSize + 20, 14);
    ring.lineStyle(2, 0xffffff, 0.25);
    ring.strokeRoundedRect(-cellSize / 2 - 5, -cellSize / 2 - 5, cellSize + 10, cellSize + 10, 11);
    pulse.add(ring);
    this.effectsLayer.add(pulse);
    this.tweens.add({
      targets: pulse,
      scale: { from: 0.94, to: 1.16 },
      alpha: { from: 1, to: 0 },
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => pulse.destroy(true)
    });
  }

  private drawRewardBurst(money: number, score: number): void {
    const label = [score > 0 ? `+${score} pts` : "", money > 0 ? `+$${money}` : ""].filter(Boolean).join("  ");
    if (!label) {
      return;
    }
    const burst = this.text(PLAY_AREA.centerX, PLAY_AREA.y + 82, label, 30, "#f2d06b", "center", 380);
    burst.setAlpha(0.95);
    this.effectsLayer.add(burst);
    this.tweens.add({
      targets: burst,
      y: burst.y - 50,
      scale: { from: 0.96, to: 1.05 },
      alpha: 0,
      duration: 840,
      ease: "Quart.easeOut",
      onComplete: () => burst.destroy()
    });
  }

  private drawRewardToast(): void {
    renderRewardToast(this, this.actionLayer, this.state.recentRewards);
  }

  private primeOpeningBall(): void {
    if (this.state.phase !== "table" || this.state.currentBall !== null) {
      return;
    }

    this.clearBallTimer();
    this.state = drawNextBall(this.state, Math.random, { free: true });
    this.ballSecondsRemaining = BALL_SECONDS;
    this.pendingBallDropValue = this.state.currentBall;
    this.audio.playBall();
    if (this.state.phase === "table") {
      this.startBallTimer();
    }
    if (this.state.phase === "lost") {
      this.playLoseCue();
    }
  }

  private startBallTimer(): void {
    this.clearBallTimer();
    if (this.state.phase !== "table" || this.state.currentBall === null) {
      return;
    }

    this.ballSecondsRemaining = Phaser.Math.Clamp(this.ballSecondsRemaining || BALL_SECONDS, 1, BALL_SECONDS);
    this.ballTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.state.phase !== "table" || this.state.currentBall === null) {
          this.clearBallTimer();
          return;
        }
        this.ballSecondsRemaining -= 1;
        if (this.ballSecondsRemaining <= 0) {
          this.drawBall();
          return;
        }
        this.updateBallTimerDisplay();
      }
    });
  }

  private updateBallTimerDisplay(): void {
    const isActive = this.state.phase === "table" && this.state.currentBall !== null;
    updateBallTimerRef(this.ballTimerUi, this.ballSecondsRemaining, BALL_SECONDS, isActive);
  }

  private updateKioskTimerDisplay(): void {
    updateKioskTimerRef(this.kioskTimerUi, this.state.kioskSeconds, ROUND_SECONDS);
  }

  private clearBallTimer(): void {
    if (this.ballTimer) {
      this.ballTimer.remove(false);
      this.ballTimer = undefined;
    }
  }

  private clearKioskTimer(): void {
    if (this.kioskTimer) {
      this.kioskTimer.remove(false);
      this.kioskTimer = undefined;
    }
  }

  private clearDuckRelease(): void {
    if (this.duckReleaseTimer) {
      this.duckReleaseTimer.remove(false);
      this.duckReleaseTimer = undefined;
    }
  }

  private button(x: number, y: number, width: number, height: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    return createButton(this, x, y, width, height, label, () => {
      this.startMusic();
      onClick();
    });
  }

  private startMusic(): void {
    this.music.start();
    this.syncMusic();
  }

  private toggleMusic(): void {
    this.startMusic();
    this.music.toggleMuted();
    this.render();
  }

  private adjustVolume(delta: number): void {
    this.volumeLevel = clampVolumeLevel(Number((this.volumeLevel + delta).toFixed(2)));
    this.applyVolumeSettings();
    const storage = this.localStorage();
    if (storage) {
      storage.setItem(TimbaScene.volumeStorageKey, String(this.volumeLevel));
    }
    this.render();
  }

  private applyVolumeSettings(): void {
    this.music.setMasterVolumeLevel(this.volumeLevel);
    this.audio.setMasterVolumeLevel(this.volumeLevel);
  }

  private volumeLabel(): string {
    return `Vol ${Math.round(this.volumeLevel * 100)}%`;
  }

  private loadLocalProgress(): void {
    const storage = this.localStorage();
    if (!storage) {
      this.applyVolumeSettings();
      return;
    }
    this.profile = loadProfile(storage);
    this.leaderboard = loadLeaderboard(storage);
    saveLeaderboard(storage, this.leaderboard);
    const storedVolume = Number(storage.getItem(TimbaScene.volumeStorageKey));
    if (Number.isFinite(storedVolume)) {
      this.volumeLevel = clampVolumeLevel(storedVolume);
    }
    this.applyVolumeSettings();
  }

  private resetLocalProgress(): void {
    const storage = this.localStorage();
    this.profile = createDefaultProfile();
    this.leaderboard = [];
    this.latestRunEntry = null;
    this.latestRunRank = null;
    this.recordedRunKey = null;
    this.achievementToasts = [];
    this.pendingProgressReset = false;

    if (storage) {
      saveProfile(storage, this.profile);
      saveLeaderboard(storage, this.leaderboard);
      storage.setItem(TimbaScene.volumeStorageKey, String(this.volumeLevel));
    }

    this.render();
  }

  private localStorage(): Storage | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private unlockFromCurrentState(): void {
    this.unlockLocalAchievements(achievementIdsFromRunState(this.state));
  }

  private unlockLocalAchievements(ids: AchievementId[]): void {
    if (ids.length === 0) {
      return;
    }
    const { profile, newlyUnlocked } = unlockAchievements(this.profile, ids);
    this.profile = profile;
    if (newlyUnlocked.length === 0) {
      return;
    }

    this.achievementToasts = newlyUnlocked.slice(-2);
    const storage = this.localStorage();
    if (storage) {
      saveProfile(storage, this.profile);
    }
    this.time.delayedCall(1850, () => {
      this.achievementToasts = [];
      if (this.scene.isActive()) {
        this.render();
      }
    });
  }

  private drawAchievementToast(): void {
    if (this.achievementToasts.length === 0) {
      return;
    }

    const latest = this.achievementToasts[this.achievementToasts.length - 1];
    const y = this.state.recentRewards.length > 0 ? 154 : 88;
    const g = this.add.graphics();
    g.fillStyle(0x171116, 0.92);
    g.fillRoundedRect(452, y, 376, 54, 8);
    g.lineStyle(2, PALETTE.gold, 0.72);
    g.strokeRoundedRect(452, y, 376, 54, 8);
    this.actionLayer.add(g);
    this.actionLayer.add(this.uiText(474, y + 10, "LOGRO", 10, "#bca06d", "left"));
    this.actionLayer.add(this.text(474, y + 27, latest.name, 18, "#f2d06b", "left", 198));
    this.actionLayer.add(this.uiText(674, y + 18, latest.description, 10, "#f0dfba", "left", 132));
  }

  private recordTerminalRunIfNeeded(): void {
    if (this.state.phase !== "runWon" && this.state.phase !== "lost") {
      return;
    }

    const key = [
      this.state.phase,
      this.state.tableIndex,
      this.state.score,
      this.state.money,
      this.state.round,
      this.state.calledBalls.length,
      this.state.lostReason
    ].join(":");
    if (this.recordedRunKey === key) {
      return;
    }

    const table = TABLE_CONFIGS[this.state.tableIndex];
    const summary = createRunSummary({
      score: this.state.score,
      money: this.state.money,
      tableIndex: this.state.tableIndex,
      tableTitle: table.title,
      won: this.state.phase === "runWon",
      reason: this.state.phase === "runWon" ? "Ganaste toda la noche." : this.state.lostReason || "La run termino.",
      rounds: this.state.round,
      calledBalls: this.state.calledBalls.length,
      multiplier: this.state.multiplier,
      ownedBonusIds: [...this.state.ownedBonusIds, ...this.state.activeContractIds]
    });
    const entry: LeaderboardEntry = {
      ...summary,
      leaderboardScore: scoreRunForLeaderboard(summary)
    };
    const boardWithEntry = insertLeaderboardEntry(this.leaderboard, entry, 10);
    this.latestRunEntry = entry;
    this.latestRunRank = rankEntry(boardWithEntry, entry);
    this.leaderboard = boardWithEntry;
    this.recordedRunKey = key;

    const storage = this.localStorage();
    if (storage) {
      saveLeaderboard(storage, this.leaderboard);
    }
  }

  private syncMusic(): void {
    this.music.setGameState(this.state.phase, this.state.multiplier);
    this.playParcaWarningIfNeeded();
  }

  private playStampCue(valid: boolean): void {
    this.audio.playStamp(valid);
    if (!valid) {
      this.duckMusic(0.12, 130);
    }
  }

  private playRewardCue(big = false): void {
    this.duckMusic(big ? 0.48 : 0.32, big ? 420 : 260);
    this.audio.playReward(big);
  }

  private playShopCue(kind: "open" | "buy" | "cancel"): void {
    if (kind === "buy") {
      this.duckMusic(0.2, 180);
    }
    this.audio.playShop(kind);
  }

  private playWinCue(): void {
    this.duckMusic(0.62, 760);
    this.audio.playWin();
  }

  private playLoseCue(): void {
    this.duckMusic(0.45, 900);
    this.audio.playParca("collapse");
    this.audio.playLose();
  }

  private playParcaWarningIfNeeded(): void {
    if (this.state.phase === "menu") {
      this.parcaCueStage = 0;
      return;
    }

    if (this.state.phase !== "table") {
      return;
    }

    const danger = Phaser.Math.Clamp((1.45 - this.state.multiplier) / 1.45, 0, 1);
    const stage = danger > 0.82 ? 3 : danger > 0.58 ? 2 : danger > 0.34 ? 1 : 0;
    if (stage <= this.parcaCueStage) {
      return;
    }

    this.parcaCueStage = stage;
    this.parcaAlertStage = stage;
    this.time.delayedCall(1300, () => {
      if (this.parcaAlertStage === stage) {
        this.parcaAlertStage = null;
      }
    });
    this.duckMusic(0.22 + stage * 0.05, 260);
    this.audio.playParca("warning");
  }

  private duckMusic(amount: number, durationMs: number): void {
    const now = this.time.now;
    this.duckRequests = this.duckRequests.filter((request) => request.until > now);
    this.duckRequests.push({ amount, until: now + durationMs });
    this.applyCurrentDuck();
    this.clearDuckRelease();
    this.scheduleDuckRelease();
  }

  private applyCurrentDuck(): void {
    const now = this.time.now;
    this.duckRequests = this.duckRequests.filter((request) => request.until > now);
    const amount = this.duckRequests.reduce((max, request) => Math.max(max, request.amount), 0);
    this.music.setDuck(amount);
  }

  private scheduleDuckRelease(): void {
    this.applyCurrentDuck();
    if (this.duckRequests.length === 0) {
      this.duckReleaseTimer = undefined;
      return;
    }

    const nextUntil = Math.min(...this.duckRequests.map((request) => request.until));
    const delay = Math.max(16, nextUntil - this.time.now);
    this.duckReleaseTimer = this.time.delayedCall(delay, () => {
      this.duckReleaseTimer = undefined;
      this.applyCurrentDuck();
      this.scheduleDuckRelease();
    });
  }

  private shutdownScene(): void {
    this.clearKioskTimer();
    this.clearBallTimer();
    this.clearParcaPulse();
    this.clearDuckRelease();
    this.music.destroy();
    this.audio.destroy();
  }

  private panel(x: number, y: number, width: number, height: number, color: number, alpha: number): Phaser.GameObjects.Graphics {
    return createPanel(this, x, y, width, height, color, alpha);
  }

  private text(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
    align: "left" | "center",
    wordWrapWidth?: number
  ): Phaser.GameObjects.Text {
    return createText(this, x, y, content, size, color, align, wordWrapWidth);
  }

  private uiText(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
    align: "left" | "center",
    wordWrapWidth?: number
  ): Phaser.GameObjects.Text {
    return createUiText(this, x, y, content, size, color, align, wordWrapWidth);
  }
}
