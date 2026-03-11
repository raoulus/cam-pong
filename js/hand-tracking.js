import { HandLandmarker, FilesetResolver } from
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs';

let handLandmarker = null;

// Persistence: keep last known position for a grace period when tracking drops
const GRACE_FRAMES = 20; // ~0.6s at 30fps detection rate
let p1Grace = 0;
let p2Grace = 0;

export async function setupCamera(video, statusEl) {
  statusEl.textContent = 'Requesting camera access...';
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
  });
  video.srcObject = stream;
  await new Promise(r => video.onloadedmetadata = r);
  await video.play();
  statusEl.textContent = 'Camera ready.';
}

export async function setupHandTracking(statusEl) {
  statusEl.textContent = 'Loading hand tracking model...';
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
  );
  const options = {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.4,
    minHandPresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  };
  try {
    handLandmarker = await HandLandmarker.createFromOptions(vision, options);
  } catch (gpuErr) {
    console.warn('GPU delegate failed, falling back to CPU:', gpuErr);
    statusEl.textContent = 'Loading hand tracking (CPU fallback)...';
    options.baseOptions.delegate = 'CPU';
    handLandmarker = await HandLandmarker.createFromOptions(vision, options);
  }
  statusEl.textContent = 'Hand tracking ready.';
}

function countFingers(lm) {
  let count = 0;

  // Thumb: check if tip (4) is laterally extended compared to IP joint (3)
  // Use wrist (0) as reference — thumb tip should be further from palm center
  const palmCenterX = (lm[0].x + lm[9].x) / 2;
  const thumbTipDist = Math.abs(lm[4].x - palmCenterX);
  const thumbIpDist = Math.abs(lm[3].x - palmCenterX);
  if (thumbTipDist > thumbIpDist) count++;

  // Index: tip (8) above PIP (6) — lower Y value = higher on screen
  if (lm[8].y < lm[6].y) count++;
  // Middle: tip (12) above PIP (10)
  if (lm[12].y < lm[10].y) count++;
  // Ring: tip (16) above PIP (14)
  if (lm[16].y < lm[14].y) count++;
  // Pinky: tip (20) above PIP (18)
  if (lm[20].y < lm[18].y) count++;

  return count;
}

export function processHands(video, timestamp, p1, p2, canvasH, mode) {
  if (!handLandmarker) return;
  const results = handLandmarker.detectForVideo(video, timestamp);

  let p1Found = false;
  let p2Found = false;

  if (results.landmarks) {
    for (const lm of results.landmarks) {
      // Average wrist (0) and middle finger MCP (9) for more stable Y tracking
      const wristX = lm[0].x;
      const avgY = (lm[0].y + lm[9].y) / 2;
      const paddleY = avgY * canvasH;

      if (mode === 'fingers') {
        const fingers = countFingers(lm);
        if (wristX >= 0.5) {
          p1.fingerCount = fingers;
          p1Found = true;
          p1Grace = GRACE_FRAMES;
        } else {
          p2.fingerCount = fingers;
          p2Found = true;
          p2Grace = GRACE_FRAMES;
        }
      } else {
        if (wristX >= 0.5) {
          p1.targetY = paddleY;
          p1Found = true;
          p1Grace = GRACE_FRAMES;
        } else {
          p2.targetY = paddleY;
          p2Found = true;
          p2Grace = GRACE_FRAMES;
        }
      }
    }
  }

  // Grace period: keep detected=true for a few frames after losing tracking
  // so brief dropouts don't flash "no hand" and paddle keeps its position
  if (p1Found) {
    p1.detected = true;
  } else {
    p1Grace--;
    p1.detected = p1Grace > 0;
  }

  if (p2Found) {
    p2.detected = true;
  } else {
    p2Grace--;
    p2.detected = p2Grace > 0;
  }
}
