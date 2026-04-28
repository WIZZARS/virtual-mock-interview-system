import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ─── Feedback category types ───────────────────────────────────────
export type FeedbackCategory = 
  | 'eye_contact' 
  | 'posture' 
  | 'head_tilt' 
  | 'expression' 
  | 'proximity' 
  | 'fidgeting'
  | 'positive'
  | 'face_missing';

export interface CoachingTip {
  category: FeedbackCategory;
  message: string;
  severity: 'info' | 'warning' | 'success';
}

// ─── Tip pools: randomized per detection for variety ──────────────
const EYE_CONTACT_TIPS: string[] = [
  "Your eyes drifted away — try to look directly at the camera lens.",
  "Maintain steady eye contact with the camera to show confidence.",
  "You seem to be looking to the side. Bring your gaze back to the camera.",
  "Great interviewers keep their eyes focused. ReCenter on the lens.",
  "Your eyes wandered — imagine the camera is your interviewer's face.",
  "Looking away can signal uncertainty. Lock eyes with the camera.",
];

const POSTURE_TIPS: string[] = [
  "You're slouching — sit up tall with your shoulders back.",
  "Straighten your posture. Good posture projects confidence.",
  "Your head is tilted down. Lift your chin and sit upright.",
  "Leaning too far forward. Sit back with a straight spine.",
  "Your posture dipped — roll your shoulders back and sit tall.",
  "Keep your back straight. Posture impacts how confident you appear.",
];

const HEAD_TILT_TIPS: string[] = [
  "Your head is tilting to one side — try to keep it level.",
  "Straighten your head. A tilted head can look uncertain.",
  "Keep your head centered and balanced for a professional look.",
  "Your head is leaning — align it with your shoulders.",
];

const EXPRESSION_TIPS: string[] = [
  "You look tense — try to relax your facial muscles and smile gently.",
  "A slight smile shows warmth. You seem a bit stiff right now.",
  "Relax your jaw and eyebrows. You appear stressed.",
  "Soften your expression — a calm face conveys confidence.",
];

const TOO_CLOSE_TIPS: string[] = [
  "You're too close to the camera. Lean back a little.",
  "Move back slightly — your face is filling too much of the frame.",
  "Adjust your distance. Ideal framing shows your head and shoulders.",
];

const TOO_FAR_TIPS: string[] = [
  "Move a little closer to the camera — you seem far away.",
  "You're too far from the camera. Lean in slightly for better presence.",
  "Get closer to the camera so the interviewer can see you clearly.",
];

const FIDGETING_TIPS: string[] = [
  "Your head is moving a lot — try to stay still while speaking.",
  "Minimize excessive head movement. Stillness shows composure.",
  "You seem fidgety. Take a breath and steady yourself.",
  "Reduce head bobbing — smooth, calm movements look more professional.",
];

const FACE_MISSING_TIPS: string[] = [
  "Your face isn't visible. Make sure you're centered in the camera frame.",
  "I can't detect your face. Adjust your position or lighting.",
  "Move into the camera's view — your face is out of frame.",
];

