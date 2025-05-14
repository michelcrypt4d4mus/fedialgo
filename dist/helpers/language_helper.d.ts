export declare const IGNORE_LANGUAGES: string[];
export declare const LANG_DETECTOR_OVERCONFIDENT_LANGS: string[];
export declare const LANGUAGE_CODES: Record<string, string>;
export declare const FOREIGN_SCRIPTS: string[];
export declare const GREEK_LOCALE: string;
export declare const JAPANESE_LOCALE: string;
export declare const KOREAN_LOCALE: string;
export declare const RUSSIAN_LOCALE: string;
export declare const LANGUAGE_REGEXES: {
    [x: string]: RegExp;
};
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
export declare const detectLanguage: (text: string) => LanguageDetectInfo;
export declare function detectHashtagLanguage(str: string): string | undefined;
export {};
