import Phaser from "phaser";
import type { PatternReward } from "../game/types.js";
import { createPanel, createText } from "./primitives.js";
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, type ParcaRenderInput } from "./theme.js";

type ParcaMotion = {
  pulseSlow: number;
  pulseFast: number;
  threatSway: number;
  threatJitter: number;
};

const PLAY_BOARD_GUARD_RIGHT = 748;
const PLAY_BOARD_GUARD_TOP = 132;
const PLAY_BOARD_GUARD_BOTTOM = 688;
const RIGHT_PERIPHERAL_RAIL = 930;

export function drawParcaPressure(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, input: ParcaRenderInput): void {
  const danger = Phaser.Math.Clamp(input.danger, 0, 1);
  if (danger <= 0.12) {
    return;
  }
  const tSec = scene.time.now / 1000;
  const pulseSlow = Math.sin(tSec * 1.7);
  const pulseFast = Math.sin(tSec * 4.2);
  const threatSway = Math.sin(tSec * 1.1);
  const threatJitter = Math.sin(tSec * 8.4);
  const motion: ParcaMotion = {
    pulseSlow,
    pulseFast,
    threatSway,
    threatJitter
  };

  const lowStage = Phaser.Math.Clamp((danger - 0.12) / 0.28, 0, 1);
  const midStage = Phaser.Math.Clamp((danger - 0.4) / 0.3, 0, 1);
  const highStage = Phaser.Math.Clamp((danger - 0.7) / 0.3, 0, 1);

  const g = scene.add.graphics();
  drawParcaVignette(g, danger, lowStage, midStage, highStage, motion);
  drawParcaSmoke(g, danger, lowStage, midStage, highStage, motion);
  if (danger > 0.22) {
    drawParcaPeripheralCues(g, danger, lowStage, midStage, highStage, motion);
  }
  if (danger > 0.16) {
    drawParcaApproach(g, danger, lowStage, midStage, highStage, motion);
  }

  if (danger > 0.34) {
    drawParcaHood(g, danger, lowStage, midStage, highStage, motion);
  }
  if (danger > 0.58) {
    drawParcaScythe(g, danger, lowStage, midStage, highStage, motion);
  }
  if (danger > 0.2) {
    drawParcaHand(g, danger, lowStage, midStage, highStage, motion);
  }
  if (danger > 0.52) {
    drawParcaTableOmen(g, danger, midStage, highStage, motion);
  }

  layer.add(g);

  if (danger > 0.74) {
    const label = createText(scene, GAME_WIDTH / 2, 86, "La Parca ya esta sentada a tu mesa.", 20, "#ffcbcb", "center");
    label.setShadow(0, 2, "#060509", 5, true, true);
    label.setAlpha(0.86 + highStage * 0.14 + pulseFast * 0.04);
    layer.add(label);
  }
}

export function drawRewardToast(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, rewards: PatternReward[]): void {
  if (rewards.length === 0) {
    return;
  }
  const tSec = scene.time.now / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(tSec * 8.2);
  const shimmer = 0.5 + 0.5 * Math.sin(tSec * 5.1);

  const text = rewards
    .map((reward) => {
      const score = reward.score > 0 ? `+${reward.score}` : "";
      const money = reward.money > 0 ? ` +$${reward.money}` : "";
      const mult = reward.multiplier > 0 ? ` x+${reward.multiplier.toFixed(1)}` : "";
      return `${reward.label}: ${score}${money}${mult}`.trim();
    })
    .join(" / ");
  layer.add(createPanel(scene, 286, 92, 710, 56, 0x241819, 0.9 + pulse * 0.04));
  layer.add(createPanel(scene, 288, 94, 706, 52, 0x4a2130, 0.08 + shimmer * 0.08));
  layer.add(createPanel(scene, 294, 98, 694, 44, 0x0d070a, 0.08 + pulse * 0.04));
  const rewardText = createText(scene, 640, 108, text, 20, "#f2d06b", "center", 650);
  rewardText.setShadow(0, 2, "#1f0e17", 3, true, true);
  rewardText.setScale(1 + pulse * 0.018);
  rewardText.setAlpha(0.9 + shimmer * 0.1);
  layer.add(rewardText);
}

