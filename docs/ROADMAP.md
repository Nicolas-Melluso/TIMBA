# TIMBA! Roadmap

## v0.1.0 - Desktop vertical seed

Estado: completado como seed.

- Electron desktop shell.
- Phaser renderer with a playable 3x3 bingo board.
- Manual stamping when the called ball matches the board.
- Horizontal lines score points and money.
- Diagonals recover multiplier.
- Full board ends the table with TIMBA!
- Multiplicador countdown to x0.0 and Parca pressure visuals.
- Kiosco de café with 3 fixed offers by default, 4 with `wide-kiosk`.
- Blackjack 21 as a quick side action for fictional money.

## v0.2.0 - Better game feel

Estado: implementado como prototipo expandido inicial.

- Ball draw animation.
- Stamp animation and stronger feedback.
- Sound placeholders for ball, stamp, kiosk, blackjack, Parca.
- Clearer win/loss recap.
- Tighter 20-second kiosk pacing.

## v0.3.0 - Run structure

Estado: implementado como flujo jugable inicial.

- 2x2 interactive tutorial.
- 3x3 asylum table as first real level.
- 4x4 second table.
- 5x5 boss table.
- Fictional rival timbero.

## v0.4.0 - Build depth

Estado: parcialmente implementado.

- More cheats.
- Cursed numbers.
- Pattern shop.
- Boss rules that modify the ball cage.
- Transparent odds/debug panel.

## v0.5.0 - Next quality pass

Estado: parcialmente implementado.

- Better balancing for money, decay, and boss progress.
- Replace placeholder visuals with a coherent art direction.
- Add sound effects and music stubs.
- Add packaged desktop build when the prototype loop is stable.

## v0.6.0 - Mesa con identidad

Estado: implementado como primer pase.

- Kiosco now shows 3 random cheat offers instead of the full catalog.
- Cheat names and flavor text now lean into latino-noir table fiction.
- Table has coded props: coffee, receipts, ashtray, fluorescent lights.
- HUD has a stronger receipt/panel treatment and a visible no-real-money signal.
- Ball draw and stamping have stronger camera feedback.

## v0.7.0 - Polish target

Estado: implementado como primer pase.

- Blackjack is now embedded as a kiosk tray instead of a full overlay.
- Row and diagonal completions get visual highlights and reward text.
- The HUD now shows a small recent-ball cage.
- The boss table has an initial cheat action that dirties a cell and cuts multiplier.

## v0.8.0 - Stronger boss and feel

Estado: parcialmente implementado.

- Add 2-3 boss cheat variants.
- Add sound effects for ball, stamp, shop, blackjack, and Parca pressure.
- Replace code-only props with real art assets or a pixel/low-poly style pass.
- Add balance pass per table size.

## v0.9.0 - Run pacing and permanent bonuses

Estado: implementado como primer pase.

- The run now has three 3x3 tables before the 4x4 jump.
- Multiplier decay is softer in early pacing.
- Winning a table opens an amulet phase before the next table.
- Permanent bonuses can modify stamp scoring, row money, shop size, force-ball cost, decay, and starting money.
- Owned amulets appear as HUD badges.

## v1.0.0 - Demo target

Estado: en progreso.

- Timed bolillero with a manual next-ball button.
- Real tables open with a free first ball that does not lower the multiplier.
- Fast-stamp rewards make quick matching pay visible score and fictional money.
- HUD pass for clearer score, money, multiplier, timer, ball count, and recent calls.
- Kiosco timer/money clarity and cleaner return-to-table flow.
- Generated sound effects for ball, stamp, shop, rewards, win, and loss.
- Stronger win/loss overlays.

- Balance the full run around reachable boss attempts.
- Add richer boss cheat variants.
- Improve art direction beyond coded placeholders.
- Keep expanding animations and coded art direction.

## v1.1.0 - Visual hierarchy pass

Estado: implementado como primer pase.

- Reduced the logo/header weight so the board can lead the screen.
- Enlarged the bingo card and added a physical backing to make it feel like the main object.
- Reworked the right HUD into clearer economy, danger, round, bolillero, recent calls, and log blocks.
- Added a cleaner UI font for changing numbers and kept the serif mostly for brand/table flavor.
- Turned the tutorial prompt into a smaller contextual strip.
- Kept the art direction as tavern-noir with tactical HUD clarity instead of full casino UI.

## v1.2.0 - Art system and Parca pass

Estado: planificado.

