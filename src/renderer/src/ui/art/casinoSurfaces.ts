import type Phaser from "phaser";
import { MATERIAL, PALETTE, SURFACE } from "../theme.js";

type Graphics = Phaser.GameObjects.Graphics;

const WHITE = 0xffffff;
const PAPER_AGE = 0xd8be84;
const BALL_PORCELAIN = 0xf7edcf;
const BALL_CENTER = 0xe7cf9a;

function surfaceRadius(radius: number, width: number, height: number): number {
  return Math.max(1, Math.min(radius, width / 2, height / 2));
}

function insetRect(
  x: number,
  y: number,
  width: number,
  height: number,
  insetX: number,
  insetY = insetX
): { x: number; y: number; width: number; height: number } {
  const safeInsetX = Math.max(0, Math.min(insetX, width / 2 - 1));
  const safeInsetY = Math.max(0, Math.min(insetY, height / 2 - 1));
  return {
    x: x + safeInsetX,
    y: y + safeInsetY,
    width: Math.max(2, width - safeInsetX * 2),
    height: Math.max(2, height - safeInsetY * 2)
  };
}

export function drawFeltTexture(g: Graphics, x: number, y: number, width: number, height: number): void {
  const radius = surfaceRadius(22, width, height);
  const inner = insetRect(x, y, width, height, 5);
  const deepBand = insetRect(x, y + height * 0.62, width, height * 0.32, 8, 0);
  const sheen = insetRect(x, y + 12, width, 26, 14, 0);
  const microSheen = insetRect(x, y + 17, width, 4, 22, 0);

  g.fillStyle(MATERIAL.feltShadow, 1);
  g.fillRoundedRect(x, y, width, height, radius);
  g.fillStyle(MATERIAL.feltPrimary, 1);
  g.fillRoundedRect(inner.x, inner.y, inner.width, inner.height, Math.max(1, radius - 3));
  g.fillStyle(0x06261f, 0.3);
  g.fillRoundedRect(deepBand.x, deepBand.y, deepBand.width, deepBand.height, Math.max(4, deepBand.height * 0.28));
  g.fillStyle(MATERIAL.feltLight, 0.16);
  g.fillRoundedRect(sheen.x, sheen.y, sheen.width, sheen.height, Math.max(2, sheen.height * 0.45));
  g.fillStyle(WHITE, 0.035);
  g.fillRoundedRect(microSheen.x, microSheen.y, microSheen.width, microSheen.height, Math.max(1, microSheen.height * 0.5));

  g.lineStyle(1, 0x4ac1a4, 0.065);
  for (let i = -height; i < width + height; i += 27) {
    g.beginPath();
    g.moveTo(x + i, y + 10);
    g.lineTo(x + i + height * 0.52, y + height - 10);
    g.strokePath();
  }
  g.lineStyle(1, 0x041712, 0.14);
  for (let i = -height; i < width + height; i += 33) {
    g.beginPath();
    g.moveTo(x + i + height * 0.46, y + 10);
    g.lineTo(x + i, y + height - 12);
    g.strokePath();
  }
  g.lineStyle(1, WHITE, 0.02);
  for (let lineY = y + 28; lineY < y + height - 20; lineY += 26) {
    g.beginPath();
    g.moveTo(x + 16, lineY);
    g.lineTo(x + width - 16, lineY + (lineY % 3 === 0 ? 2 : -1));
    g.strokePath();
  }
  g.fillStyle(SURFACE.shadow, 0.14);
  g.fillEllipse(x + width / 2, y + height * 0.56, width * 0.78, height * 0.72);
  g.lineStyle(2, 0x0c3b31, 0.72);
  g.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, Math.max(1, radius - 2));
  g.lineStyle(1, MATERIAL.feltLight, 0.22);
  g.strokeRoundedRect(x + 12, y + 12, width - 24, height - 24, Math.max(1, radius - 7));
}

