# TIMBA!

Desktop prototype for a bingo roguelike against the Parca.

The first slice is built as an Electron app with a Phaser renderer. The game is not a casino app: all money is fictional, there are no real-money bets, no premium currency, and no microtransactions.

## Current Slice

- 2x2 interactive tutorial.
- Three 3x3 opening tables before the difficulty jump.
- 4x4 second table.
- 5x5 boss table against a fictional timbero.
- Ball draw and manual stamp.
- Timed bolillero with manual "otra bolilla" button.
- Each real table starts with a free opening ball that does not cut the multiplier.
- Fast stamps grant clear bonus points and fictional money.
- Horizontal lines grant points and money.
- Diagonals restore multiplier.
- Full board wins the table with `TIMBA!`.
- Each ball lowers the multiplier.
- At `x0.0`, the Parca wins.
- Kiosco de café between rounds.
- Kiosco offers 3 random cheats per visit, fixed until the next ball.
- Cheats: bolilla soplada, sello viudo, bajo la mesa, café doble, tinta corrida, acta quemada.
- Blackjack 21 as a quick side action for fictional money.
- Blackjack is embedded into the kiosk tray.
- Row/diagonal rewards flash on the board and show a payout banner.
- Boss table includes timed rival pressure and a cheating action.
- Permanent amulet shop between tables.
- Amulets can improve stamp points, row payouts, shop offers, fake-ball costs, decay, and starting money.
- Table contracts between wins add run-level tradeoffs.
- Local achievements, cosmetic unlock flags, and a persistent local top-10 leaderboard.
- Coded latino-noir table props and Parca pressure visuals.
- Procedural music, generated sound effects, and stronger win/loss overlays.

## Commands

```powershell
npm install
npm run dev
```

Local structure validation:

```powershell
npm run validate
```

Rule-only validation:

```powershell
npm run test:rules
```

## Direction

Keep the bingo board as the main game. The current side action is blackjack 21 for fictional table money; future side games should stay quick, optional, and feed the bingo economy and cheat system.

Ranking is local-only in this prototype. A real global board should wait for a backend that can validate runs instead of trusting client-side scores.
# TIMBA
