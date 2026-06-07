type PressureReadoutParams = {
  hasParcaMark: boolean;
  parcaMarkedValue: number | null;
  round: number;
  rank: number;
  deltaToNext: number;
};

type BallInventoryReadoutParams = {
  calledBallCount: number;
  totalBalls: number;
  remainingBalls: number;
  usefulBalls: number;
};

type CalledBallsReadoutParams = {
  remainingBalls: number;
  calledBalls: number[];
  maxShown?: number;
};

export function buildPressureReadout(params: PressureReadoutParams): string {
  if (params.hasParcaMark) {
    return `MARCA PARCA ${params.parcaMarkedValue ?? "?"}: tocar o -x0.08`;
  }
  const chase = params.deltaToNext > 0 ? `+${params.deltaToNext} al top` : "lider local";
  return `RONDA ${params.round} / #${params.rank} / ${chase}`;
}

export function buildBallInventoryReadout(params: BallInventoryReadoutParams): string {
  return `BOL ${params.calledBallCount}/${params.totalBalls} / QUEDAN ${params.remainingBalls} / UTILES ${params.usefulBalls}`;
}

export function buildCalledBallsHeader(params: CalledBallsReadoutParams): string {
  return `ULTIMAS BOLILLAS / QUEDAN ${params.remainingBalls}`;
}

export function buildCalledBallsValue(params: CalledBallsReadoutParams): string {
  const maxShown = params.maxShown ?? 10;
  const called = params.calledBalls.slice(-maxShown).join("  ");
  return called || "Ninguna";
}