export function drawWoodFrame(g: Graphics, x: number, y: number, width: number, height: number, radius: number): void {
  const outerRadius = surfaceRadius(radius, width, height);
  const innerRadius = Math.max(8, outerRadius - 7);
  const core = insetRect(x, y, width, height, 12, 11);
  const topBand = insetRect(x, y + 16, width, 24, 18, 0);
  const bottomBand = insetRect(x, y + height - 42, width, 24, 18, 0);

  g.fillStyle(SURFACE.shadow, 0.42);
  g.fillRoundedRect(x + 4, y + 8, width, height, outerRadius);
  g.fillStyle(MATERIAL.woodDeep, 1);
  g.fillRoundedRect(x, y, width, height, outerRadius);
  g.fillStyle(0x3b2119, 1);
  g.fillRoundedRect(x + 7, y + 7, width - 14, height - 14, innerRadius);
  g.fillStyle(MATERIAL.wood, 1);
  g.fillRoundedRect(core.x, core.y, core.width, core.height, Math.max(8, innerRadius - 3));
  g.fillStyle(MATERIAL.woodLight, 0.26);
  g.fillRoundedRect(topBand.x, topBand.y, topBand.width, topBand.height, Math.max(4, topBand.height * 0.5));
  g.fillStyle(0x21100d, 0.22);
  g.fillRoundedRect(bottomBand.x, bottomBand.y, bottomBand.width, bottomBand.height, Math.max(4, bottomBand.height * 0.5));

  g.lineStyle(2, 0x1a0f0d, 0.62);
  g.strokeRoundedRect(x + 10, y + 10, width - 20, height - 20, Math.max(8, innerRadius - 2));
  g.lineStyle(1, 0xc28a52, 0.28);
  g.strokeRoundedRect(x + 17, y + 17, width - 34, height - 34, Math.max(8, innerRadius - 8));

  const railRight = x + width - 20;
  g.lineStyle(1, 0xc28a52, 0.25);
  for (let index = 0, railY = y + 30; railY < y + height - 20; index += 1, railY += 31) {
    const offset = index % 2 === 0 ? 5 : -4;
    g.beginPath();
    g.moveTo(x + 20, railY);
    g.lineTo(railRight, railY + offset);
    g.strokePath();
  }
  g.lineStyle(1, 0x24100c, 0.34);
  for (let index = 0, railY = y + 47; railY < y + height - 26; index += 1, railY += 43) {
    const offset = index % 2 === 0 ? -7 : 6;
    g.beginPath();
    g.moveTo(x + 26, railY);
    g.lineTo(railRight - 12, railY + offset);
    g.strokePath();
  }

  if (width > 260 && height > 170) {
    g.fillStyle(0x25120e, 0.28);
    g.fillEllipse(x + width * 0.18, y + 32, 56, 16);
    g.fillEllipse(x + width * 0.78, y + height - 31, 72, 18);
    g.lineStyle(1, MATERIAL.woodLight, 0.2);
    g.strokeEllipse(x + width * 0.18, y + 32, 44, 10);
    g.strokeEllipse(x + width * 0.78, y + height - 31, 58, 12);
  }

  g.lineStyle(2, 0x1a0f0d, 0.58);
  g.strokeRoundedRect(x, y, width, height, outerRadius);
  g.lineStyle(1, WHITE, 0.16);
  g.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, Math.max(1, outerRadius - 3));
}

export function drawBrassRivets(g: Graphics, x: number, y: number, width: number, height: number): void {
  const rivets = [
    [x + 26, y + 26],
    [x + width - 26, y + 26],
    [x + 26, y + height - 26],
    [x + width - 26, y + height - 26],
    [x + width / 2, y + 20],
    [x + width / 2, y + height - 20]
  ];

  for (const [cx, cy] of rivets) {
    g.fillStyle(SURFACE.shadow, 0.3);
    g.fillCircle(cx + 2, cy + 2, 6);
    g.fillStyle(0x513414, 1);
    g.fillCircle(cx, cy, 7);
    g.fillStyle(MATERIAL.brassDeep, 1);
    g.fillCircle(cx, cy, 6);
    g.fillStyle(MATERIAL.brass, 1);
    g.fillCircle(cx - 1, cy - 1, 3.8);
    g.fillStyle(WHITE, 0.35);
    g.fillEllipse(cx - 2.2, cy - 2.4, 3.2, 1.7);
    g.lineStyle(1, 0x2a1708, 0.35);
    g.strokeCircle(cx, cy, 6);
  }
}

