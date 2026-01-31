// Mental Rotation Experiment - Shepard & Metzler Paradigm
// Demonstrates that mental rotation takes time proportional to angle of rotation

import { RotationTrial } from '@/types/mental-rep';

// ============ FIGURE CONFIGURATION ============
// We'll create 8 unique 3D block figures
// Each figure will have versions at 0°, 60°, 120°, 180° rotations

export const ROTATION_ANGLES = [0, 60, 120, 180];
export const NUM_FIGURES = 8;

// Get figure IDs
export function getFigureIds(): string[] {
  return Array.from({ length: NUM_FIGURES }, (_, i) => `figure_${i + 1}`);
}

// ============ TRIAL GENERATION ============

// Generate practice trials (5 trials with feedback)
export function generatePracticeTrials(): RotationTrial[] {
  const trials: RotationTrial[] = [];
  const figureIds = getFigureIds();

  // 3 "same" trials, 2 "different" trials
  const sameConfigs = [
    { leftAngle: 0, rightAngle: 60 },
    { leftAngle: 0, rightAngle: 120 },
    { leftAngle: 60, rightAngle: 180 },
  ];

  const diffConfigs = [
    { leftAngle: 0, rightAngle: 60 },
    { leftAngle: 0, rightAngle: 120 },
  ];

  // Add same trials
  sameConfigs.forEach((config, i) => {
    const figureId = figureIds[i % figureIds.length];
    trials.push({
      id: i + 1,
      figureId,
      leftAngle: config.leftAngle,
      rightAngle: config.rightAngle,
      isSame: true,
      rotationDifference: Math.abs(config.rightAngle - config.leftAngle),
      isPractice: true,
    });
  });

  // Add different trials (using different figures for left/right to simulate "mirror")
  diffConfigs.forEach((config, i) => {
    const figureId = figureIds[(i + 3) % figureIds.length];
    trials.push({
      id: sameConfigs.length + i + 1,
      figureId,
      leftAngle: config.leftAngle,
      rightAngle: config.rightAngle,
      isSame: false, // This will use mirror version
      rotationDifference: Math.abs(config.rightAngle - config.leftAngle),
      isPractice: true,
    });
  });

  // Shuffle
  return shuffleArray(trials);
}

