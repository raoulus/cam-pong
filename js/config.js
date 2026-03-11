export let CANVAS_W = window.innerWidth;
export let CANVAS_H = window.innerHeight;

export const PADDLE_W = 24;
export const PADDLE_H = 160;
export const BALL_R = 11;
export const PADDLE_MARGIN = 40;
export const WIN_SCORE = 5;
export const SMOOTHING = 0.25;
export const TRAIL_LENGTH = 18;
export const FINGER_ZONES = 5;

// Ball speed scales with screen width so it feels consistent across resolutions
export function baseSpeed() {
  return CANVAS_W / 200; // ~9.6 at 1920px, ~7 at 1440px
}

export const COMBO_MESSAGES = [
  { at: 5, text: 'NICE RALLY!', color: '#ffff44', size: 28 },
  { at: 8, text: 'GETTING HOT!', color: '#ffaa00', size: 32 },
  { at: 10, text: 'MULTIBALL!!!', color: '#00ffff', size: 46 },
  { at: 13, text: 'CHAOS MODE!', color: '#ff4400', size: 38 },
  { at: 15, text: 'UNSTOPPABLE!', color: '#ff4400', size: 40 },
  { at: 20, text: 'LEGENDARY!!', color: '#ff00ff', size: 48 },
  { at: 25, text: 'ARE YOU KIDDING?!', color: '#00ffff', size: 52 },
  { at: 40, text: 'IMPOSSIBLE!!!', color: '#fff', size: 56 },
];

// Chaos thresholds
export const CHAOS_RALLY = 13;     // random events start
export const MULTIBALL_RALLY = 10; // ball splits

export function updateCanvasSize() {
  CANVAS_W = window.innerWidth;
  CANVAS_H = window.innerHeight;
}
