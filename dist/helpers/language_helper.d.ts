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
/** Convert a language code like 'jp' into a language name like 'Japanese'. */
export declare const languageName: (code: string) => string;
export declare function detectLanguage(text: string): LanguageDetectInfo;
export declare function detectForeignScriptLanguage(str: string): string | undefined;
export {};