- Reframe Parca as progressive presence pressure instead of constant full-screen threat.
- Treat mesa, cartón, and kiosco as physical table objects with readable material identity.
- Lock a closed palette for UI, table props, danger signaling, and reward moments.
- Upgrade sello/tinta to a premium stamping system with stronger impact and legibility.
- Add motion design pass for ball flow, stamp feedback, Parca escalation, and win/loss rhythm.

## v1.3.0 - Modularidad incremental

Estado: implementado como refactor base.

- Rule coverage expanded before refactor to lock current behavior.
- Shop and blackjack command branching moved into pure game helpers.
- Renderer theme, layout, UI primitives, timer refs, Parca effects, defeat silhouette, and reward toast extracted out of `TimbaScene`.
- `TimbaScene` remains the orchestration layer for Phaser events, timers, audio, and render flow.
- Next candidates: split screens by phase, extract full HUD rendering, add a renderer smoke test, and later separate domain state from UI/session flags.

## v1.4.0 - Game feel, claridad y builds

Estado: implementado como primer pase.

- Board hover previews now show valid stamps, invalid targets, quick rewards, row/diagonal/TIMBA opportunities, and directed-trap target feedback.
- The table action strip now makes the next-ball decision and current quick-stamp bonus more explicit.
- Kiosco copy, ticket labels, fixed-offer messaging, money state, and Blackjack payout text are clearer.
- Stamp actions now pulse the target cell and animate reward bursts for money/score feedback.
- HUD now shows useful balls remaining on the board and trims owned amulets cleanly.
- New permanent build amulets add fuzzy-stamp, quick-stamp, diagonal, blackjack, and kiosk-cost synergies.

## v1.5.0 - Procedural background music

Estado: implementado como primer pase.

- Added a low-volume procedural WebAudio music bed with no external audio assets.
- Music starts after the first player interaction to respect browser/Electron autoplay rules.
- Menu, table, kiosk, blackjack, and end states use different rhythmic/color layers.
- Parca danger adds darker drone hits as the multiplier approaches x0.0.
- Menu and HUD now expose a music on/off control persisted in local storage.

## v1.6.0 - Integration hardening

Estado: implementado como primer pase.

- Blackjack payout now has one canonical rule path shared by tests and runtime return flow.
- Kiosco locks the shop while Blackjack is active, so the player cannot mutate offers mid-hand.
- Boss pressure and multiplier decay are tuned toward reachable boss attempts instead of an impossible fuse.
- Audio timers and WebAudio contexts now clean up on Phaser scene shutdown/destroy.
- Build preload path now targets the generated `out/preload/index.mjs` artifact.
- Rule tests cover kiosk leave, directed shop action payment, immediate shop effects, Blackjack payouts, and boss balance guards.
- Validation no longer depends on bare `npm` being available on `PATH`.
- Copy pass fixed visible mojibake, several Spanish labels, and no-real-money messaging in the kiosk.

## v1.7.0 - Audio/Parca/visual pressure pass

Estado: implementado como primer pase (no final).

- Added a first cohesive pass for table audio feedback and Parca pressure layering.
- Tightened Parca escalation readability so danger rises without burying board clarity.
- Improved visual feedback rhythm for pressure moments, rewards, and state transitions.
- Kept this slice as baseline quality lift pending a deeper polish pass and playtest tuning.

## v1.8.0 - Rejugabilidad, logros y ranking local

Estado: implementado como primer pase.

- Added local profile persistence for achievements and cosmetic unlock flags.
- Added achievement toasts and menu progress for foundational milestones.
- Added table contracts between wins so a run can pick rule-changing tradeoffs.
- Contracts can alter next-table money, multiplier, Parca decay, shop offer count, shop costs, row payouts, and diagonal multiplier rewards.
- Added local top-10 leaderboard and end-run recap with leaderboard score and rank.
- Kept global ranking as a future verified-run backend feature instead of faking online competition.
- Rule tests now cover contracts, profile persistence, achievement idempotency, and leaderboard ordering.

## v1.9.0 - Agentic +1 quality pass

Estado: implementado y revisado por subagentes.

- Ran 12 focused improvement passes across sound, Parca, aesthetics, core gameplay, replayability, achievements, ranking, modularity, HUD clarity, balance, tutorial, and game feel.
- Ran reviewer passes for the same areas and iterated the failed areas instead of accepting partial work.
- Parca now has a dedicated animated layer, threshold alerts, stronger silhouette motion, and safer cue reset across menu, kiosk, blackjack, contracts, and table transitions.
- Music ducking now uses active request expirations, so a short cue no longer cancels a longer dramatic cue early.
- The HUD now shows live rank, current leaderboard score, next-rank delta, clearer meta chips, no reward/achievement toast collision, and ASCII-safe visible copy.
- The tutorial now highlights the exact target cell and uses copy that separates button hints from board actions.
- Achievements now surface recent unlocks, category progress, achievement points, and visible cosmetic chips/borders instead of remaining invisible metadata.
- Ranking now includes live local chase during the run plus terminal recap after the run.
- Tests cover the full-board clutch reward at the x0.8 threshold.