export function drawParcaEndSilhouette(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x050306, 0.95);
  g.fillEllipse(640, 356, 1060, 742);
  g.fillStyle(0x18060b, 0.46);
  g.fillEllipse(640, 354, 814, 520);
  g.fillStyle(PALETTE.redDark, 0.2);
  g.fillEllipse(640, 278, 470, 238);
  drawEmptyChair(g, 640, 646, 1.18, 0.5, 0.24);
  g.lineStyle(3, PALETTE.redDark, 0.38);
  g.beginPath();
  g.moveTo(532, 632);
  g.lineTo(602, 604);
  g.lineTo(688, 614);
  g.lineTo(752, 586);
  g.strokePath();

  g.fillStyle(PALETTE.shadow, 0.94);
  g.fillTriangle(640, 56, 368, 654, 912, 654);
  g.fillTriangle(642, 96, 438, 638, 820, 638);
  g.fillEllipse(640, 184, 246, 286);
  g.fillStyle(0x1a0f16, 0.48);
  g.fillTriangle(640, 104, 470, 620, 812, 620);
  g.fillStyle(0x0d080d, 0.98);
  g.fillEllipse(640, 202, 156, 190);
  g.fillTriangle(640, 122, 568, 296, 712, 296);
  g.fillStyle(0x020103, 0.98);
  g.fillEllipse(640, 238, 132, 88);

  g.fillStyle(PALETTE.redDark, 0.78);
  g.fillEllipse(604, 198, 46, 14);
  g.fillEllipse(676, 198, 46, 14);
  g.fillStyle(0xffd1c2, 0.98);
  g.fillEllipse(604, 198, 16, 5);
  g.fillEllipse(676, 198, 16, 5);
  g.fillStyle(0x030203, 0.8);
  g.fillTriangle(604, 190, 576, 180, 626, 204);
  g.fillTriangle(676, 190, 704, 180, 654, 204);
  g.fillStyle(PALETTE.redDark, 0.38);
  g.fillEllipse(640, 324, 154, 28);
  g.lineStyle(2, 0x3d1c27, 0.65);
  for (let i = 0; i < 5; i += 1) {
    const x = 594 + i * 23;
    g.beginPath();
    g.moveTo(x, 294);
    g.lineTo(x - 18 + i * 4, 364);
    g.strokePath();
  }

  g.lineStyle(15, PALETTE.shadow, 0.74);
  g.beginPath();
  g.moveTo(824, 88);
  g.lineTo(766, 620);
  g.strokePath();
  g.lineStyle(9, 0x2b2328, 0.94);
  g.beginPath();
  g.moveTo(812, 96);
  g.lineTo(758, 612);
  g.strokePath();
  g.lineStyle(3, PALETTE.bone, 0.34);
  g.beginPath();
  g.moveTo(820, 104);
  g.lineTo(764, 614);
  g.strokePath();
  g.fillStyle(PALETTE.bone, 0.72);
  g.fillTriangle(764, 112, 930, 144, 788, 226);
  g.fillTriangle(788, 226, 930, 144, 868, 204);
  g.fillStyle(0x1a1217, 0.78);
  g.fillTriangle(794, 138, 892, 152, 810, 194);

  g.lineStyle(12, PALETTE.bone, 0.58);
  g.beginPath();
  g.moveTo(454, 584);
  g.lineTo(536, 540);
  g.lineTo(614, 548);
  g.strokePath();
  g.lineStyle(7, PALETTE.bone, 0.74);
  for (let i = 0; i < 4; i += 1) {
    g.beginPath();
    g.moveTo(528 + i * 18, 538 + i * 2);
    g.lineTo(500 + i * 10, 494 - i * 8);
    g.strokePath();
  }
  g.fillStyle(PALETTE.redDark, 0.54);
  g.fillEllipse(536, 566, 154, 28);
}

