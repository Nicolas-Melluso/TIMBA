export type TutorialTopicId =
  | "core-board-loop"
  | "kiosk-entry"
  | "directed-cheats"
  | "parca-mark"
  | "blackjack"
  | "contracts"
  | "upgrades"
  | "win-condition"
  | "loss-condition";

export type TutorialActionId =
  | "stamp-called-number"
  | "complete-line"
  | "open-kiosk"
  | "buy-directed-cheat"
  | "use-directed-cheat"
  | "inspect-parca-mark"
  | "survive-parca-pressure"
  | "play-blackjack-round"
  | "accept-contract"
  | "complete-contract-goal"
  | "buy-upgrade"
  | "reach-table-win"
  | "trigger-loss-state";

export type TutorialCoverageAreaId =
  | "board-loop"
  | "kiosk"
  | "directed-cheats"
  | "parca"
  | "blackjack"
  | "contracts"
  | "upgrades"
  | "outcomes";

export type TutorialAction = {
  id: TutorialActionId;
  label: string;
  completionHint: string;
  required: boolean;
};

export type TutorialStep = {
  id: string;
  order: number;
  topicId: TutorialTopicId;
  title: string;
  objective: string;
  requiredActions: TutorialAction[];
};

export type TutorialCoverageItem = {
  id: string;
  areaId: TutorialCoverageAreaId;
  label: string;
  required: boolean;
  stepIds: string[];
  checks: string[];
};

export type TutorialCoverageMap = {
  version: string;
  audience: string;
  integrationNotes: string[];
  orderedTopics: TutorialTopicId[];
  steps: TutorialStep[];
  coverageChecklist: TutorialCoverageItem[];
};

