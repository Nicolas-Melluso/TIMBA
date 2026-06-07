import Phaser from "phaser";
import type { PatternReward } from "../../game/types.js";
import { createText, createUiText } from "../primitives.js";
import { HUD, PALETTE } from "../theme.js";

export type BoardAnimationMetrics = {
  size: number;
  cellSize: number;
  gap: number;
  boardWidth: number;
  boardHeight: number;
  startX: number;
  startY: number;
};

const STAMP_IN_MS = 105;
const STAMP_HOLD_MS = 95;
const STAMP_FADE_MS = 125;

export function drawParcaMarkAura(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  centerX: number,
  centerY: number,
  cellSize: number
): void {
  const aura = scene.add.container(centerX, centerY);
  const outer = scene.add.graphics();
  outer.lineStyle(4, PALETTE.red, 0.38);
  outer.strokeRoundedRect(-cellSize / 2 - 14, -cellSize / 2 - 14, cellSize + 28, cellSize + 28, 16);
  outer.lineStyle(2, 0xffd3c9, 0.22);
  outer.strokeRoundedRect(-cellSize / 2 - 6, -cellSize / 2 - 6, cellSize + 12, cellSize + 12, 12);
  aura.add(outer);

  const sigil = scene.add.graphics();
  sigil.lineStyle(Math.max(3, cellSize * 0.04), PALETTE.redDark, 0.48);
  sigil.beginPath();
  sigil.moveTo(-cellSize * 0.24, cellSize * 0.18);
  sigil.lineTo(0, -cellSize * 0.22);
  sigil.lineTo(cellSize * 0.24, cellSize * 0.18);
  sigil.strokePath();
  aura.add(sigil);

  aura.setAlpha(0);
  aura.setScale(0.94);
  layer.add(aura);
  scene.tweens.add({
    targets: aura,
    scale: 1.012,
    alpha: 0.78,
    duration: 160,
    ease: "Quad.easeOut"
  });
  scene.tweens.add({
    targets: aura,
    scale: 1.045,
    alpha: 0,
    delay: 170,
    duration: 230,
    ease: "Sine.easeOut",
    onComplete: () => aura.destroy(true)
  });
}

