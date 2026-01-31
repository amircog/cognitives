// Mental Scanning Experiment - Kosslyn's Island Map Paradigm
// Demonstrates that mental imagery has spatial properties similar to perception

import { Landmark, ScanningTrial } from '@/types/mental-rep';

// ============ LANDMARKS ============
// Positioned on a 100x100 grid representing the island map
// Distances calibrated to create variety in trial distances

export const LANDMARKS: Landmark[] = [
  { id: 'hut', name: 'Hut', nameHe: 'צריף', x: 15, y: 25 },
  { id: 'tree', name: 'Tree', nameHe: 'עץ', x: 40, y: 15 },
  { id: 'well', name: 'Well', nameHe: 'באר', x: 75, y: 20 },
  { id: 'rock', name: 'Rock', nameHe: 'סלע', x: 25, y: 55 },
  { id: 'lake', name: 'Lake', nameHe: 'אגם', x: 55, y: 50 },
  { id: 'beach', name: 'Beach', nameHe: 'חוף', x: 85, y: 60 },
  { id: 'cave', name: 'Cave', nameHe: 'מערה', x: 45, y: 80 },
];

// ============ DISTANCE CALCULATION ============

export function calculateDistance(from: Landmark, to: Landmark): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============ TRIAL GENERATION ============

// Generate all possible landmark pairs (avoiding same-to-same)
function getAllLandmarkPairs(): { from: Landmark; to: Landmark; distance: number }[] {
  const pairs: { from: Landmark; to: Landmark; distance: number }[] = [];

  for (let i = 0; i < LANDMARKS.length; i++) {
    for (let j = 0; j < LANDMARKS.length; j++) {
      if (i !== j) {
        const from = LANDMARKS[i];
        const to = LANDMARKS[j];
        pairs.push({
          from,
          to,
          distance: calculateDistance(from, to),
        });
      }
    }
  }

  return pairs;
}

// Select a balanced set of trials covering short, medium, and long distances
export function generateScanningTrials(): ScanningTrial[] {
  const allPairs = getAllLandmarkPairs();

  // Sort by distance
  allPairs.sort((a, b) => a.distance - b.distance);

  // Divide into terciles (short, medium, long)
  const tercileSize = Math.floor(allPairs.length / 3);
  const shortPairs = allPairs.slice(0, tercileSize);
  const mediumPairs = allPairs.slice(tercileSize, tercileSize * 2);
  const longPairs = allPairs.slice(tercileSize * 2);

  // Select 7 trials from each tercile (21 total)
  const selectedPairs: { from: Landmark; to: Landmark; distance: number }[] = [];

  // Shuffle each tercile and pick
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  selectedPairs.push(...shuffleArray(shortPairs).slice(0, 7));
  selectedPairs.push(...shuffleArray(mediumPairs).slice(0, 7));
  selectedPairs.push(...shuffleArray(longPairs).slice(0, 7));

  // Shuffle the final selection
  const shuffledPairs = shuffleArray(selectedPairs);

  // Convert to ScanningTrial format
  return shuffledPairs.map((pair, index) => ({
    id: index + 1,
    fromLandmark: pair.from,
    toLandmark: pair.to,
    distance: pair.distance,
  }));
}

// ============ CORRELATION CALCULATION ============

export function calculateCorrelation(
  data: { distance: number; rt: number }[]
): number {
  if (data.length < 2) return 0;

  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.distance, 0);
  const sumY = data.reduce((sum, d) => sum + d.rt, 0);
  const sumXY = data.reduce((sum, d) => sum + d.distance * d.rt, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.distance * d.distance, 0);
  const sumY2 = data.reduce((sum, d) => sum + d.rt * d.rt, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============ GROUP DATA BY DISTANCE ============

export function groupByDistanceBins(
  data: { distance: number; rt: number }[],
  numBins: number = 5
): { distance: number; meanRT: number }[] {
  if (data.length === 0) return [];

  const minDist = Math.min(...data.map(d => d.distance));
  const maxDist = Math.max(...data.map(d => d.distance));
  const binSize = (maxDist - minDist) / numBins;

  const bins: { distance: number; rts: number[] }[] = [];

  for (let i = 0; i < numBins; i++) {
    bins.push({
      distance: minDist + binSize * (i + 0.5), // Bin center
      rts: [],
    });
  }

  // Assign each data point to a bin
  data.forEach(d => {
    const binIndex = Math.min(
      Math.floor((d.distance - minDist) / binSize),
      numBins - 1
    );
    bins[binIndex].rts.push(d.rt);
  });

  // Calculate mean RT for each bin
  return bins
    .filter(bin => bin.rts.length > 0)
    .map(bin => ({
      distance: Math.round(bin.distance),
      meanRT: bin.rts.reduce((a, b) => a + b, 0) / bin.rts.length,
    }));
}

// ============ CONTENT STRINGS ============

export const SCANNING_CONTENT = {
  en: {
    studyTitle: 'Memorize the Island Map',
    studyInstructions: [
      'Study this map carefully for 30 seconds.',
      'Try to remember the location of each landmark.',
      'You will be asked to mentally scan between locations.',
    ],
    testTitle: 'Mental Scanning',
    testInstructions: 'Imagine the starting location, then mentally scan to the target. Press SPACE when you "arrive" at the target.',
    startLabel: 'Starting at:',
    targetLabel: 'Scan to:',
    pressSpace: 'Press SPACE when you reach the target',
    foundIt: 'Found it!',
  },
  he: {
    studyTitle: 'שנן את מפת האי',
    studyInstructions: [
      'למד את המפה הזו היטב במשך 30 שניות.',
      'נסה לזכור את המיקום של כל ציון דרך.',
      'תתבקש לסרוק מנטלית בין מיקומים.',
    ],
    testTitle: 'סריקה מנטלית',
    testInstructions: 'דמיין את מיקום ההתחלה, ואז סרוק מנטלית אל היעד. לחץ רווח כשאתה "מגיע" ליעד.',
    startLabel: 'מתחיל ב:',
    targetLabel: 'סרוק אל:',
    pressSpace: 'לחץ רווח כשאתה מגיע ליעד',
    foundIt: 'מצאתי!',
  },
};