## v1.10.0 - Focused agent recuts

Estado: implementado como recorte aceptado, sin los items postergados.

- Added Parca Mark as a readable low-multiplier board threat: one temporary marked cell, wardable by clicking it, with a small penalty if ignored.
- Kept dirty cells visual-only in this slice; dirty payout mechanics remain postponed.
- Tightened HUD density by replacing three meta chips with one pressure/status strip and reducing bonus badge noise.
- Added small material texture passes to felt and paper so the table reads less flat without adding external assets.
- Refined procedural music into three macro identities: menu, table-side play, and end states, with kiosk/blackjack as table detours.
- Moved row/full-board money rewards into table config so economy tuning is visible and testable.
- Extracted small screen/render helper modules without changing gameplay orchestration yet.
- Added tests for configured payouts and Parca Mark spawn, ward, expiry, stamp recovery, tutorial blocking, and free-opening blocking.
- Postponed larger systems: global ranking backend, collection drawer, persistent archetype inventory, and dirty-score economy.

## v1.11.0 - Art, Parca and micro-animation pass

Estado: implementado como pase visual/jugable con agentes; requiere playtest manual final.

- Researched usable/reference/cheap assets for tabletop casino UI, Parca/reaper, sound and motion; immediate implementation stayed code-generated to avoid licensing churn.
- Added procedural casino surfaces for wood, felt, paper, card faces, tickets, rivets and ball materials.
- Improved table readability and physicality with richer props, cleaner bolillero treatment, more intentional kiosk tickets and denser but themed HUD surfaces.
- Rebuilt Parca pressure as a peripheral threat: hood, hand, scythe, omen, stronger terminal silhouette and victory break without intentionally covering the board center.
- Made Parca Mark more explicit with aura, stamp/cross treatment and HUD pulse.
- Added non-blocking microanimations for ball drop, stamp impact, pattern sweep, HUD reward pop and kiosk entrance.
- Fixed review findings: Parca Mark aura no longer creates infinite repeat tweens per render, and Blackjack now shows overflow when a hand has more cards than fit.
- Validation passed with TypeScript, structure checks, rule tests and production build.

## v1.12.0 - All-area agent quality pass

Estado: implementado con 12 agentes por area, revision critica y fixes de cierre.

- Art/UI: richer felt, wood, paper and ball materials without adding licensed external assets.
- Parca: pressure is safer and more peripheral, with board readability protected from large center occlusion.
- Animation/game feel: stamp, ball, kiosk and reward animations are shorter, less noisy and less blocking.
- HUD/clarity: the right panel now explains fictional money, Parca mark risk, useful balls, rank chase and live score more directly.
- Sound/music: procedural tracks and SFX have clearer identities, softer harshness and better cue separation.
- Core gameplay: called-ball feedback now says whether the ball is useful and invalid stamps explain why they failed.
- Balance/economy: later tables pay slightly better and tests lock payout progression.
- Achievements/unlockables: expanded catalog now has real runtime triggers for rows, clutch TIMBA, kiosk visits, blackjack streaks, Parca wards, contracts and amulet collection.
- Ranking/score: v3 scoring now exposes richer score components; menu grade now comes from score quality, not merely local rank.
- Tutorial/onboarding: copy is action-led and tests cover guided progression.
- Modularity: board metrics moved into a pure layout helper and structure validation now covers the newer UI/game helper modules.
- Longevity/replayability: added two new table contracts, `Hora de visita` and `Juramento del asilo`, with tests for tags and effects.
- Validation passed with TypeScript, structure checks, rule tests, diff whitespace check and production build.

## v1.13.0 - Polish, volume, score chase and packaging plan

Estado: implementado con agentes por area y revision critica; packaging queda documentado, no instalado.