// Generate main experiment trials (40 trials)
export function generateMainTrials(): RotationTrial[] {
  const trials: RotationTrial[] = [];
  const figureIds = getFigureIds();

  // We need balanced:
  // - Same vs Different (50/50)
  // - Rotation angles (0°, 60°, 120°, 180°) - but we compare pairs so difference matters
  // Rotation differences: 0° (same orientation), 60°, 120°, 180°

  const rotationDiffs = [0, 60, 120, 180];

  // For each figure, create trials at each rotation difference
  // 8 figures × 4 rotation diffs × 2 (same/diff) = 64 possible combinations
  // We'll select 40 balanced trials

  // Generate all possible trial configs
  const allConfigs: {
    figureId: string;
    leftAngle: number;
    rightAngle: number;
    rotDiff: number;
    isSame: boolean;
  }[] = [];

  figureIds.forEach((figureId) => {
    ROTATION_ANGLES.forEach((leftAngle) => {
      ROTATION_ANGLES.forEach((rightAngle) => {
        if (leftAngle !== rightAngle || leftAngle === 0) {
          // Calculate rotation difference (shortest path)
          let diff = Math.abs(rightAngle - leftAngle);
          if (diff > 180) diff = 360 - diff;

          // Add same version
          allConfigs.push({
            figureId,
            leftAngle,
            rightAngle,
            rotDiff: diff,
            isSame: true,
          });

          // Add different (mirror) version
          allConfigs.push({
            figureId,
            leftAngle,
            rightAngle,
            rotDiff: diff,
            isSame: false,
          });
        }
      });
    });
  });

  // Group by rotation difference and same/diff
  const grouped: Map<string, typeof allConfigs> = new Map();

  allConfigs.forEach((config) => {
    const key = `${config.rotDiff}-${config.isSame}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(config);
  });

  // Select 5 trials from each of 8 cells (4 rotDiffs × 2 same/diff)
  const selectedConfigs: typeof allConfigs = [];

  rotationDiffs.forEach((rotDiff) => {
    [true, false].forEach((isSame) => {
      const key = `${rotDiff}-${isSame}`;
      const pool = grouped.get(key) || [];
      const shuffled = shuffleArray(pool);
      selectedConfigs.push(...shuffled.slice(0, 5));
    });
  });

  // Convert to trials
  const shuffledConfigs = shuffleArray(selectedConfigs);

  shuffledConfigs.forEach((config, index) => {
    trials.push({
      id: index + 1,
      figureId: config.figureId,
      leftAngle: config.leftAngle,
      rightAngle: config.rightAngle,
      isSame: config.isSame,
      rotationDifference: config.rotDiff,
      isPractice: false,
    });
  });

  return trials;
}

// ============ HELPER FUNCTIONS ============

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============ CORRELATION CALCULATION ============

export function calculateCorrelation(
  data: { angle: number; rt: number }[]
): number {
  if (data.length < 2) return 0;

  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.angle, 0);
  const sumY = data.reduce((sum, d) => sum + d.rt, 0);
  const sumXY = data.reduce((sum, d) => sum + d.angle * d.rt, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.angle * d.angle, 0);
  const sumY2 = data.reduce((sum, d) => sum + d.rt * d.rt, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============ GROUP DATA BY ANGLE ============

export function groupByAngle(
  data: { angle: number; rt: number }[]
): { angle: number; meanRT: number }[] {
  const groups: Map<number, number[]> = new Map();

  data.forEach((d) => {
    if (!groups.has(d.angle)) {
      groups.set(d.angle, []);
    }
    groups.get(d.angle)!.push(d.rt);
  });

  const result: { angle: number; meanRT: number }[] = [];

  groups.forEach((rts, angle) => {
    result.push({
      angle,
      meanRT: rts.reduce((a, b) => a + b, 0) / rts.length,
    });
  });

  // Sort by angle
  result.sort((a, b) => a.angle - b.angle);

  return result;
}

// ============ CONTENT STRINGS ============

export const ROTATION_CONTENT = {
  en: {
    practiceTitle: 'Practice: Mental Rotation',
    practiceInstructions: [
      'You will see two 3D objects side by side.',
      'Decide if they are the SAME object (just rotated) or DIFFERENT objects.',
      'Press S for SAME, D for DIFFERENT.',
      'You will receive feedback during practice.',
    ],
    mainTitle: 'Mental Rotation',
    mainInstructions: [
      'Same task: Are the two objects the same (rotated) or different?',
      'Press S for SAME, D for DIFFERENT.',
      'Respond as quickly and accurately as possible.',
    ],
    sameKey: 'S = Same',
    diffKey: 'D = Different',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    trial: 'Trial',
    of: 'of',
  },
  he: {
    practiceTitle: 'תרגול: סיבוב מנטלי',
    practiceInstructions: [
      'תראה שני אובייקטים תלת-ממדיים זה לצד זה.',
      'החלט אם הם אותו האובייקט (רק מסובב) או אובייקטים שונים.',
      'לחץ S עבור זהה, D עבור שונה.',
      'תקבל משוב במהלך התרגול.',
    ],
    mainTitle: 'סיבוב מנטלי',
    mainInstructions: [
      'אותה משימה: האם שני האובייקטים זהים (מסובבים) או שונים?',
      'לחץ S עבור זהה, D עבור שונה.',
      'הגב מהר ככל האפשר ובדיוק מרבי.',
    ],
    sameKey: 'S = זהה',
    diffKey: 'D = שונה',
    correct: 'נכון!',
    incorrect: 'לא נכון',
    trial: 'ניסוי',
    of: 'מתוך',
  },
};