const POSITIVE_TIPS: string[] = [
  "Great job! Your eye contact and posture look excellent right now. 👏",
  "You're doing amazing — confident posture and steady eye contact! ✨",
  "Fantastic body language! Keep this up throughout the interview.",
  "Your composure is on point. This is exactly what interviewers want to see.",
  "Wonderful presence! You look calm, focused, and professional.",
  "Excellent form — you look like a natural. Keep going! 🔥",
  "You're nailing the non-verbal cues. Great work maintaining focus!",
  "Perfect posture and eye contact streak! You're in the zone. 💪",
];

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Main hook ────────────────────────────────────────────────────
export function useVisionTracker(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Scoring metrics
  const sessionStats = useRef({
    totalFrames: 0,
    goodEyeContactFrames: 0,
    goodPostureFrames: 0,
  });

  // Streak tracking for intelligent feedback timing
  const streaks = useRef({
    consecutiveBadEyeContact: 0,
    consecutiveBadPosture: 0,
    consecutiveHeadTilt: 0,
    consecutiveTense: 0,
    consecutiveTooClose: 0,
    consecutiveTooFar: 0,
    consecutiveFidget: 0,
    consecutiveGood: 0,        // frames with everything looking great
    consecutiveFaceMissing: 0,
  });

  // Track recent head positions for fidget detection
  const recentHeadPositions = useRef<{ x: number; y: number }[]>([]);
  
  // Debounce: per-category cooldowns (different behaviours get independent timers)
  const lastAlertByCategory = useRef<Record<string, number>>({});
  
  // Track which tips were already given to avoid exact repeats in same session
  const givenTips = useRef<Set<string>>(new Set());
  
  // Counter for positive reinforcement pacing
  const lastPositiveTime = useRef<number>(0);

  // Initialize MediaPipe
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        
        if (active) {
            landmarkerRef.current = faceLandmarker;
            setIsReady(true);
            console.log("✅ MediaPipe Vision AI Engine Loaded — advanced coaching active.");
        }
      } catch (err) {
        console.error("Vision AI failed to load:", err);
      }
    };
    init();
    return () => { active = false; };
  }, []);

  // Helper: emit a tip with category-based cooldown
  const emitTip = useCallback((
    category: FeedbackCategory, 
    severity: CoachingTip['severity'], 
    pool: string[], 
    cooldownMs: number,
    onFeedback: (tip: CoachingTip) => void
  ) => {
    const now = performance.now();
    const lastTime = lastAlertByCategory.current[category] || 0;
    
    if (now - lastTime < cooldownMs) return; // still in cooldown
    
    // Pick a tip that hasn't been given yet (if possible)
    let message: string;
    const unused = pool.filter(t => !givenTips.current.has(t));
    if (unused.length > 0) {
      message = pickRandom(unused);
    } else {
      // All tips used — reset and pick fresh
      pool.forEach(t => givenTips.current.delete(t));
      message = pickRandom(pool);
    }
    
    givenTips.current.add(message);
    lastAlertByCategory.current[category] = now;
    onFeedback({ category, message, severity });
  }, []);

  const analyzeVideoFrame = useCallback((onFeedback: (tip: CoachingTip) => void) => {
    if (!landmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) return;

    try {
        const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        
        // ── No face detected ──────────────────────────────────────
        if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) {
            streaks.current.consecutiveFaceMissing++;
            // Alert after ~2 seconds of missing face (20 frames at 100ms interval)
            if (streaks.current.consecutiveFaceMissing > 20) {
              emitTip('face_missing', 'warning', FACE_MISSING_TIPS, 15000, onFeedback);
            }
            return;
        }
        
        streaks.current.consecutiveFaceMissing = 0;
        sessionStats.current.totalFrames++;
        
        const shapes = results.faceBlendshapes[0].categories;
        const getShape = (name: string): number => 
          shapes.find(s => s.categoryName === name)?.score || 0;
        
        // ══════════════════════════════════════════════════════════
        // 1. EYE CONTACT DETECTION
        // ══════════════════════════════════════════════════════════
        const lookOutLeft = getShape('eyeLookOutLeft');
        const lookInLeft = getShape('eyeLookInLeft');
        const lookOutRight = getShape('eyeLookOutRight');
        const lookInRight = getShape('eyeLookInRight');
        const lookUp = getShape('eyeLookUpLeft');
        const lookDown = getShape('eyeLookDownLeft');
        
        const eyeDrift = Math.max(lookOutLeft, lookInLeft, lookOutRight, lookInRight, lookUp, lookDown);
        const isLookingAway = eyeDrift > 0.45;
        
        if (isLookingAway) {
          streaks.current.consecutiveBadEyeContact++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveBadEyeContact = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // 2. POSTURE / SLOUCH DETECTION (via face landmarks)
        // ══════════════════════════════════════════════════════════
        let isSlouching = false;
        let headTiltAngle = 0;
        let faceSize = 0; // for proximity detection
        
        if (results.faceLandmarks && results.faceLandmarks[0]) {
           const landmarks = results.faceLandmarks[0];
           const topHead = landmarks[10];
           const chin = landmarks[152];
           const leftCheek = landmarks[234];
           const rightCheek = landmarks[454];
           const nose = landmarks[1];
           
           // Slouch: chin.z much further than topHead.z
           const zDiff = chin.z - topHead.z;
           if (zDiff > 0.045) {
               isSlouching = true;
           }
           
           // Head tilt: compare Y positions of left and right cheeks
           const yDiff = Math.abs(leftCheek.y - rightCheek.y);
           headTiltAngle = yDiff;
           
           // Proximity: face bounding box size (distance between cheeks as proxy)
           const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
           const faceHeight = Math.abs(chin.y - topHead.y);
           faceSize = faceWidth * faceHeight;
           
           // Track head position for fidget detection
           recentHeadPositions.current.push({ x: nose.x, y: nose.y });
           if (recentHeadPositions.current.length > 30) { // ~3 seconds of data
             recentHeadPositions.current.shift();
           }
        }
        
        if (isSlouching) {
          streaks.current.consecutiveBadPosture++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveBadPosture = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // 3. HEAD TILT DETECTION
        // ══════════════════════════════════════════════════════════
        const isHeadTilted = headTiltAngle > 0.04;
        
        if (isHeadTilted) {
          streaks.current.consecutiveHeadTilt++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveHeadTilt = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // 4. FACIAL EXPRESSION / TENSION DETECTION
        // ══════════════════════════════════════════════════════════
        const browDownLeft = getShape('browDownLeft');
        const browDownRight = getShape('browDownRight');
        const jawOpen = getShape('jawOpen');
        const mouthFrownLeft = getShape('mouthFrownLeft');
        const mouthFrownRight = getShape('mouthFrownRight');
        const eyeSquintLeft = getShape('eyeSquintLeft');
        const eyeSquintRight = getShape('eyeSquintRight');
        
        const tensionScore = (browDownLeft + browDownRight) / 2 
                           + (mouthFrownLeft + mouthFrownRight) / 2
                           + (eyeSquintLeft + eyeSquintRight) / 4;
        
        const isTense = tensionScore > 0.6;
        
        if (isTense) {
          streaks.current.consecutiveTense++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveTense = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // 5. PROXIMITY DETECTION (too close / too far)
        // ══════════════════════════════════════════════════════════
        const isTooClose = faceSize > 0.18;
        const isTooFar = faceSize > 0 && faceSize < 0.03;
        
        if (isTooClose) {
          streaks.current.consecutiveTooClose++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveTooClose = 0;
        }
        
        if (isTooFar) {
          streaks.current.consecutiveTooFar++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveTooFar = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // 6. FIDGET / EXCESSIVE MOVEMENT DETECTION
        // ══════════════════════════════════════════════════════════
        let isFidgeting = false;
        if (recentHeadPositions.current.length >= 15) {
          const positions = recentHeadPositions.current;
          let totalMovement = 0;
          for (let i = 1; i < positions.length; i++) {
            totalMovement += Math.abs(positions[i].x - positions[i-1].x) 
                           + Math.abs(positions[i].y - positions[i-1].y);
          }
          const avgMovement = totalMovement / positions.length;
          isFidgeting = avgMovement > 0.008;
        }
        
        if (isFidgeting) {
          streaks.current.consecutiveFidget++;
          streaks.current.consecutiveGood = 0;
        } else {
          streaks.current.consecutiveFidget = 0;
        }
        
        // ══════════════════════════════════════════════════════════
        // SCORING
        // ══════════════════════════════════════════════════════════
        if (!isLookingAway) sessionStats.current.goodEyeContactFrames++;
        if (!isSlouching) sessionStats.current.goodPostureFrames++;
        
        // ══════════════════════════════════════════════════════════
        // INTELLIGENT FEEDBACK EMISSION
        // Require sustained bad behavior (streak) before alerting
        // Each category has independent cooldown timers
        // ══════════════════════════════════════════════════════════
        const STREAK_THRESHOLD = 15; // ~1.5s of sustained bad behavior at 100ms intervals
        const COOLDOWN_MS = 12000;   // 12s cooldown per category
        
        if (streaks.current.consecutiveBadEyeContact > STREAK_THRESHOLD) {
          emitTip('eye_contact', 'warning', EYE_CONTACT_TIPS, COOLDOWN_MS, onFeedback);
        }
        
        if (streaks.current.consecutiveBadPosture > STREAK_THRESHOLD) {
          emitTip('posture', 'warning', POSTURE_TIPS, COOLDOWN_MS, onFeedback);
        }
        
        if (streaks.current.consecutiveHeadTilt > STREAK_THRESHOLD + 5) {
          emitTip('head_tilt', 'info', HEAD_TILT_TIPS, 20000, onFeedback);
        }
        
        if (streaks.current.consecutiveTense > STREAK_THRESHOLD + 10) {
          emitTip('expression', 'info', EXPRESSION_TIPS, 25000, onFeedback);
        }
        
        if (streaks.current.consecutiveTooClose > STREAK_THRESHOLD) {
          emitTip('proximity', 'info', TOO_CLOSE_TIPS, 20000, onFeedback);
        }
        
        if (streaks.current.consecutiveTooFar > STREAK_THRESHOLD) {
          emitTip('proximity', 'info', TOO_FAR_TIPS, 20000, onFeedback);
        }
        
        if (streaks.current.consecutiveFidget > STREAK_THRESHOLD + 10) {
          emitTip('fidgeting', 'warning', FIDGETING_TIPS, 20000, onFeedback);
        }
        
        // ══════════════════════════════════════════════════════════
        // POSITIVE REINFORCEMENT
        // If everything is good for a sustained streak, give praise
        // ══════════════════════════════════════════════════════════
        const everythingGood = !isLookingAway && !isSlouching && !isHeadTilted 
                             && !isTense && !isTooClose && !isTooFar && !isFidgeting;
        
        if (everythingGood) {
          streaks.current.consecutiveGood++;
        }
        
        // Praise after ~8 seconds of perfect behavior, max once per 45 seconds
        const now = performance.now();
        if (streaks.current.consecutiveGood > 80 && now - lastPositiveTime.current > 45000) {
          emitTip('positive', 'success', POSITIVE_TIPS, 45000, onFeedback);
          lastPositiveTime.current = now;
          streaks.current.consecutiveGood = 0; // reset so it doesn't spam
        }
        
    } catch(e) {
       // Silently catch tracking frames dropping
    }
  }, [videoRef, emitTip]);

  const getFinalMetrics = () => {
    const total = sessionStats.current.totalFrames;
    if (total === 0) return { eyeContactScore: 7, postureScore: 7 }; // Default fallback

    const eyePercent = sessionStats.current.goodEyeContactFrames / total;
    const posturePercent = sessionStats.current.goodPostureFrames / total;

    // Convert to strict mathematically accurate 0-10 format
    return {
       eyeContactScore: Math.round((eyePercent * 10) * 10) / 10,
       postureScore: Math.round((posturePercent * 10) * 10) / 10
    };
  };

  return { isReady, analyzeVideoFrame, getFinalMetrics };
}
