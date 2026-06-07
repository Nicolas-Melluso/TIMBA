import Phaser from "phaser";
import { ACCENT, MATERIAL, STATUS, SURFACE, UI_SPACING, UI_TYPOGRAPHY, type TimerUiRef } from "./theme.js";

type TextAlign = "left" | "center";

const TEXT_RESOLUTION = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hovered: boolean): void => {
    g.clear();
    g.fillStyle(SURFACE.shadow, hovered ? 0.46 : 0.36);
    g.fillRoundedRect(5, 7, width, height, 8);
    g.fillStyle(hovered ? ACCENT.danger : ACCENT.dangerDeep, 1);
    g.fillRoundedRect(0, 0, width, height, 8);
    g.fillStyle(0xffffff, hovered ? 0.16 : 0.1);
    g.fillRoundedRect(3, 3, width - 6, Math.max(7, Math.floor(height * 0.34)), 6);
    g.lineStyle(2, MATERIAL.brass, hovered ? 1 : 0.88);
    g.strokeRoundedRect(0, 0, width, height, 8);
    g.lineStyle(1, SURFACE.shadow, 0.34);
    g.strokeRoundedRect(2, 2, width - 4, height - 4, 6);
  };
  draw(false);
  const labelText = createUiText(scene, width / 2, height / 2 - 8, label, 14, "#fff4da", "center", width - 16);
  const hit = scene.add.zone(0, 0, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
  hit.on("pointerdown", onClick);
  hit.on("pointerover", () => draw(true));
  hit.on("pointerout", () => draw(false));
  container.add(g);
  container.add(labelText);
  container.add(hit);
  return container;
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(SURFACE.shadow, Math.min(0.38, alpha * 0.4));
  g.fillRoundedRect(x + 5, y + 7, width, height, 10);
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, width, height, 10);
  g.fillStyle(0xffffff, Math.min(0.08, alpha * 0.14));
  g.fillRoundedRect(x + 3, y + 3, width - 6, Math.max(12, Math.floor(height * 0.2)), 8);
  g.lineStyle(2, MATERIAL.brass, 0.92);
  g.strokeRoundedRect(x, y, width, height, 10);
  g.lineStyle(1, SURFACE.shadow, 0.34);
  g.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 9);
  return g;
}

