export type LanguageGroup = 'English' | 'Hebrew' | 'Spanish' | 'Non-words';

export function getLanguageGroup(word: string): LanguageGroup {
  const lowerWord = word.toLowerCase();

  // English
  if (['red', 'green', 'yellow'].includes(lowerWord)) {
    return 'English';
  }

  // Hebrew (transliterated)
  if (['adom', 'yarok', 'tsahov'].includes(lowerWord)) {
    return 'Hebrew';
  }

  // Spanish
  if (['rojo', 'verde', 'amarillo'].includes(lowerWord)) {
    return 'Spanish';
  }

  // Non-words
  if (['flurg', 'blaket', 'zorphin'].includes(lowerWord)) {
    return 'Non-words';
  }

  return 'Non-words'; // Default
}

export const LANGUAGE_GROUPS: LanguageGroup[] = ['English', 'Hebrew', 'Spanish', 'Non-words'];