export function drawParcaVictoryBreak(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xe4bb58, 0.1);
  g.fillEllipse(640, 350, 760, 458);
  g.lineStyle(3, PALETTE.gold, 0.34);
  for (let i = 0; i < 4; i += 1) {
    g.strokeCircle(640, 348, 118 + i * 62);
  }

  g.fillStyle(PALETTE.shadow, 0.22);
  g.fillTriangle(938, 92, 780, 650, 1192, 650);
  g.fillEllipse(958, 198, 168, 204);
  g.fillStyle(0x0d080d, 0.42);
  g.fillEllipse(958, 208, 104, 128);
  g.fillStyle(PALETTE.redDark, 0.18);
  g.fillEllipse(934, 198, 28, 10);
  g.fillEllipse(982, 198, 28, 10);
  drawEmptyChair(g, 924, 636, 0.9, 0.22, 0.1);

  g.lineStyle(8, PALETTE.gold, 0.72);
  g.beginPath();
  g.moveTo(442, 516);
  g.lineTo(866, 174);
  g.strokePath();
  g.lineStyle(3, 0xffffff, 0.46);
  g.beginPath();
  g.moveTo(456, 504);
  g.lineTo(850, 186);
  g.strokePath();

  g.lineStyle(7, 0x2b2328, 0.72);
  g.beginPath();
  g.moveTo(790, 146);
  g.lineTo(766, 278);
  g.strokePath();
  g.beginPath();
  g.moveTo(738, 340);
  g.lineTo(702, 606);
  g.strokePath();
  g.fillStyle(PALETTE.bone, 0.5);
  g.fillTriangle(760, 126, 860, 146, 782, 194);
  g.fillTriangle(810, 210, 884, 246, 792, 254);

  g.lineStyle(3, PALETTE.gold, 0.56);
  const cracks: Array<Array<[number, number]>> = [
    [
      [526, 238],
      [552, 280],
      [536, 326],
      [572, 376]
    ],
    [
      [740, 246],
      [704, 294],
      [716, 346],
      [670, 404]
    ],
    [
      [618, 188],
      [644, 238],
      [628, 292],
      [656, 350]
    ]
  ];
  cracks.forEach((crack) => {
    g.beginPath();
    g.moveTo(crack[0][0], crack[0][1]);
    crack.slice(1).forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
  });
  g.lineStyle(3, PALETTE.gold, 0.36);
  g.beginPath();
  g.moveTo(872, 574);
  g.lineTo(918, 606);
  g.lineTo(982, 584);
  g.strokePath();
}

function drawParcaVignette(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const pulse = motion.pulseSlow;
  const alpha = Phaser.Math.Clamp((danger - 0.12) / 0.88, 0, 1);
  g.fillStyle(0x050306, 0.05 + alpha * (0.11 + (pulse + 1) * 0.015));
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const edgeAlpha = alpha * (0.22 + lowStage * 0.24 + midStage * 0.22 + highStage * 0.12 + pulse * 0.025);
  const topBottomDepth = Math.min(64 + lowStage * 20 + midStage * 24 + highStage * 12 + pulse * 3, PLAY_BOARD_GUARD_TOP - 10);
  const sideDepth = 72 + lowStage * 18 + midStage * 22 + highStage * 30 + sway * 3;

  g.fillStyle(PALETTE.shadow, edgeAlpha);
  g.fillRect(0, 0, GAME_WIDTH, topBottomDepth);
  g.fillRect(0, GAME_HEIGHT - topBottomDepth, GAME_WIDTH, topBottomDepth);
  g.fillRect(0, 0, sideDepth, GAME_HEIGHT);
  g.fillRect(GAME_WIDTH - sideDepth, 0, sideDepth, GAME_HEIGHT);

  g.fillStyle(PALETTE.shadow, alpha * (0.22 + midStage * 0.24 + highStage * 0.2 + pulse * 0.03));
  g.fillTriangle(GAME_WIDTH, 0, GAME_WIDTH - 264 + sway * 6, 398, GAME_WIDTH, GAME_HEIGHT);
  g.fillTriangle(0, GAME_HEIGHT, 186 - sway * 5, 450, 0, 252);
  g.fillStyle(0x140a11, alpha * (0.1 + highStage * 0.14));
  g.fillTriangle(GAME_WIDTH, 52, GAME_WIDTH - 220 + sway * 8, 324, GAME_WIDTH, 530);
  g.fillTriangle(0, 120, 154 - sway * 7, 352, 0, 584);

  // Keep the board readable: pressure frames the play area, but never fills the center.
  const focusAlpha = alpha * (0.04 + midStage * 0.08 + highStage * 0.08 + pulse * 0.012);
  g.lineStyle(3, 0x1d121a, focusAlpha);
  g.strokeEllipse(646 + sway * 1.2, 384, 650 - highStage * 90, 424 - highStage * 42);
  g.lineStyle(1, 0x55303c, focusAlpha * 0.7);
  g.strokeEllipse(646 + sway * 1.2, 384, 560 - highStage * 78, 352 - highStage * 34);
}

