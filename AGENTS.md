# TIMBA! Agent Guide

## Scope And Ownership

- This guide is for documentation-first planning and execution support.
- Respect concurrent work: do not revert or overwrite unrelated changes.
- Keep changes minimal, explicit, and easy to validate.

## Practical SDD

Use this lightweight Spec-Driven Development template before medium/high-impact slices:

1. Problem and user-visible goal.
2. Scope: in and out for this slice.
3. Product constraints that cannot be broken.
4. Proposed implementation notes and affected systems.
5. Validation plan with exact commands and manual checks.
6. Acceptance criteria as binary pass/fail checks.
7. Roadmap or checkpoint impact.

## Product Vision

TIMBA! is a fast tabletop bingo-cheat experience where pressure rises as Parca approaches x0.0. The game should feel physical, readable, and stylish, with fictional money only and side systems that reinforce the core board loop.

## Product Rules

- No real-money gambling.
- No premium currency.
- All money is fictional table money.
- Side games and systems must feed the main board loop.
- Parca pressure must increase tension without hiding readability.

## Architecture

- `src/main`: Electron main process and window lifecycle.
- `src/preload`: Safe bridge between renderer and desktop APIs.
- `src/renderer`: Phaser gameplay loop, UI/HUD, board state, kiosk/side interactions, and Parca feedback.
- `docs/`: Roadmap, checkpoints, and product-direction documentation.
- `scripts/`: Validation and rule-test scripts.

## Workflow

1. Read active roadmap version and product rules.
2. Write or refresh mini SDD for the next slice.
3. Implement the smallest shippable change set.
4. Run targeted checks, then a quick end-to-end smoke test.
5. Log result in roadmap/checkpoint docs with exact status.

## Common Commands

- Install deps: `npm install`
- Dev app: `npm run dev`
- Build app: `npm run build`
- Validate structure and rules: `npm run validate`
- Rule-only tests: `npm run test:rules`

## Acceptance Criteria

- The slice matches the declared SDD scope.
- Product rules remain intact.
- No regression in the core board loop.
- Visual/gameplay changes are observable in a dev run.
- Roadmap/checkpoint docs reflect real status.

## Frequent Prompts And Intent Distribution

- Implementacion directa / `PLEASE IMPLEMENT THIS PLAN`: 25%
- Levantar / probar / debug: 15%
- Feedback playtest visual/jugable: 25%
- Ideacion / direccion de producto: 15%
- Roadmap / checkpoints / git / docs: 12%
- Meta-agente / AGENTS / SDD / prompts: 8%

## Reusable Prompts

- Implementar plan:
  - "PLEASE IMPLEMENT THIS PLAN. Alcance: <slice>. No cambies fuera de <files>. Cierra con validacion y pendientes."
- Levantar proyecto:
  - "Levanta el proyecto en modo dev, confirma que abre y lista bloqueos reales con pasos de fix."
- Checkpoint:
  - "Genera checkpoint vX.Y.Z con: que cambio, que falta, como probarlo, y riesgos."
- Playtest feedback:
  - "Hace playtest visual/jugable del loop principal y devolve hallazgos priorizados (claridad, ritmo, friccion, feedback)."
- Explorar con subagentes:
  - "Usa subagentes para mapear <tema> en paralelo, con ownership por archivo y reporte consolidado accionable."
- Actualizar roadmap/AGENTS:
  - "Actualiza `docs/ROADMAP.md` y `AGENTS.md` para reflejar estado real, sin inflar avances."
- Cerrar slice con validacion:
  - "Cerra el slice con checklist de aceptacion, comandos corridos, resultado observado y proximo paso concreto."