export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size: number,
  color: string,
  align: TextAlign,
  wordWrapWidth?: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, content, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${size}px`,
      color,
      align,
      wordWrap: wordWrapWidth ? { width: wordWrapWidth } : undefined,
      lineSpacing: UI_TYPOGRAPHY.textLineSpacing,
      padding: { top: 1, bottom: 1 },
      resolution: TEXT_RESOLUTION
    })
    .setShadow(0, UI_TYPOGRAPHY.textShadowOffsetY, "#000000", UI_TYPOGRAPHY.textShadowAlpha, false, true)
    .setOrigin(align === "center" ? 0.5 : 0, 0);
}

export function createUiText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size: number,
  color: string,
  align: TextAlign,
  wordWrapWidth?: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, content, {
      fontFamily: "Segoe UI, Trebuchet MS, Verdana, Arial, sans-serif",
      fontSize: `${size}px`,
      color,
      align,
      wordWrap: wordWrapWidth ? { width: wordWrapWidth } : undefined,
      lineSpacing: UI_TYPOGRAPHY.uiLineSpacing,
      padding: { top: 1, bottom: 1 },
      resolution: TEXT_RESOLUTION
    })
    .setShadow(0, UI_TYPOGRAPHY.textShadowOffsetY, "#000000", UI_TYPOGRAPHY.textShadowAlpha, false, true)
    .setOrigin(align === "center" ? 0.5 : 0, 0);
}

export function addStatChip(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  valueColor: string
): void {
  const g = scene.add.graphics();
  g.fillStyle(SURFACE.shadow, 0.26);
  g.fillRoundedRect(x + 3, y + 4, width, 52, 7);
  g.fillStyle(SURFACE.panel, 1);
  g.fillRoundedRect(x, y, width, 52, 7);
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(x + 2, y + 2, width - 4, 15, 5);
  g.lineStyle(1, SURFACE.panelEdge, 1);
  g.strokeRoundedRect(x, y, width, 52, 7);
  g.lineStyle(1, MATERIAL.brass, 0.16);
  g.strokeRoundedRect(x + 3, y + 3, width - 6, 46, 5);
  layer.add(g);
  const textWidth = width - UI_SPACING.chipPaddingX * 2;
  layer.add(
    createUiText(scene, x + UI_SPACING.chipPaddingX, y + UI_SPACING.chipLabelTop, label, 10, "#c8ac77", "left", textWidth)
  );
  layer.add(
    createUiText(scene, x + UI_SPACING.chipPaddingX, y + UI_SPACING.chipValueTop, value, 20, valueColor, "left", textWidth)
  );
}

export function createBallTimerRef(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  remainingBalls: number,
  secondsRemaining: number,
  maxSeconds: number,
  isActive: boolean
): TimerUiRef {
  const track = scene.add.graphics();
  track.fillStyle(SURFACE.shadow, 0.28);
  track.fillRoundedRect(x + 3, y + 4, width, 25, 10);
  track.fillStyle(SURFACE.panelMuted, 1);
  track.fillRoundedRect(x, y, width, 25, 10);
  track.fillStyle(0xffffff, 0.06);
  track.fillRoundedRect(x + 2, y + 2, width - 4, 7, 6);
  track.lineStyle(1, SURFACE.panelEdgeBright, 1);
  track.strokeRoundedRect(x, y, width, 25, 10);
  track.lineStyle(1, MATERIAL.brass, 0.22);
  for (let tick = x + 32; tick < x + width - 12; tick += 32) {
    track.beginPath();
    track.moveTo(tick, y + 5);
    track.lineTo(tick, y + 20);
    track.strokePath();
  }
  layer.add(track);

  const fill = scene.add.graphics();
  layer.add(fill);
  const text = createUiText(scene, x + width / 2, y + UI_SPACING.timerLabelTop, "", 12, "#d9cab0", "center", width - 12);
  layer.add(text);

  const ref = { fill, text, x, y, width, remainingBalls };
  updateBallTimerRef(ref, secondsRemaining, maxSeconds, isActive);
  return ref;
}

export function updateBallTimerRef(ref: TimerUiRef | undefined, secondsRemaining: number, maxSeconds: number, isActive: boolean): void {
  if (!ref) {
    return;
  }
  const pct = isActive ? Phaser.Math.Clamp(secondsRemaining / maxSeconds, 0, 1) : 0;
  const timerColor = secondsRemaining >= 9 ? STATUS.timerSafe : secondsRemaining >= 5 ? STATUS.timerWarn : STATUS.timerDanger;
  ref.fill.clear();
  ref.fill.fillStyle(timerColor, 0.95);
  ref.fill.fillRoundedRect(ref.x + 3, ref.y + 3, Math.max(0, (ref.width - 6) * pct), 19, 9);
  ref.fill.fillStyle(0xffffff, 0.12);
  ref.fill.fillRoundedRect(ref.x + 4, ref.y + 4, Math.max(0, (ref.width - 8) * pct), 7, 5);
  const bonus = secondsRemaining >= 9 ? "+$10 rapido" : secondsRemaining >= 5 ? "+$5 rapido" : "sin bonus";
  ref.text.setText(isActive ? `${secondsRemaining}s - ${bonus}` : `${ref.remainingBalls ?? 0} en bolillero`);
  ref.text.setColor(isActive ? "#1a131d" : "#d9cab0");
}

export function updateKioskTimerRef(ref: TimerUiRef | undefined, secondsRemaining: number, maxSeconds: number): void {
  if (!ref) {
    return;
  }
  const pct = Phaser.Math.Clamp(secondsRemaining / maxSeconds, 0, 1);
  ref.fill.clear();
  ref.fill.fillStyle(secondsRemaining <= 5 ? STATUS.timerDanger : STATUS.timerWarn, 0.95);
  ref.fill.fillRoundedRect(ref.x, ref.y, ref.width * pct, 10, 5);
  ref.fill.fillStyle(0xffffff, 0.1);
  ref.fill.fillRoundedRect(ref.x + 1, ref.y + 1, Math.max(0, ref.width * pct - 2), 3, 2);
  ref.text.setText(`${secondsRemaining}s`);
  ref.text.setColor(secondsRemaining <= 5 ? "#ff8383" : "#f4e5c5");
}