function drawParcaSmoke(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const jitter = motion.threatJitter;
  const pulse = motion.pulseFast;
  const alpha = Phaser.Math.Clamp((danger - 0.12) / 0.76, 0, 1);
  g.fillStyle(0x0b070c, (0.14 + lowStage * 0.14 + midStage * 0.1 + pulse * 0.015) * alpha);
  g.fillEllipse(1088 + sway * 4, 548 + pulse * 2, 350 + midStage * 40, 86 + lowStage * 10);
  g.fillEllipse(1014 + sway * 3, 610 + pulse * 1.8, 442 + midStage * 52, 76 + lowStage * 14);
  g.fillEllipse(1140 + sway * 4.5, 242 + jitter * 1.3, 262 + highStage * 38, 110 + midStage * 24);
  g.fillEllipse(1060 + sway * 4.2, 176 + jitter * 1.1, 224 + highStage * 54, 84 + midStage * 20);
  g.fillEllipse(1186 + sway * 3.6, 334 + jitter * 1.6, 184 + highStage * 40, 62 + midStage * 24);
  g.fillEllipse(980 + sway * 2.8, 98 + jitter, 176 + highStage * 34, 54 + midStage * 12);

  g.fillStyle(0x201522, (0.08 + lowStage * 0.06 + midStage * 0.08) * alpha);
  for (let i = 0; i < 6; i += 1) {
    g.fillEllipse(
      944 + i * 62 + sway * (1 + i * 0.2),
      132 + i * 70 + pulse * (1.4 + i * 0.2),
      102 - i * 7 + midStage * 8,
      42 + i * 10 + lowStage * 8
    );
  }

  g.fillStyle(0x2b1820, highStage * 0.18 * alpha);
  g.fillEllipse(942 + sway * 3.4, 666 + pulse * 1.2, 220, 42);
  g.fillStyle(0x3b1a27, highStage * 0.14 * alpha);
  g.fillEllipse(1048 + sway * 3, 646 + pulse, 170, 30);
}

function drawParcaPeripheralCues(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const jitter = motion.threatJitter;
  const pulse = motion.pulseFast;
  const t = Phaser.Math.Clamp((danger - 0.22) / 0.64, 0, 1);
  const alpha = (0.16 + lowStage * 0.12 + midStage * 0.14 + highStage * 0.18) * t;
  const chairX = RIGHT_PERIPHERAL_RAIL + 42 + sway * 3 + jitter * highStage;
  const chairY = PLAY_BOARD_GUARD_BOTTOM - 28 + pulse * 1.4;

  drawEmptyChair(g, chairX, chairY, 0.72 + midStage * 0.06, alpha, 0.14 + highStage * 0.18);

  g.lineStyle(2, PALETTE.redDark, alpha * (0.42 + highStage * 0.24));
  for (let i = 0; i < 5; i += 1) {
    const y = 166 + i * 96 + sway * (1 + i * 0.16);
    g.beginPath();
    g.moveTo(18, y);
    g.lineTo(72 + highStage * 18, y + 10 + pulse * 0.6);
    g.strokePath();
  }

  g.lineStyle(2, 0x4a1d2a, alpha * (0.46 + highStage * 0.22));
  g.beginPath();
  g.moveTo(PLAY_BOARD_GUARD_RIGHT + 156 + sway * 2, PLAY_BOARD_GUARD_TOP + 26);
  g.lineTo(PLAY_BOARD_GUARD_RIGHT + 188 + sway * 1.4, 286 + pulse);
  g.lineTo(PLAY_BOARD_GUARD_RIGHT + 162 + sway * 1.8, 456);
  g.lineTo(PLAY_BOARD_GUARD_RIGHT + 198 + sway * 1.2, PLAY_BOARD_GUARD_BOTTOM - 78);
  g.strokePath();

  g.fillStyle(PALETTE.redDark, alpha * (0.1 + highStage * 0.18));
  g.fillEllipse(PLAY_BOARD_GUARD_RIGHT + 182 + sway * 2.5, 212 + pulse, 52 + highStage * 18, 12);
  g.fillEllipse(PLAY_BOARD_GUARD_RIGHT + 218 + sway * 2.2, 214 + pulse * 0.8, 36 + highStage * 12, 8);
  g.fillStyle(0x050306, alpha * (0.22 + highStage * 0.24));
  g.fillRect(PLAY_BOARD_GUARD_RIGHT + 142, PLAY_BOARD_GUARD_TOP - 8, 12 + highStage * 8, PLAY_BOARD_GUARD_BOTTOM - PLAY_BOARD_GUARD_TOP + 14);
}

