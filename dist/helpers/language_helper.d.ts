import { StringSet } from '../types';
export declare const LANGUAGE_CODES: Record<string, string>;
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
export declare function detectLanguage(text: string): LanguageDetectInfo;
export declare function detectHashtagLanguage(str: string): string | undefined;
export {};
