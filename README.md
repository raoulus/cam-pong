# Cam Pong

**[Play it here](https://raoulus.github.io/cam-pong/)**

Browser-based Pong game controlled by hand tracking via your webcam. Fullscreen, over-the-top effects, multi-ball chaos — designed to make kids flip out.

Two players stand in front of the camera — the left half of the screen controls Player 1 (red), the right half controls Player 2 (blue). Move your hand up and down to move your paddle.

## How to play

1. Serve the project locally:
   ```bash
   npx serve .
   ```
2. Open `http://localhost:3000` in your browser (fullscreen recommended)
3. Click **START** and allow camera access
4. Each player raises a hand in their half of the camera view
5. First to 5 points wins

## Controls

- **Camera** — move your hand vertically to control your paddle
- **Keyboard fallback** — W/S for Player 1, Arrow Up/Down for Player 2
- **Space** — restart after game over

## Gameplay features

- **Fullscreen** with camera feed as background
- **Ball speeds up** on every hit, with visual intensity escalation (color shift, trails, speed lines, glow rings)
- **Rally counter** with combo milestones (NICE RALLY!, ON FIRE!, UNSTOPPABLE!, LEGENDARY!!, etc.)
- **Chaos mode** (rally 13+) — random events every few seconds:
  - Gravity shifts (ball curves up/down)
  - Big/tiny paddle (one player gets a size change)
  - Speed boosts
  - Screen wobble
- **Multi-ball** (rally 25+) — ball splits into two, point scores when all balls exit
- **Match point** warning with dramatic sound

## Effects

- Screen shake, flash, and chromatic aberration on hits/goals
- Slow motion on scoring with zoom punch
- Particle explosions, confetti, and fireworks
- Floating text popups for combos, scores, and events
- Ball trail with rainbow color cycling at high speed
- All sounds synthesized via Web Audio API (no audio files)
- Stereo panning based on ball/paddle position

## Tech

- [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) for real-time hand tracking (runs in-browser via WebAssembly/WebGL)
- Canvas API for rendering
- Web Audio API for all sound effects
- Vanilla JS modules, no build step, no dependencies to install

## Project structure

```
index.html          — HTML shell, styles, loads game module
js/
  config.js         — game constants, screen scaling
  audio.js          — Web Audio sound engine and all SFX
  particles.js      — particle system (sparks, confetti, fireworks)
  effects.js        — screen effects (shake, flash, slow-mo, warp, zoom)
  floating-text.js  — animated text popups
  hand-tracking.js  — MediaPipe camera + hand detection
  renderer.js       — all canvas drawing (paddles, ball, HUD, game over)
  game.js           — game loop, state, physics, scoring, chaos events
```
