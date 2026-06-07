import { PLAY_AREA } from "../theme.js";

export type BoardMetrics = {
  size: number;
  cellSize: number;
  gap: number;
  boardWidth: number;
  boardHeight: number;
  startX: number;
  startY: number;
};

export function boardMetricsForSize(size: number): BoardMetrics {
  const cellSize = size === 2 ? 174 : size === 3 ? 136 : size === 4 ? 104 : 78;
  const gap = size === 2 ? 16 : size === 3 ? 14 : size === 4 ? 11 : 9;
  const boardWidth = size * cellSize + (size - 1) * gap;
  const boardHeight = boardWidth;

  return {
    size,
    cellSize,
    gap,
    boardWidth,
    boardHeight,
    startX: PLAY_AREA.centerX - boardWidth / 2,
    startY: PLAY_AREA.centerY - boardHeight / 2 + (size === 2 ? 8 : 0)
  };
}