export function drawPaperGrain(g: Graphics, x: number, y: number, width: number, height: number): void {
  const radius = surfaceRadius(4, width, height);

  g.fillStyle(WHITE, 0.11);
  g.fillRoundedRect(x + 6, y + 6, Math.max(1, width - 12), Math.max(8, height * 0.12), radius);
  g.fillStyle(PAPER_AGE, 0.12);
  g.fillRoundedRect(x + 6, y + height * 0.68, Math.max(1, width - 12), Math.max(8, height * 0.2), radius);
  g.lineStyle(1, 0x8f744a, 0.16);
  for (let lineY = y + 18; lineY < y + height - 10; lineY += 19) {
    g.beginPath();
    g.moveTo(x + 10, lineY);
    g.lineTo(x + width - 12, lineY + (lineY % 2 === 0 ? 3 : -2));
    g.strokePath();
  }
  g.lineStyle(1, WHITE, 0.12);
  for (let lineX = x + 18; lineX < x + width - 12; lineX += 27) {
    g.beginPath();
    g.moveTo(lineX, y + 12);
    g.lineTo(lineX - 8, y + height - 12);
    g.strokePath();
  }
  if (width > 70 && height > 80) {
    g.fillStyle(0x6a4029, 0.055);
    g.fillEllipse(x + width * 0.74, y + height * 0.32, width * 0.22, height * 0.12);
    g.lineStyle(1, WHITE, 0.11);
    g.strokeEllipse(x + width * 0.23, y + height * 0.74, width * 0.28, height * 0.08);
  }
}

export function drawTicketNotches(g: Graphics, x: number, y: number, width: number, height: number, background: number): void {
  const notchRadius = Math.max(2, Math.min(5, width * 0.08, height * 0.12));
  const leftX = x + notchRadius * 0.28;
  const rightX = x + width - notchRadius * 0.28;
  const startY = y + Math.max(12, notchRadius * 2);
  const endY = y + height - Math.max(10, notchRadius * 1.5);
  const step = Math.max(notchRadius * 3.8, 18);

  g.fillStyle(background, 1);
  for (let notchY = startY; notchY < endY; notchY += step) {
    g.fillCircle(leftX, notchY, notchRadius);
    g.fillCircle(rightX, notchY, notchRadius);
    g.lineStyle(1, MATERIAL.paperEdge, 0.34);
    g.strokeCircle(leftX, notchY, notchRadius);
    g.strokeCircle(rightX, notchY, notchRadius);
  }
}

export function drawBallFace(g: Graphics, cx: number, cy: number, radius: number, active: boolean): void {
  const halo = Math.max(4, Math.min(18, radius * 0.26));
  const ringWidth = Math.max(2, radius * 0.08);

  g.fillStyle(SURFACE.shadow, 0.34);
  g.fillEllipse(cx + radius * 0.1, cy + radius * 0.76, radius * 1.86, radius * 0.36);
  g.fillStyle(active ? MATERIAL.glass : 0x645a4f, active ? 0.18 : 0.09);
  g.fillCircle(cx, cy, radius + halo);
  g.lineStyle(Math.max(1, radius * 0.035), active ? MATERIAL.brass : MATERIAL.paperEdge, active ? 0.62 : 0.38);
  g.strokeCircle(cx, cy, radius + halo - 2);
  g.fillStyle(0x76664f, 0.18);
  g.fillCircle(cx + radius * 0.04, cy + radius * 0.08, radius + 1.5);
  g.fillStyle(MATERIAL.paper, 1);
  g.fillCircle(cx, cy, radius);
  g.fillStyle(BALL_PORCELAIN, 1);
  g.fillCircle(cx - radius * 0.04, cy - radius * 0.05, radius * 0.9);
  g.fillStyle(BALL_CENTER, 0.7);
  g.fillCircle(cx, cy, radius * 0.72);
  g.fillStyle(0x7f6046, 0.11);
  g.fillEllipse(cx + radius * 0.08, cy + radius * 0.35, radius * 1.18, radius * 0.34);
  g.lineStyle(ringWidth, PALETTE.redDark, 1);
  g.strokeCircle(cx, cy, radius * 0.94);
  g.lineStyle(Math.max(1, radius * 0.025), 0xffffff, active ? 0.28 : 0.18);
  g.strokeCircle(cx, cy, radius * 0.64);
  g.fillStyle(WHITE, active ? 0.38 : 0.2);
  g.fillEllipse(cx - radius * 0.32, cy - radius * 0.34, radius * 0.36, radius * 0.2);
  g.fillStyle(WHITE, active ? 0.16 : 0.08);
  g.fillEllipse(cx + radius * 0.22, cy - radius * 0.26, radius * 0.22, radius * 0.1);
}

