import type Phaser from "phaser";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 760;
export const BALL_SECONDS = 14;

export const PLAY_AREA = {
  x: 42,
  y: 118,
  width: 864,
  height: 584,
  centerX: 474,
  centerY: 386
};

export const HUD = {
  x: 932,
  y: 34,
  width: 304,
  height: 668
};

export const PALETTE = {
  night: 0x0f0c14,
  wall: 0x1f1926,
  table: 0x2a2330,
  felt: 0x0f473a,
  feltDark: 0x0a3028,
  feltLight: 0x1c6a56,
  paper: 0xf4e5c5,
  paperDark: 0xc6aa72,
  ink: 0x19121c,
  red: 0xd55252,
  redDark: 0x842f38,
  gold: 0xe4bb58,
  goldDark: 0x9c6f2e,
  bone: 0xe0d5bf,
  coffee: 0x754a32,
  wood: 0x6a3f28,
  woodDark: 0x2b1713,
  woodLight: 0xa36b3d,
  glass: 0xaee8dc,
  teal: 0x2db8a5,
  violet: 0x7f6ce0,
  shadow: 0x060509
};

export const SURFACE = {
  page: PALETTE.night,
  wall: PALETTE.wall,
  table: PALETTE.table,
  panel: 0x261f2a,
  panelMuted: 0x1f1923,
  panelEdge: 0x6b5a4c,
  panelEdgeBright: 0x8a744f,
  ink: PALETTE.ink,
  shadow: PALETTE.shadow
};

export const MATERIAL = {
  feltPrimary: PALETTE.felt,
  feltShadow: PALETTE.feltDark,
  feltLight: PALETTE.feltLight,
  brass: PALETTE.gold,
  brassSoft: 0xc59c4f,
  brassDeep: PALETTE.goldDark,
  paper: PALETTE.paper,
  paperMuted: PALETTE.paperDark,
  paperEdge: 0x8f744a,
  bone: PALETTE.bone,
  wood: PALETTE.wood,
  woodDeep: PALETTE.woodDark,
  woodLight: PALETTE.woodLight,
  glass: PALETTE.glass,
  leather: 0x3b2320
};

export const ACCENT = {
  danger: PALETTE.red,
  dangerDeep: PALETTE.redDark,
  success: PALETTE.teal,
  focus: PALETTE.violet,
  coffee: PALETTE.coffee
};

export const STATUS = {
  textPrimary: 0xf4e5c5,
  textMuted: 0xd9cab0,
  timerSafe: PALETTE.teal,
  timerWarn: PALETTE.gold,
  timerDanger: PALETTE.red
};

export const UI_SPACING = {
  chipPaddingX: 10,
  chipLabelTop: 8,
  chipValueTop: 24,
  timerLabelTop: 4
};

export const UI_TYPOGRAPHY = {
  textLineSpacing: 2,
  uiLineSpacing: 2,
  textShadowOffsetY: 1,
  textShadowAlpha: 0.42
};

export const UI_LAYOUT = {
  gameWidth: GAME_WIDTH,
  gameHeight: GAME_HEIGHT,
  playArea: PLAY_AREA,
  hud: HUD,
  ballSeconds: BALL_SECONDS
};

export type UiPalette = typeof PALETTE;
export type UiLayout = typeof UI_LAYOUT;
export type UiSurface = typeof SURFACE;
export type UiMaterial = typeof MATERIAL;
export type UiAccent = typeof ACCENT;
export type UiStatus = typeof STATUS;
export type UiSpacing = typeof UI_SPACING;
export type UiTypography = typeof UI_TYPOGRAPHY;

export type RendererLayers = {
  boardLayer: Phaser.GameObjects.Container;
  parcaLayer: Phaser.GameObjects.Container;
  hudLayer: Phaser.GameObjects.Container;
  actionLayer: Phaser.GameObjects.Container;
  effectsLayer: Phaser.GameObjects.Container;
};

export type TimerUiRef = {
  fill: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  width: number;
  remainingBalls?: number;
};

export type ParcaRenderInput = {
  danger: number;
  width?: number;
  height?: number;
  palette?: UiPalette;
};

export type SceneActionCallbacks = Record<string, () => void>;
