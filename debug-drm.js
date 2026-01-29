// Quick debug script to verify DRM data structure

// Simulate word lists
const WORD_LISTS = [
  { theme: 'Sleep', studyWords: Array(12).fill('word') },
  { theme: 'Doctor', studyWords: Array(12).fill('word') },
  { theme: 'Chair', studyWords: Array(12).fill('word') },
  { theme: 'Sweet', studyWords: Array(12).fill('word') },
  { theme: 'Mountain', studyWords: Array(12).fill('word') },
  { theme: 'Cold', studyWords: Array(12).fill('word') }
];

// Count test items
let testItems = 0;

WORD_LISTS.forEach((list, listIndex) => {
  // 2 early + 2 middle + 2 late + 1 critical = 7 per list
  testItems += 7;
});

// 7 unrelated per list
testItems += 6 * 7;

console.log('Total study words:', 6 * 12); // Should be 72
console.log('Test items per list: 6 studied + 1 critical + 7 unrelated = 14');
console.log('Total test items:', testItems); // Should be 84

// Verify: 6 lists * 6 studied = 36 studied
// 6 lists * 1 critical = 6 critical
// 6 lists * 7 unrelated = 42 unrelated
// Total = 36 + 6 + 42 = 84
console.log('\nBreakdown:');
console.log('- Studied words: 6 lists × 6 words = 36');
console.log('- Critical lures: 6 lists × 1 lure = 6');
console.log('- Unrelated distractors: 6 lists × 7 words = 42');
console.log('- Total: 36 + 6 + 42 = 84');
