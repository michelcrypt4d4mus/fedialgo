import { type StringDict, type StringSet } from '../types';
export declare const LANGUAGE_NAMES: StringDict;
export declare const LANGUAGE_CODES: StringDict;
export declare const FOREIGN_SCRIPTS: StringSet;
type LanguageAccuracies = {
    accuracy: number;
    lang: string;
}[];
type DetectLangLibraryResult = {
    accuracy: number;
    chosenLang?: string;
    isAccurate: boolean;
    languageAccuracies: LanguageAccuracies;
};
type LanguageDetectInfo = {
    chosenLanguage?: string;
    langDetector: DetectLangLibraryResult;
    tinyLD: DetectLangLibraryResult;
};
/** Convert a language code like "jp" into a language name like "Japanese". */
export declare const languageName: (code: string) => string;
/**
 * Use the two different language detectors to guess a language.
 * @param {string} text - The text to detect the language of.
 * @returns {LanguageDetectInfo} The detected language information.
 */
export declare function detectLanguage(text: string): LanguageDetectInfo;
/**
 * Returns the language code of the matched regex (if any). Not as thorough as {@linkcode detectLanguage}
 * and only meant for non Latin scripts like japanese, korean, etc.
 * @param {string} str - The string to check.
 * @returns {string|undefined} The language code if detected, otherwise undefined.
 */
export declare function detectForeignScriptLanguage(str: string): string | undefined;
export {};
