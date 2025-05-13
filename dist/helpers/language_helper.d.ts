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
type LangResult = {
    accuracy: number;
    lang: string;
}[];
type LangDetectResult = {
    languageAccuracies: LangResult;
    detectedLang?: string;
    accuracy: number;
    isAccurate: boolean;
};
type LanguageDetectInfo = {
    chosenLanguage?: string;
    langDetector: LangDetectResult;
    tinyLD: LangDetectResult;
    summary: string;
};
export declare const detectLangInfo: (text: string) => LanguageDetectInfo;
export declare const detectHashtagLanguage: (str: string) => string | undefined;
export {};
