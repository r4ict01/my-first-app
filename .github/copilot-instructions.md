# Copilot instructions for `my-first-app`

## Project overview

This is a dependency-free browser game prototype named **Moonlight Runner**. It is a static site with three runtime files:

- `index.html` defines the Japanese UI shell, HUD, canvas, restart overlay, and touch controls.
- `style.css` owns the responsive neon/dark visual design and layout. It imports `DM Mono` and `Space Grotesk` from Google Fonts.
- `script.js` contains the complete game runtime: input handling, physics, collision detection, game state, scoring, particles, camera scrolling, and Canvas rendering.

The browser is the only runtime. `script.js` queries the DOM elements created by `index.html`, creates the stage state from in-file arrays, and renders a fixed 430-unit-tall virtual scene scaled to the responsive Canvas size. World coordinates are larger than the viewport; `camera` translates the world while a separate parallax mountain layer moves at a fraction of the camera speed.

## Commands

There is no `package.json`, build system, test runner, or linter configured in this repository. Do not invent `npm` scripts or install a framework for routine changes.

Useful checks for the current project:

```bash
# Validate JavaScript syntax
node --check script.js

# Check whitespace errors in the diff
git diff --check

# Run locally using any static HTTP server available in the environment
python3 -m http.server 8000
```

Open `http://localhost:8000/` after starting the server. There is currently no automated test command or single-test selector; validate gameplay changes manually in a browser. If a test or tooling setup is added later, document its exact commands here.

## Game architecture and conventions

- Keep the separation of concerns: semantic/UI structure in `index.html`, presentation in `style.css`, and gameplay/rendering in `script.js`. Avoid inline styles or inline event handlers.
- `script.js` is intentionally a single-file game loop. `requestAnimationFrame(loop)` calls `update(dt)` and then `draw()`. Keep simulation changes in `update` and Canvas-only changes in `draw`; use `dt` for time-based movement.
- Game state is reset through `reset()`. Mutable state such as `player`, `camera`, `score`, `lives`, `gameState`, and `particles` is reset there, while static stage data (`platforms`, `coins`, `enemies`, and `goal`) is declared once and restored by resetting each entity's mutable flags.
- Coordinates use a world origin at the upper-left, with positive `x` to the right and positive `y` downward. The player and enemies are rectangle-like objects with `x`, `y`, `w`, and `h`; use `rectsOverlap` for AABB collision checks.
- Canvas drawing uses a 430-unit virtual height. Preserve the `ctx.save()`/`ctx.restore()` and camera translation structure when adding world objects so UI-space/parallax drawing is not accidentally affected.
- Keyboard input is tracked in the shared `keys` object and normalized through `pressed(...)`. Touch buttons map to the same key names, so new actions should support both keyboard and touch paths when they are user-facing.
- End states are represented by `gameState` (`'playing'`, `'won'`, or `'lost'`) and displayed through the existing `message` overlay. Use `endGame(...)` rather than creating a second overlay or stopping the animation loop.
- HUD values are updated from gameplay state in `update()`. Preserve the existing score padding, heart display, and progress-bar behavior when changing scoring or progression.
- Static stage entities are plain objects with small, explicit fields. Add platforms, coins, enemies, or goal changes to their corresponding arrays rather than introducing a separate data format.
- The visual language uses CSS custom properties (`--purple`, `--cyan`, `--yellow`, etc.) and Canvas colors that match them. Reuse those established colors and the existing responsive breakpoint at `680px`.
- User-facing text is Japanese, while code identifiers and most Canvas comments/labels are English. Keep new UI copy in Japanese and keep identifiers consistent with the existing English naming.
- Copilotの説明・回答は日本語で表示すること。コード内の識別子や既存の英語ラベルは、必要がない限り変更しない。
- The game imports fonts remotely from Google Fonts, but gameplay must remain functional without the font request.