function drawParcaApproach(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const pulse = motion.pulseSlow;
  const jitter = motion.threatJitter;
  const t = Phaser.Math.Clamp((danger - 0.16) / 0.64, 0, 1);
  const stageEarly = Phaser.Math.Clamp((danger - 0.16) / 0.22, 0, 1);
  const stageMiddle = Phaser.Math.Clamp((danger - 0.38) / 0.24, 0, 1);
  const stageLate = Phaser.Math.Clamp((danger - 0.62) / 0.26, 0, 1);
  const drift = (1 - t) * 122 + (1 - stageMiddle) * 14;
  const x = 1178 + drift + sway * 4.6 + jitter * (0.4 + highStage * 0.8);
  const alphaBase = (0.08 + t * 0.34 + lowStage * 0.08 + midStage * 0.14) * (0.95 + pulse * 0.05);

  // Early stage: faint peripheral silhouette that hints approach without blocking center board.
  g.fillStyle(PALETTE.shadow, alphaBase * (0.26 + stageEarly * 0.12));
  g.fillTriangle(x - 78, 104, x - 220, 700, x + 104, 700);
  g.fillEllipse(x - 10, 194, 134 + stageEarly * 16, 174 + stageEarly * 22);
  g.fillStyle(0x130d14, alphaBase * 0.16 * stageEarly);
  g.fillTriangle(x - 4, 132, x - 132, 674, x + 118, 678);

  // Mid stage: tighter cloak mass starts to read as "character" instead of just a shadow.
  if (stageMiddle > 0) {
    g.fillStyle(PALETTE.shadow, alphaBase * (0.24 + stageMiddle * 0.26));
    g.fillTriangle(x + 10, 116, x - 40, 704, x + 188, 704);
    g.fillStyle(0x1b1018, alphaBase * (0.16 + stageMiddle * 0.2));
    g.fillEllipse(x - 2, 210, 88 + stageMiddle * 22, 108 + stageMiddle * 18);
  }

  // Late stage: subtle inner void and edge accents increase menace near high danger.
  if (stageLate > 0) {
    g.fillStyle(0x040304, alphaBase * (0.2 + stageLate * 0.34));
    g.fillEllipse(x + 2, 214, 68 + stageLate * 22, 82 + stageLate * 20);
    g.lineStyle(2, 0x4a1d2a, (0.08 + highStage * 0.18 + stageLate * 0.12) * t);
    g.beginPath();
    g.moveTo(x - 112, 316);
    g.lineTo(x - 166, 530);
    g.lineTo(x - 134, 676);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + 68, 324);
    g.lineTo(x + 108, 528);
    g.lineTo(x + 88, 694);
    g.strokePath();
  }
}