export function playStampSeal(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  centerX: number,
  centerY: number,
  cellSize: number,
  options: { rewarded: boolean; parcaWard?: boolean }
): void {
  const color = options.parcaWard ? PALETTE.redDark : options.rewarded ? PALETTE.gold : PALETTE.red;
  const accent = options.parcaWard ? PALETTE.bone : options.rewarded ? PALETTE.teal : PALETTE.redDark;
  const baseRotation = options.parcaWard ? -0.14 : -0.08;
  const stamp = scene.add.container(centerX, centerY);
  stamp.setRotation(baseRotation - 0.05);

  const shadow = scene.add.ellipse(0, cellSize * 0.08, cellSize * 0.76, cellSize * 0.42, PALETTE.shadow, options.rewarded ? 0.08 : 0.12);
  stamp.add(shadow);

  const ring = scene.add.graphics();
  ring.lineStyle(cellSize >= 120 ? 7 : 5, color, 0.88);
  ring.strokeCircle(0, cellSize * 0.06, cellSize * 0.29);
  ring.lineStyle(cellSize >= 120 ? 3 : 2, accent, 0.82);
  ring.beginPath();
  ring.moveTo(-cellSize * 0.23, cellSize * 0.24);
  ring.lineTo(cellSize * 0.24, -cellSize * 0.14);
  ring.strokePath();
  stamp.add(ring);

  const glow = scene.add.graphics();
  glow.lineStyle(2, accent, options.rewarded ? 0.32 : 0.24);
  glow.strokeRoundedRect(-cellSize / 2 - 8, -cellSize / 2 - 8, cellSize + 16, cellSize + 16, 14);
  stamp.add(glow);

  stamp.setScale(1.32);
  stamp.setAlpha(0);
  layer.add(stamp);
  scene.tweens.add({
    targets: stamp,
    scale: 0.98,
    alpha: { from: 0, to: 0.92 },
    rotation: baseRotation,
    duration: STAMP_IN_MS,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: stamp,
    scale: 1,
    delay: STAMP_IN_MS,
    duration: 58,
    ease: "Sine.easeOut"
  });
  scene.tweens.add({
    targets: stamp,
    angle: { from: Phaser.Math.RadToDeg(baseRotation) - 2, to: Phaser.Math.RadToDeg(baseRotation) + 2 },
    delay: STAMP_IN_MS,
    duration: 82,
    yoyo: true,
    ease: "Sine.easeInOut"
  });
  scene.tweens.add({
    targets: stamp,
    alpha: 0,
    scale: 1.03,
    delay: STAMP_IN_MS + STAMP_HOLD_MS,
    duration: STAMP_FADE_MS,
    ease: "Sine.easeOut",
    onComplete: () => stamp.destroy(true)
  });

  const flecks = scene.add.container(centerX, centerY);
  const fleckColor = options.rewarded ? PALETTE.gold : accent;
  const fleckCount = options.rewarded ? 7 : 5;
  for (let i = 0; i < fleckCount; i += 1) {
    const angle = -Math.PI * 0.82 + i * ((Math.PI * 1.64) / (fleckCount - 1));
    const distance = cellSize * (0.2 + (i % 3) * 0.04);
    const fleck = scene.add.circle(Math.cos(angle) * distance * 0.22, Math.sin(angle) * distance * 0.22, i % 2 === 0 ? 2.5 : 1.8, fleckColor, options.rewarded ? 0.72 : 0.58);
    flecks.add(fleck);
    scene.tweens.add({
      targets: fleck,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      alpha: 0,
      duration: 170 + i * 10,
      ease: "Quad.easeOut"
    });
  }
  layer.add(flecks);
  scene.time.delayedCall(280, () => flecks.destroy(true));
}

export function playBallDrop(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  value: number,
  targetX = HUD.x + HUD.width / 2,
  targetY = HUD.y + 398
): void {
  const landing = scene.add.container(targetX, targetY + 72);
  const landingRing = scene.add.graphics();
  landingRing.lineStyle(2, PALETTE.gold, 0.42);
  landingRing.strokeEllipse(0, 0, 68, 14);
  landing.add(landingRing);
  landing.setAlpha(0);
  landing.setScale(0.78);
  layer.add(landing);

  const ball = scene.add.container(targetX - 72, targetY - 190);
  const shadow = scene.add.ellipse(0, 72, 76, 14, 0x040304, 0.16);
  const shell = scene.add.graphics();
  shell.fillStyle(PALETTE.paper, 1);
  shell.fillCircle(0, 0, 36);
  shell.lineStyle(4, PALETTE.redDark, 1);
  shell.strokeCircle(0, 0, 36);
  shell.fillStyle(0xffffff, 0.28);
  shell.fillEllipse(-12, -14, 14, 7);
  const valueText = createUiText(scene, 0, -16, String(value), 28, "#171116", "center", 64);
  ball.add(shadow);
  ball.add(shell);
  ball.add(valueText);
  ball.setAlpha(0);
  ball.setScale(0.72);
  ball.setRotation(-0.22);
  layer.add(ball);

  scene.tweens.add({
    targets: ball,
    x: targetX,
    y: targetY,
    alpha: { from: 0, to: 0.98 },
    scale: { from: 0.72, to: 1 },
    rotation: 0,
    duration: 240,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: landing,
    alpha: { from: 0, to: 0.62 },
    scale: 1,
    delay: 205,
    duration: 84,
    ease: "Quad.easeOut"
  });
  scene.tweens.add({
    targets: landing,
    alpha: 0,
    scale: 1.14,
    delay: 285,
    duration: 130,
    ease: "Sine.easeOut",
    onComplete: () => landing.destroy(true)
  });
  scene.tweens.add({
    targets: ball,
    y: targetY - 6,
    scale: 0.98,
    delay: 240,
    duration: 56,
    ease: "Sine.easeOut",
    yoyo: true
  });
  scene.tweens.add({
    targets: ball,
    rotation: { from: -0.035, to: 0.035 },
    delay: 236,
    duration: 66,
    yoyo: true,
    repeat: 1,
    ease: "Sine.easeInOut"
  });
  scene.tweens.add({
    targets: ball,
    alpha: 0,
    delay: 430,
    duration: 110,
    ease: "Sine.easeOut",
    onComplete: () => ball.destroy(true)
  });
}