export function drawCardFace(g: Graphics, x: number, y: number, width: number, height: number, muted = false): void {
  const radius = surfaceRadius(5, width, height);

  g.fillStyle(SURFACE.shadow, 0.24);
  g.fillRoundedRect(x + 3, y + 5, width, height, radius);
  g.fillStyle(muted ? 0xc9b993 : MATERIAL.paper, 1);
  g.fillRoundedRect(x, y, width, height, radius);
  g.fillStyle(muted ? 0x9e855d : PAPER_AGE, muted ? 0.14 : 0.12);
  g.fillRoundedRect(x + 3, y + height * 0.58, Math.max(1, width - 6), Math.max(8, height * 0.34), Math.max(1, radius - 1));
  g.fillStyle(WHITE, muted ? 0.055 : 0.13);
  g.fillRoundedRect(x + 5, y + 5, Math.max(1, width - 10), Math.max(8, height * 0.16), Math.max(1, radius - 1));
  if (width >= 52 && height >= 64) {
    drawPaperGrain(g, x + 3, y + 4, width - 6, height - 8);
    g.lineStyle(1, 0x6d5134, muted ? 0.12 : 0.08);
    g.beginPath();
    g.moveTo(x + 8, y + height - 12);
    g.lineTo(x + width - 8, y + height - 10);
    g.strokePath();
  }
  g.lineStyle(1, WHITE, muted ? 0.09 : 0.2);
  g.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, Math.max(1, radius - 1));
  g.lineStyle(2, muted ? 0x806f50 : MATERIAL.paperEdge, 1);
  g.strokeRoundedRect(x, y, width, height, radius);
}

export function drawCardBack(g: Graphics, x: number, y: number, width: number, height: number): void {
  const panel = insetRect(x, y, width, height, 8);
  const panelRadius = surfaceRadius(4, panel.width, panel.height);
  const shadowBand = insetRect(panel.x, panel.y + panel.height * 0.54, panel.width, panel.height * 0.34, 2, 0);
  const shineBand = insetRect(panel.x, panel.y + 4, panel.width, Math.max(5, panel.height * 0.12), 4, 0);
  const insetStroke = insetRect(panel.x, panel.y, panel.width, panel.height, 5);

  drawCardFace(g, x, y, width, height, false);
  g.fillStyle(PALETTE.redDark, 1);
  g.fillRoundedRect(panel.x, panel.y, panel.width, panel.height, panelRadius);
  g.fillStyle(0x4c1720, 0.34);
  g.fillRoundedRect(shadowBand.x, shadowBand.y, shadowBand.width, shadowBand.height, Math.max(2, shadowBand.height * 0.2));
  g.fillStyle(WHITE, 0.08);
  g.fillRoundedRect(shineBand.x, shineBand.y, shineBand.width, shineBand.height, Math.max(2, shineBand.height * 0.45));
  g.lineStyle(1, MATERIAL.brass, 0.55);
  for (let lineX = panel.x + 8; lineX < panel.x + panel.width - 6; lineX += 11) {
    g.beginPath();
    g.moveTo(lineX, panel.y + 4);
    g.lineTo(lineX - Math.min(20, panel.width * 0.32), panel.y + panel.height - 4);
    g.strokePath();
  }
  g.lineStyle(1, WHITE, 0.18);
  g.strokeRoundedRect(insetStroke.x, insetStroke.y, insetStroke.width, insetStroke.height, Math.max(2, panelRadius - 1));
  g.lineStyle(2, 0x5b1a24, 0.82);
  g.strokeRoundedRect(panel.x, panel.y, panel.width, panel.height, panelRadius);
}