function drawParcaHand(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const jitter = motion.threatJitter;
  const t = Phaser.Math.Clamp((danger - 0.2) / 0.42, 0, 1);
  const alpha = 0.22 + t * 0.58 + midStage * 0.18;
  const rawOffset = (1 - t) * 92 + (1 - lowStage) * 8 + sway * 2.8 + jitter * (0.8 + highStage * 1.1);
  const offset = Math.max(66 + highStage * 32, rawOffset);

  g.lineStyle(24, PALETTE.shadow, alpha * 0.34);
  g.beginPath();
  g.moveTo(958 + offset, 616);
  g.lineTo(874 + offset, 596);
  g.lineTo(794 + offset, 596);
  g.strokePath();

  g.lineStyle(18, PALETTE.bone, alpha * (0.72 + highStage * 0.2));
  g.beginPath();
  g.moveTo(946 + offset, 610);
  g.lineTo(872 + offset, 590);
  g.lineTo(800 + offset, 594);
  g.strokePath();

  g.fillStyle(PALETTE.bone, alpha);
  g.fillEllipse(786 + offset, 590, 68, 38);
  g.fillStyle(0x6a6258, alpha * (0.32 + highStage * 0.1));
  g.fillEllipse(784 + offset, 590, 34, 16);

  const fingers: Array<Array<[number, number]>> = [
    [
      [762, 578],
      [744, 548],
      [724, 522],
      [701, 510]
    ],
    [
      [781, 570],
      [776, 532],
      [765, 496],
      [744, 478]
    ],
    [
      [804, 574],
      [820, 536],
      [832, 502],
      [826, 474]
    ],
    [
      [822, 590],
      [858, 574],
      [887, 552],
      [910, 528]
    ]
  ];

  fingers.forEach((finger, fingerIndex) => {
    const width = fingerIndex === 3 ? 7 : 8;
    const shifted = finger.map(([x, y]) => [x + offset, y] as [number, number]);
    g.lineStyle(width + highStage * 1.6, PALETTE.bone, alpha);
    g.beginPath();
    g.moveTo(shifted[0][0], shifted[0][1]);
    shifted.slice(1).forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    g.fillStyle(PALETTE.bone, alpha);
    shifted.forEach(([x, y]) => g.fillCircle(x, y, width * 0.72));
    const tip = shifted[shifted.length - 1];
    g.fillStyle(PALETTE.redDark, alpha * 0.78);
    g.fillTriangle(tip[0] - 6, tip[1] + 4, tip[0] + 8, tip[1] - 3, tip[0] - 2, tip[1] - 19);
    g.fillStyle(0xffffff, alpha * 0.16);
    g.fillCircle(shifted[1][0], shifted[1][1], width * 0.36);
    g.fillCircle(shifted[2][0], shifted[2][1], width * 0.32);
  });

  g.fillStyle(0x070406, 0.2 + t * 0.28 + midStage * 0.18);
  g.fillEllipse(814 + offset, 618, 190 + highStage * 24, 24 + highStage * 6);
  g.fillStyle(0x1b0e14, (0.08 + t * 0.12 + highStage * 0.16) * alpha);
  g.fillEllipse(808 + offset, 604, 102 + highStage * 16, 18 + highStage * 4);
}