- Art/UI: generated surfaces now clamp inner shapes to reduce visual overlaps in compact cards/tickets/frames.
- Parca: approach staging is smoother and more peripheral, so the threat reads as arriving over time instead of suddenly appearing.
- Animation/game feel: stamp, ball, kiosk and floating reward feedback were tightened to reduce long overlays in a fast game.
- HUD/clarity: text primitives and chips gained safer spacing/line treatment, and the in-game HUD now exposes volume controls.
- Sound/music: added shared volume settings, persisted master volume and APIs for music/SFX volume multipliers.
- Core gameplay: called-ball feedback now distinguishes `not on card` from `already stamped`.
- Balance/economy: early/mid tables and key kiosk items are slightly more affordable, preserving Parca decay.
- Achievements/unlockables: hints are more concrete, clutch TIMBA is visible, and trigger helpers dedupe/cover first contracts more robustly.
- Ranking/score: score version moved to v4 with local target-score chase helpers and durable normalized leaderboard persistence on load.
- Tutorial/onboarding: added a pure coverage guide for first-time-player onboarding across kiosk, directed cheats, Parca, blackjack, contracts, upgrades, win and loss.
- Modularity: added pure HUD readout helpers and validation coverage for newer helper modules.
- Longevity/replayability: added typed data for run archetypes, build identities, secret hooks and future bosses as groundwork for deeper runs.
- Packaging: added `docs/PACKAGING.md` with the Windows installer/portable plan; `electron-builder` remains the next dependency before producing a friend-ready `.exe`.
- Validation passed with TypeScript, structure checks, rule tests and diff whitespace check; production build still required for final close.

## v1.14.0 - Tester packaging and playtest shell

Estado: implementado como primer pase post `.exe` compartible.

- Checkpoint local creado para la version empaquetable: `checkpoint: timba packaged tester build`.
- `electron-builder` agregado al repo con targets Windows `portable` y `nsis`.
- Artefactos locales generados para testers: `dist/TIMBA-Portable-0.2.0-x64.exe` y `dist/TIMBA-Setup-0.2.0-x64.exe`.
- Build elevado a `0.2.0` para la siguiente tanda de playtest.
- Menu inicial ahora muestra etiqueta de build, nota de tester local, chips de estado offline y controles de volumen mas integrados.
- Agregado reset local seguro de progreso/ranking desde el menu con confirmacion de dos pasos.
- HUD muestra version de build durante partida para identificar capturas y feedback de testers.
- Toast de logros acortado y compactado para que bloquee menos en runs rapidas.
- Validacion final: `npm run validate`, `tsc --noEmit`, `npm run dist -- --publish never` y smoke del portable `0.2.0` con ventana `TIMBA!` visible.
- Pendiente posterior: icono real, firma digital, smoke visual automatizado y pase fuerte de contenido.

## Agent score snapshot (post v1.13)

- Sound/music: approx 7.1 -> 7.2. Real volume control landed; music content itself still needs authored themes.
- Parca presence and pressure: approx 6.9 -> 7.2. Better staged arrival, still not a full antagonist behavior system.
- Aesthetics and visual coherence: approx 7.4 -> 7.7. Fewer procedural overlap bugs, still code-generated.
- Core gameplay: approx 8.2 -> 8.3. Feedback clarity improved without changing the core loop.
- Longevidad/replayability: approx 7.2 -> 7.4. Stronger data groundwork; still needs visible run archetypes/bosses in gameplay.
- Logros/desbloqueables: approx 7.0 -> 7.2. Clearer and more robust, still missing a real collection screen.
- Ranking/score chase: approx 5.8 -> 6.4. Local target chase is a real step; global ranking remains absent.
- Technical modularity: approx 7.0 -> 7.1. New helpers are useful, but `TimbaScene` still owns the orchestration surface.
- HUD clarity: approx 7.5 -> 7.8. Volume controls and text spacing help; panel density remains a risk.
- Balance/economy: approx 7.7 -> 7.9. More breathable economy without reducing base pressure.
- Tutorial/onboarding: approx 8.1 -> 8.1. Coverage guide exists, but runtime tutorial did not expand yet.
- Game feel/animations: approx 7.5 -> 7.8. Snappier and less intrusive, still needs authored motion beats.
- Packaging readiness: approx 3.0 -> 3.0. Plan exists; executable output requires adding `electron-builder`.
- Overall prototype quality: approx 7.3 -> 7.5. Meaningful polish, but the next large jump needs visible content depth and a real art/audio production pass.
- Next candidate areas: integrate tutorial coverage into playable first-run onboarding, surface run archetypes/builds, add collection screen, implement electron-builder packaging, and run screenshot-based visual smoke tests.

## Product rules

- No real-money gambling.
- No premium currency.
- All money is fictional table money.
- Side games feed the bingo board instead of becoming separate full games.
- The core fantasy is cheating the bingo table before the Parca reaches x0.0.
