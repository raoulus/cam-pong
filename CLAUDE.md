# Cam Pong — Claude Code Guide

## Project overview

Browser-based Pong game with webcam hand tracking. Two players control paddles by moving their hands in front of the camera. Fullscreen, heavy on visual/audio effects, designed to be fun and chaotic.

## Tech stack

- **Vanilla JS modules** (ES modules, no bundler, no framework)
- **MediaPipe Hands** via CDN for hand landmark detection
- **Canvas 2D** for all rendering
- **Web Audio API** for synthesized sound effects (no audio files)
- No build step — serve `index.html` directly

## Architecture

Single-page app with modular JS. Entry point is `js/game.js` loaded from `index.html`.

### Module responsibilities

| Module | Role |
|---|---|
| `config.js` | Constants, screen dimensions, scaling functions |
| `audio.js` | Sound engine: `playTone()`, `playNoise()`, all `sfx*()` functions |
| `particles.js` | Particle system with circle/rect types, confetti, fireworks |
| `effects.js` | Screen-level effects state: shake, flash, slow-mo, chromatic aberration, warp, zoom |
| `floating-text.js` | Animated text popups that float and fade |
| `hand-tracking.js` | MediaPipe setup, camera init, hand position extraction |
| `renderer.js` | All drawing: paddles, balls, HUD, game over screen. Exports `drawFrame()` |
| `game.js` | Game loop, state machine, physics, collision, scoring, chaos events, multi-ball |

### Data flow

- `game.js` owns all game state (players, balls, rally count, etc.)
- `game.js` calls `processHands()` to update paddle targets, `update()` for physics, `drawFrame()` for rendering
- Effects/particles/floating-text are fire-and-forget: spawn them and they self-manage via their update/draw cycles
- `config.js` exports mutable `CANVAS_W`/`CANVAS_H` updated on resize via `updateCanvasSize()`

### Game states

`waiting` → `countdown` → `playing` → `scored` → `countdown` → ... → `ended`

### Key design decisions

- Ball speed scales with `CANVAS_W / 120` so gameplay feels consistent across screen sizes
- Multi-ball: `balls[]` array, each with independent physics. Score only triggers when ALL balls exit
- Chaos events fire randomly during rallies >= 13, with a cooldown timer
- Paddle sizes are per-player (`p1.paddleH`, `p2.paddleH`) and reset on scoring
- Camera is mirrored (CSS `scaleX(-1)`) so movements feel natural. MediaPipe coordinates are inverted accordingly: camera-right → screen-left (P1)

## Development

```bash
npx serve .
# Open http://localhost:3000
```

No build, no install. All dependencies load from CDN. Works in Chrome/Edge (best GPU support for MediaPipe).

## Style conventions

- Vanilla JS, no TypeScript
- ES module imports/exports
- Functions over classes
- Constants in `config.js`, effects state in `effects.js`
- Sound functions prefixed `sfx*` in `audio.js`
- Spawn/update/draw pattern for particles and floating text