function drawParcaHood(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const jitter = motion.threatJitter;
  const t = Phaser.Math.Clamp((danger - 0.34) / 0.42, 0, 1);
  const alpha = 0.28 + t * 0.54 + midStage * 0.2;
  const x = 1090 + (1 - t) * 70 + sway * 4.5 + jitter * 0.8;
  const y = 205 + sway * 1.2;

  g.fillStyle(PALETTE.shadow, alpha * 0.4);
  g.fillEllipse(x - 8, y + 256, 302, 82);

  g.fillStyle(PALETTE.shadow, alpha);
  g.fillTriangle(x - 104, y - 86, x - 236, 550, x + 142, 544);
  g.fillTriangle(x + 14, y - 108, x - 58, 566, x + 236, 560);
  g.fillEllipse(x, y, 182, 218);
  g.fillStyle(0x20121b, alpha * 0.36);
  g.fillTriangle(x + 2, y - 96, x - 120, 530, x + 194, 540);
  g.fillStyle(0x130d14, (0.58 + t * 0.36) * (0.9 + highStage * 0.1));
  g.fillEllipse(x, y + 8, 132, 164);
  g.fillStyle(0x030203, 0.95 * t);
  g.fillTriangle(x, y - 58, x - 62, y + 62, x + 62, y + 62);
  g.fillEllipse(x, y + 48, 104, 72);

  g.fillStyle(PALETTE.redDark, 0.36 * t + highStage * 0.28);
  g.fillEllipse(x - 27, y - 10, 38, 12);
  g.fillEllipse(x + 27, y - 10, 38, 12);
  g.fillStyle(0xffc2b5, 0.72 * t + highStage * 0.22);
  g.fillEllipse(x - 27, y - 10, 12, 4);
  g.fillEllipse(x + 27, y - 10, 12, 4);
  g.fillStyle(0x020102, 0.6 * t);
  g.fillTriangle(x - 50, y - 24, x - 12, y - 6, x - 50, y + 2);
  g.fillTriangle(x + 50, y - 24, x + 12, y - 6, x + 50, y + 2);
  g.fillStyle(0x87243a, 0.24 * t + highStage * 0.22);
  g.fillEllipse(x, y + 32, 48, 12);
  g.fillStyle(0x030203, 0.54 * t);
  g.fillTriangle(x, y + 4, x - 12, y + 34, x + 12, y + 34);

  g.lineStyle(3, PALETTE.bone, 0.12 * t + lowStage * 0.06);
  for (let i = 0; i < 5; i += 1) {
    const ribX = x - 44 + i * 22;
    g.beginPath();
    g.moveTo(ribX, y + 110);
    g.lineTo(ribX - 14 + i * 3, y + 164);
    g.strokePath();
  }

  g.lineStyle(2, 0x5b4a59, 0.24 + midStage * 0.24);
  g.beginPath();
  g.moveTo(x - 120, y + 162);
  g.lineTo(x - 14, y + 122);
  g.lineTo(x + 82, y + 150);
  g.strokePath();
}

function drawParcaScythe(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  _lowStage: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const sway = motion.threatSway;
  const jitter = motion.threatJitter;
  const t = Phaser.Math.Clamp((danger - 0.58) / 0.34, 0, 1);
  const x = 1126 + (1 - t) * 62 + sway * 4 + jitter * (0.6 + highStage * 0.8);
  const yLift = (1 - t) * 18 + sway * 1.2;

  g.lineStyle(11, PALETTE.shadow, 0.4 * t);
  g.beginPath();
  g.moveTo(x + 70, 86 - yLift);
  g.lineTo(x + 40, 246 - yLift * 0.6);
  g.lineTo(x - 26, 654);
  g.strokePath();

  g.lineStyle(7, 0x2b2328, (0.6 + midStage * 0.22) * t);
  g.beginPath();
  g.moveTo(x + 72, 92 - yLift);
  g.lineTo(x + 46, 246 - yLift * 0.6);
  g.lineTo(x - 20, 650);
  g.strokePath();

  g.lineStyle(2, PALETTE.bone, (0.2 + highStage * 0.2) * t);
  g.beginPath();
  g.moveTo(x + 76, 92 - yLift);
  g.lineTo(x + 50, 246 - yLift * 0.6);
  g.lineTo(x - 16, 650);
  g.strokePath();

  g.fillStyle(PALETTE.bone, (0.44 + highStage * 0.22) * t);
  g.fillTriangle(x + 52, 102 - yLift, x + 184, 128 - yLift, x + 70, 182 - yLift * 0.8);
  g.fillTriangle(x + 70, 182 - yLift * 0.8, x + 184, 128 - yLift, x + 144, 170 - yLift * 0.8);
  g.fillStyle(0x1a1217, 0.62 * t + highStage * 0.2);
  g.fillTriangle(x + 76, 132 - yLift * 0.95, x + 158, 139 - yLift * 0.95, x + 90, 162 - yLift * 0.9);

  g.lineStyle(3, PALETTE.bone, (0.4 + highStage * 0.2) * t);
  g.beginPath();
  g.moveTo(x + 52, 102 - yLift);
  g.lineTo(x + 184, 128 - yLift);
  g.lineTo(x + 144, 170 - yLift * 0.8);
  g.strokePath();

  g.fillStyle(PALETTE.redDark, highStage * 0.14 * t);
  g.fillTriangle(x + 140, 130 - yLift, x + 188, 128 - yLift, x + 150, 168 - yLift * 0.8);
  g.lineStyle(2, 0x79303f, (0.12 + highStage * 0.24) * t);
  g.beginPath();
  g.moveTo(x + 152, 132 - yLift);
  g.lineTo(x + 186, 126 - yLift);
  g.strokePath();
}