export function playPatternRewardSweep(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  rewards: PatternReward[],
  metrics: BoardAnimationMetrics
): void {
  rewards.forEach((reward, index) => {
    if (reward.kind === "row") {
      const row = Number(reward.id.replace("row-", ""));
      const y = metrics.startY + row * (metrics.cellSize + metrics.gap) + metrics.cellSize / 2;
      playLineSweep(scene, layer, metrics.startX - 34, y, metrics.startX + metrics.boardWidth + 34, y, PALETTE.gold, index * 55);
      return;
    }

    if (reward.id === "diag-a") {
      playLineSweep(
        scene,
        layer,
        metrics.startX - 22,
        metrics.startY - 22,
        metrics.startX + metrics.boardWidth + 22,
        metrics.startY + metrics.boardHeight + 22,
        PALETTE.violet,
        index * 55
      );
      return;
    }

    if (reward.id === "diag-b") {
      playLineSweep(
        scene,
        layer,
        metrics.startX + metrics.boardWidth + 22,
        metrics.startY - 22,
        metrics.startX - 22,
        metrics.startY + metrics.boardHeight + 22,
        PALETTE.violet,
        index * 55
      );
      return;
    }

    if (reward.kind === "full") {
      playFullBoardSweep(scene, layer, metrics, index * 55);
    }
  });
}

export function playHudRewardPop(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  money: number,
  multiplier: number
): void {
  if (money > 0) {
    playFloatingHudText(scene, layer, HUD.x + 214, HUD.y + 110, `+$${money}`, "#f2d06b", 0);
  }
  if (multiplier > 0) {
    playFloatingHudText(scene, layer, HUD.x + 182, HUD.y + 194, `x+${multiplier.toFixed(1)}`, "#9fe7db", 80);
  }
}

export function playKioskEntrance(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  const wash = scene.add.rectangle(655, 356, 680, 590, 0x080407, 0.54);
  wash.setAlpha(0.42);
  layer.add(wash);
  scene.tweens.add({
    targets: wash,
    alpha: 0,
    duration: 165,
    ease: "Sine.easeOut",
    onComplete: () => wash.destroy()
  });

  const sign = scene.add.container(650, 74);
  const bg = scene.add.graphics();
  bg.fillStyle(0x25160f, 0.94);
  bg.fillRoundedRect(-92, -20, 184, 40, 8);
  bg.lineStyle(2, PALETTE.gold, 0.85);
  bg.strokeRoundedRect(-92, -20, 184, 40, 8);
  sign.add(bg);
  sign.add(createText(scene, 0, -13, "ABIERTO", 22, "#f2d06b", "center", 150));
  sign.setScale(0.9);
  sign.setAlpha(0);
  layer.add(sign);
  scene.tweens.add({
    targets: sign,
    y: 92,
    scale: 1,
    alpha: 1,
    duration: 150,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: sign,
    angle: { from: -1.2, to: 1.2 },
    delay: 160,
    duration: 110,
    yoyo: true,
    repeat: 1,
    ease: "Sine.easeInOut"
  });
  scene.tweens.add({
    targets: sign,
    alpha: 0,
    y: 84,
    delay: 430,
    duration: 130,
    ease: "Sine.easeIn",
    onComplete: () => sign.destroy(true)
  });

  const shine = scene.add.rectangle(360, 570, 42, 118, 0xffffff, 0.09);
  shine.setAngle(10);
  layer.add(shine);
  scene.tweens.add({
    targets: shine,
    x: 948,
    alpha: 0,
    duration: 350,
    ease: "Cubic.easeOut",
    onComplete: () => shine.destroy()
  });
}