export const TUTORIAL_GUIDE: TutorialCoverageMap = {
  version: "v1.0.0",
  audience: "First-time player with zero TIMBA context.",
  integrationNotes: [
    "This file is pure data only: no scene/rules coupling.",
    "Gate progress by requiredActions completion before advancing step order.",
    "Track each TutorialActionId and mark matching coverageChecklist checks when observed."
  ],
  orderedTopics: [
    "core-board-loop",
    "kiosk-entry",
    "directed-cheats",
    "parca-mark",
    "blackjack",
    "contracts",
    "upgrades",
    "win-condition",
    "loss-condition"
  ],
  steps: [
    {
      id: "step-01-core-stamp",
      order: 1,
      topicId: "core-board-loop",
      title: "Stamp a called number",
      objective: "Learn that only called numbers should be stamped.",
      requiredActions: [
        {
          id: "stamp-called-number",
          label: "Stamp a cell matching the current called number.",
          completionHint: "One valid stamp confirms board interaction.",
          required: true
        }
      ]
    },
    {
      id: "step-02-core-line",
      order: 2,
      topicId: "core-board-loop",
      title: "Close a basic line",
      objective: "Understand that line completion is the first scoring milestone.",
      requiredActions: [
        {
          id: "complete-line",
          label: "Complete one valid line pattern.",
          completionHint: "The run should register one line reward.",
          required: true
        }
      ]
    },
    {
      id: "step-03-kiosk-entry",
      order: 3,
      topicId: "kiosk-entry",
      title: "Enter kiosk phase",
      objective: "Expose the between-round economy loop.",
      requiredActions: [
        {
          id: "open-kiosk",
          label: "Open the kiosk when offered.",
          completionHint: "The tutorial should detect one kiosk visit.",
          required: true
        }
      ]
    },
    {
      id: "step-04-directed-cheat",
      order: 4,
      topicId: "directed-cheats",
      title: "Buy and apply a directed cheat",
      objective: "Show player-controlled cheating flow, not random-only help.",
      requiredActions: [
        {
          id: "buy-directed-cheat",
          label: "Purchase one directed cheat from kiosk inventory.",
          completionHint: "Any directed cheat purchase counts.",
          required: true
        },
        {
          id: "use-directed-cheat",
          label: "Apply it to a chosen board cell or pair of cells.",
          completionHint: "One successful use confirms intentional control.",
          required: true
        }
      ]
    },
    {
      id: "step-05-parca-pressure",
      order: 5,
      topicId: "parca-mark",
      title: "Read and survive Parca pressure",
      objective: "Teach Parca mark visibility and urgency management.",
      requiredActions: [
        {
          id: "inspect-parca-mark",
          label: "Identify the marked cell and explain its risk.",
          completionHint: "Player acknowledges marked-cell danger.",
          required: true
        },
        {
          id: "survive-parca-pressure",
          label: "Resolve one pressure moment without immediate fail.",
          completionHint: "Continue run after a marked-cell threat cycle.",
          required: true
        }
      ]
    },
    {
      id: "step-06-blackjack",
      order: 6,
      topicId: "blackjack",
      title: "Play one blackjack round",
      objective: "Introduce side-game pacing and payout impact.",
      requiredActions: [
        {
          id: "play-blackjack-round",
          label: "Finish one full blackjack result (win/lose/push).",
          completionHint: "Any settled blackjack state completes this step.",
          required: true
        }
      ]
    },
    {
      id: "step-07-contracts",
      order: 7,
      topicId: "contracts",
      title: "Adopt and progress a contract",
      objective: "Make long-horizon goals explicit before deeper tables.",
      requiredActions: [
        {
          id: "accept-contract",
          label: "Accept at least one offered contract.",
          completionHint: "Contract enters active list.",
          required: true
        },
        {
          id: "complete-contract-goal",
          label: "Advance or complete its tracked objective.",
          completionHint: "Contract progress event is observed.",
          required: true
        }
      ]
    },
    {
      id: "step-08-upgrades",
      order: 8,
      topicId: "upgrades",
      title: "Purchase an upgrade",
      objective: "Teach permanent progression value across tables.",
      requiredActions: [
        {
          id: "buy-upgrade",
          label: "Buy one permanent upgrade.",
          completionHint: "Owned bonus list gains one entry.",
          required: true
        }
      ]
    },
    {
      id: "step-09-win-state",
      order: 9,
      topicId: "win-condition",
      title: "Reach a table win",
      objective: "Confirm the positive loop closure.",
      requiredActions: [
        {
          id: "reach-table-win",
          label: "Complete a table and enter win state.",
          completionHint: "Run transitions to tableWon or runWon.",
          required: true
        }
      ]
    },
    {
      id: "step-10-loss-state",
      order: 10,
      topicId: "loss-condition",
      title: "See a controlled loss case",
      objective: "Clarify failure conditions and recovery expectation.",
      requiredActions: [
        {
          id: "trigger-loss-state",
          label: "Reach a valid loss condition once.",
          completionHint: "Run transitions to lost with reason shown.",
          required: true
        }
      ]
    }
  ],
  coverageChecklist: [
    {
      id: "coverage-board-loop",
      areaId: "board-loop",
      label: "Core board loop coverage",
      required: true,
      stepIds: ["step-01-core-stamp", "step-02-core-line"],
      checks: ["Called-number stamping", "Basic line completion"]
    },
    {
      id: "coverage-kiosk",
      areaId: "kiosk",
      label: "Kiosk entry coverage",
      required: true,
      stepIds: ["step-03-kiosk-entry"],
      checks: ["Kiosk phase appears", "Player enters kiosk once"]
    },
    {
      id: "coverage-directed-cheats",
      areaId: "directed-cheats",
      label: "Directed cheats coverage",
      required: true,
      stepIds: ["step-04-directed-cheat"],
      checks: ["Directed cheat purchase", "Directed cheat usage"]
    },
    {
      id: "coverage-parca",
      areaId: "parca",
      label: "Parca mark coverage",
      required: true,
      stepIds: ["step-05-parca-pressure"],
      checks: ["Marked-cell risk recognition", "Pressure survival"]
    },
    {
      id: "coverage-blackjack",
      areaId: "blackjack",
      label: "Blackjack side-game coverage",
      required: true,
      stepIds: ["step-06-blackjack"],
      checks: ["One settled blackjack round"]
    },
    {
      id: "coverage-contracts",
      areaId: "contracts",
      label: "Contract system coverage",
      required: true,
      stepIds: ["step-07-contracts"],
      checks: ["Contract acceptance", "Contract progress/completion"]
    },
    {
      id: "coverage-upgrades",
      areaId: "upgrades",
      label: "Upgrade progression coverage",
      required: true,
      stepIds: ["step-08-upgrades"],
      checks: ["Permanent upgrade purchase"]
    },
    {
      id: "coverage-outcomes",
      areaId: "outcomes",
      label: "Run outcomes coverage",
      required: true,
      stepIds: ["step-09-win-state", "step-10-loss-state"],
      checks: ["Win state observed", "Loss state observed with reason"]
    }
  ]
};
