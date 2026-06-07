import type { PermanentBonus, ShopItem, TableConfig } from "./types.js";

export const ROUND_SECONDS = 22;
export const STARTING_MULTIPLIER = 3;
export const MULTIPLIER_DECAY_PER_BALL = 0.11;

export const TABLE_CONFIGS: TableConfig[] = [
  {
    id: "tutorial",
    title: "Tutorial 2x2",
    subtitle: "Aprende a sellar antes de entrar al asilo.",
    boardSize: 2,
    ballMin: 1,
    ballMax: 8,
    startingMoney: 50,
    rowPayout: 20,
    fullBoardPayout: {
      normal: 60,
      clutch: 82
    },
    isTutorial: true
  },
  {
    id: "asilo-inicio",
    title: "Asilo",
    subtitle: "Mesa chica. La Parca todavia mira desde la puerta.",
    boardSize: 3,
    ballMin: 1,
    ballMax: 30,
    startingMoney: 70,
    rowPayout: 24,
    fullBoardPayout: {
      normal: 68,
      clutch: 90
    }
  },
  {
    id: "asilo-patio",
    title: "Patio del asilo",
    subtitle: "La misma mesa, mas ruido, mejores trampas.",
    boardSize: 3,
    ballMin: 1,
    ballMax: 32,
    startingMoney: 62,
    rowPayout: 22,
    fullBoardPayout: {
      normal: 64,
      clutch: 86
    }
  },
  {
    id: "asilo-tv",
    title: "Sala de TV",
    subtitle: "Ultima mesa chica antes de salir al bar.",
    boardSize: 3,
    ballMin: 1,
    ballMax: 34,
    startingMoney: 66,
    rowPayout: 23,
    fullBoardPayout: {
      normal: 66,
      clutch: 88
    }
  },
  {
    id: "bar",
    title: "Bar de mala muerte",
    subtitle: "Mas numeros, mas humo, menos margen.",
    boardSize: 4,
    ballMin: 1,
    ballMax: 50,
    startingMoney: 108,
    rowPayout: 30,
    fullBoardPayout: {
      normal: 80,
      clutch: 106
    }
  },
  {
    id: "boss",
    title: "Mesa final",
    subtitle: "El timbero famoso canta sus numeros mientras tu mesa se rompe.",
    boardSize: 5,
    ballMin: 1,
    ballMax: 75,
    startingMoney: 130,
    rowPayout: 35,
    fullBoardPayout: {
      normal: 92,
      clutch: 122
    },
    boss: {
      name: "El Nono de Oro",
      target: 165,
      advanceMin: 3,
      advanceMax: 4
    }
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "force-ball",
    label: "Bolilla soplada",
    cost: 35,
    hint: "La proxima bolilla sale de un numero sin marcar.",
    flavor: "El kiosquero mira para otro lado."
  },
  {
    id: "fuzzy-stamp",
    label: "Sello viudo",
    cost: 30,
    hint: "Marca una casilla elegida aunque nadie este seguro.",
    flavor: "La tinta corre. La culpa tambien."
  },
  {
    id: "swap-cells",
    label: "Bajo la mesa",
    cost: 20,
    hint: "Intercambia dos numeros para cerrar una linea.",
    flavor: "Dos dedos, un carton, nadie vio nada."
  },
  {
    id: "strong-coffee",
    label: "Cafe doble",
    cost: 16,
    hint: "Recupera x0.3 de multiplicador.",
    flavor: "Amargo, oscuro y demasiado necesario."
  },
  {
    id: "bump-number",
    label: "Tinta corrida",
    cost: 22,
    hint: "Ajusta una casilla elegida al numero siguiente.",
    flavor: "El 14 siempre pudo haber sido 15."
  },
  {
    id: "lower-number",
    label: "Tinta en reversa",
    cost: 22,
    hint: "Ajusta una casilla elegida al numero anterior.",
    flavor: "El 15 siempre pudo haber sido 14."
  },
  {
    id: "erase-bad-call",
    label: "Acta quemada",
    cost: 24,
    hint: "Saca del registro la ultima bolilla inutil.",
    flavor: "La bolilla salio, pero el papel no."
  }
];

export const PERMANENT_BONUSES: PermanentBonus[] = [
  {
    id: "heavy-stamp",
    label: "Sello pesado",
    cost: 60,
    hint: "+6 puntos por cada sello.",
    flavor: "Deja marca aunque tiemble la mano."
  },
  {
    id: "lucky-cup",
    label: "Taza cabulera",
    cost: 65,
    hint: "Cada linea paga +$10.",
    flavor: "Cafe viejo, suerte nueva."
  },
  {
    id: "marked-cage",
    label: "Bolillero marcado",
    cost: 80,
    hint: "Forzar bolilla cuesta $10 menos.",
    flavor: "Una muesca basta para el que sabe mirar."
  },
  {
    id: "wide-kiosk",
    label: "Mostrador amigo",
    cost: 75,
    hint: "El kiosco ofrece 4 trampas en vez de 3.",
    flavor: "El kiosquero ya te guarda lo bueno."
  },
  {
    id: "slow-death",
    label: "Rosario torcido",
    cost: 85,
    hint: "La Parca baja x0.06 menos por bolilla.",
    flavor: "No salva, pero demora."
  },
  {
    id: "dirty-ledger",
    label: "Libreta negra",
    cost: 70,
    hint: "Empezas cada mesa nueva con +$25.",
    flavor: "Las deudas tambien pueden ser tuyas."
  },
  {
    id: "blurred-sigil",
    label: "Sigilo borroso",
    cost: 78,
    hint: "Sello viudo paga +$8 y recupera x0.1.",
    flavor: "La tinta sucia ahora tambien trae viento a favor."
  },
  {
    id: "quick-ritual",
    label: "Ritual veloz",
    cost: 88,
    hint: "Cada 3 sellos rapidos: +$18 extra.",
    flavor: "Tres golpes seguidos y la mesa afloja billetes."
  },
  {
    id: "cross-charm",
    label: "Amuleto cruzado",
    cost: 82,
    hint: "Las diagonales dan +x0.25 adicional.",
    flavor: "Cruza dos lineas y la mesa te devuelve aire."
  },
  {
    id: "house-amulet",
    label: "Amuleto de la casa",
    cost: 92,
    hint: "Mejora el pago del blackjack de kiosco.",
    flavor: "La casa no perdona, pero hoy te hace un guino."
  },
  {
    id: "kiosk-amulet",
    label: "Amuleto del kiosco",
    cost: 72,
    hint: "Todas las trampas del kiosco cuestan $5 menos.",
    flavor: "Te conocen tanto que el descuento sale sin hablar."
  }
];