function playLineSweep(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  delay: number
): void {
  const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
  const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
  const sweep = scene.add.container(x1, y1);
  sweep.setRotation(angle);
  sweep.setScale(0.001, 1);
  sweep.setAlpha(0.96);

  const line = scene.add.graphics();
  line.lineStyle(12, color, 0.18);
  line.beginPath();
  line.moveTo(0, 0);
  line.lineTo(length, 0);
  line.strokePath();
  line.lineStyle(5, color, 0.82);
  line.beginPath();
  line.moveTo(0, 0);
  line.lineTo(length, 0);
  line.strokePath();
  line.lineStyle(1, 0xffffff, 0.34);
  line.beginPath();
  line.moveTo(0, -3);
  line.lineTo(length, -3);
  line.strokePath();
  sweep.add(line);
  layer.add(sweep);

  scene.tweens.add({
    targets: sweep,
    scaleX: 1,
    delay,
    duration: 190,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: sweep,
    alpha: 0,
    delay: delay + 285,
    duration: 220,
    ease: "Sine.easeOut",
    onComplete: () => sweep.destroy(true)
  });
}

function playFullBoardSweep(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, metrics: BoardAnimationMetrics, delay: number): void {
  const frame = scene.add.container(metrics.startX + metrics.boardWidth / 2, metrics.startY + metrics.boardHeight / 2);
  const g = scene.add.graphics();
  g.lineStyle(8, PALETTE.gold, 0.78);
  g.strokeRoundedRect(-metrics.boardWidth / 2 - 26, -metrics.boardHeight / 2 - 26, metrics.boardWidth + 52, metrics.boardHeight + 52, 20);
  g.lineStyle(2, 0xffffff, 0.32);
  g.strokeRoundedRect(-metrics.boardWidth / 2 - 14, -metrics.boardHeight / 2 - 14, metrics.boardWidth + 28, metrics.boardHeight + 28, 14);
  frame.add(g);
  frame.setAlpha(0);
  frame.setScale(0.97);
  layer.add(frame);
  scene.tweens.add({
    targets: frame,
    alpha: 0.95,
    scale: 1.015,
    delay,
    duration: 180,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: frame,
    alpha: 0,
    scale: 1.07,
    delay: delay + 240,
    duration: 260,
    ease: "Sine.easeOut",
    onComplete: () => frame.destroy(true)
  });
}

function playFloatingHudText(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  label: string,
  color: string,
  delay: number
): void {
  const pop = scene.add.container(x, y);
  const plateWidth = Math.min(132, Math.max(84, label.length * 11 + 26));
  const plate = scene.add.graphics();
  plate.fillStyle(0x120b10, 0.72);
  plate.fillRoundedRect(-plateWidth / 2, -4, plateWidth, 30, 7);
  plate.lineStyle(1, 0xffffff, 0.08);
  plate.strokeRoundedRect(-plateWidth / 2, -4, plateWidth, 30, 7);
  const text = createUiText(scene, 0, 1, label, 18, color, "center", 112);
  text.setShadow(0, 2, "#120b10", 4, true, true);
  pop.add(plate);
  pop.add(text);
  pop.setAlpha(0);
  pop.setScale(0.88);
  layer.add(pop);
  scene.tweens.add({
    targets: pop,
    y: y - 16,
    scale: 0.98,
    alpha: { from: 0, to: 1 },
    delay,
    duration: 120,
    ease: "Cubic.easeOut"
  });
  scene.tweens.add({
    targets: pop,
    x: { from: x - 1.5, to: x + 1.5 },
    delay: delay + 14,
    duration: 66,
    yoyo: true,
    repeat: 1,
    ease: "Sine.easeInOut"
  });
  scene.tweens.add({
    targets: pop,
    y: y - 28,
    alpha: 0,
    delay: delay + 150,
    duration: 120,
    ease: "Sine.easeIn",
    onComplete: () => pop.destroy(true)
  });
}
