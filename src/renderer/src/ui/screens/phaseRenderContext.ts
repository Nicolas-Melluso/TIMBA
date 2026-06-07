import type { RunState } from "../../game/types.js";

export type PhaseRenderContext = {
  phase: RunState["phase"];
  musicMuted: boolean;
};

export function createPhaseRenderContext(state: RunState, musicMuted: boolean): PhaseRenderContext {
  return {
    phase: state.phase,
    musicMuted
  };
}

export function isTerminalPhase(phase: RunState["phase"]): boolean {
  return phase === "runWon" || phase === "lost";
}
