// Bouba-Kiki Stimuli Configuration
// Store stimuli separately for easy exchange

export const STIMULI = {
  // Words and their conventional mappings
  words: [
    { text: 'BOUBA', type: 'rounded' as const, hebrewText: 'בובה' },
    { text: 'KIKI', type: 'spiky' as const, hebrewText: 'קיקי' },
    { text: 'MALUMA', type: 'rounded' as const, hebrewText: 'מלומה' },
    { text: 'TAKETE', type: 'spiky' as const, hebrewText: 'טקטה' },
  ],

  // Rounded shape filenames (smooth, curved, organic)
  roundedShapes: [
    'rounded_01.png',
    'rounded_02.png',
    'rounded_03.png',
    'rounded_04.png',
    'rounded_05.png',
    'rounded_06.png',
  ],

  // Spiky shape filenames (angular, sharp, jagged)
  spikyShapes: [
    'spiky_01.png',
    'spiky_02.png',
    'spiky_03.png',
    'spiky_04.png',
    'spiky_05.png',
    'spiky_06.png',
  ],

  // Base path for images
  basePath: '/bouba-kiki/shapes/',
};

// Experiment parameters (easy to adjust)
export const CONFIG = {
  mainTrials: 12,
  controlTrials: 4,
  fixationDurationMs: 500,
  feedbackDurationMs: 0, // No feedback in main experiment
};
