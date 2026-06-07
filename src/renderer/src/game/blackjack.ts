import type { BlackjackCard, BlackjackState, RandomFn, RunState } from "./types.js";

const CARD_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createBlackjackState(random: RandomFn = Math.random): BlackjackState {
  return {
    playerHand: [drawCard(random), drawCard(random)],
    dealerHand: [drawCard(random), drawCard(random)],
    settled: false,
    result: "playing"
  };
}

export function startBlackjackSideGame(run: RunState, random: RandomFn = Math.random): RunState {
  if (run.blackjackPlayedThisVisit) {
    return {
      ...run,
      lastMessage: "Ya jugaste 21 en este kiosco."
    };
  }

  return {
    ...run,
    phase: "blackjack",
    blackjack: createBlackjackState(random),
    blackjackPlayedThisVisit: true,
    lastMessage: "Una mano de 21, rapido."
  };
}

export function blackjackHit(state: BlackjackState, random: RandomFn = Math.random): BlackjackState {
  if (state.settled) {
    return state;
  }

  const playerHand = [...state.playerHand, drawCard(random)];
  if (handValue(playerHand) > 21) {
    return {
      ...state,
      playerHand,
      settled: true,
      result: "lose"
    };
  }

  return {
    ...state,
    playerHand
  };
}

export function blackjackStand(state: BlackjackState, random: RandomFn = Math.random): BlackjackState {
  if (state.settled) {
    return state;
  }

  const dealerHand = [...state.dealerHand];
  while (handValue(dealerHand) < 17) {
    dealerHand.push(drawCard(random));
  }

  const player = handValue(state.playerHand);
  const dealer = handValue(dealerHand);
  const result = player <= 21 && (dealer > 21 || player > dealer) ? "win" : player === dealer ? "push" : "lose";

  return {
    ...state,
    dealerHand,
    settled: true,
    result
  };
}

export function applyBlackjackPayout(run: RunState, blackjack: BlackjackState): RunState {
  if (!blackjack.settled) {
    return run;
  }

  if (blackjack.result === "win") {
    const payout = run.ownedBonusIds.includes("house-amulet") ? 40 : 30;
    return { ...run, money: run.money + payout, lastMessage: `Blackjack pago $${payout}.` };
  }

  if (blackjack.result === "push") {
    const payout = run.ownedBonusIds.includes("house-amulet") ? 10 : 5;
    return { ...run, money: run.money + payout, lastMessage: `Blackjack empatado: rescatas $${payout}.` };
  }

  const loss = run.ownedBonusIds.includes("house-amulet") ? 10 : 15;
  return { ...run, money: Math.max(0, run.money - loss), lastMessage: `Te pasaste o perdiste: -$${loss}.` };
}

export function drawCard(random: RandomFn = Math.random): BlackjackCard {
  const label = CARD_LABELS[Math.floor(random() * CARD_LABELS.length)];
  if (label === "A") {
    return { label, value: 11 };
  }
  if (label === "J" || label === "Q" || label === "K") {
    return { label, value: 10 };
  }
  return { label, value: Number(label) };
}

export function handValue(hand: BlackjackCard[]): number {
  let total = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter((card) => card.label === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function handLabel(hand: BlackjackCard[]): string {
  return hand.map((card) => card.label).join(" ");
}