function drawParcaTableOmen(
  g: Phaser.GameObjects.Graphics,
  danger: number,
  midStage: number,
  highStage: number,
  motion: ParcaMotion
): void {
  const pulse = motion.pulseFast;
  const sway = motion.threatSway;
  const t = Phaser.Math.Clamp((danger - 0.52) / 0.34, 0, 1);
  const alpha = (0.18 + midStage * 0.14 + highStage * 0.24) * t;
  const x = PLAY_BOARD_GUARD_RIGHT + 146 + sway * 2;
  const y = 626 + pulse * 1.2;

  g.lineStyle(4, PALETTE.redDark, alpha);
  g.beginPath();
  g.moveTo(x, 196);
  g.lineTo(x + 34, 288);
  g.lineTo(x + 8, 418);
  g.lineTo(x + 38, 556);
  g.strokePath();

  g.fillStyle(0x17060b, alpha * 0.9);
  g.fillEllipse(x + 56, y, 156, 28);
  g.lineStyle(3, PALETTE.red, alpha * 0.82);
  g.strokeEllipse(x + 48, y - 2, 96, 24);
  g.lineStyle(2, PALETTE.bone, alpha * 0.36);
  g.beginPath();
  g.moveTo(x + 12, y - 4);
  g.lineTo(x + 82, y + 8);
  g.strokePath();
  g.beginPath();
  g.moveTo(x + 36, y - 16);
  g.lineTo(x + 64, y + 14);
  g.strokePath();
}

function drawEmptyChair(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, alpha: number, accent: number): void {
  const s = scale;
  const a = Phaser.Math.Clamp(alpha, 0, 1);
  const accentAlpha = a * Phaser.Math.Clamp(accent, 0, 1);

  g.fillStyle(PALETTE.shadow, a * 0.38);
  g.fillEllipse(x + 10 * s, y + 36 * s, 160 * s, 34 * s);

  g.fillStyle(PALETTE.shadow, a * 0.78);
  g.fillRoundedRect(x - 42 * s, y - 132 * s, 84 * s, 116 * s, 10 * s);
  g.fillStyle(0x161018, a * 0.62);
  g.fillRoundedRect(x - 31 * s, y - 120 * s, 62 * s, 92 * s, 7 * s);

  g.fillStyle(PALETTE.shadow, a * 0.7);
  g.fillRoundedRect(x - 70 * s, y - 112 * s, 14 * s, 110 * s, 5 * s);
  g.fillRoundedRect(x + 56 * s, y - 112 * s, 14 * s, 110 * s, 5 * s);
  for (let i = 0; i < 3; i += 1) {
    const slatX = x - 22 * s + i * 22 * s;
    g.fillRoundedRect(slatX, y - 112 * s, 9 * s, 88 * s, 4 * s);
  }

  g.fillStyle(PALETTE.shadow, a * 0.86);
  g.fillRoundedRect(x - 60 * s, y - 20 * s, 120 * s, 32 * s, 8 * s);
  g.fillStyle(0x1c1218, a * 0.58);
  g.fillRoundedRect(x - 50 * s, y - 14 * s, 100 * s, 18 * s, 5 * s);

  g.lineStyle(5 * s, PALETTE.shadow, a * 0.72);
  g.beginPath();
  g.moveTo(x - 45 * s, y + 8 * s);
  g.lineTo(x - 66 * s, y + 58 * s);
  g.strokePath();
  g.beginPath();
  g.moveTo(x + 42 * s, y + 8 * s);
  g.lineTo(x + 62 * s, y + 58 * s);
  g.strokePath();

  g.lineStyle(2 * s, PALETTE.redDark, accentAlpha);
  g.strokeRoundedRect(x - 62 * s, y - 22 * s, 124 * s, 36 * s, 8 * s);
  g.beginPath();
  g.moveTo(x - 26 * s, y - 64 * s);
  g.lineTo(x + 24 * s, y - 88 * s);
  g.strokePath();
}
