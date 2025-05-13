import LanguageDetect from 'languagedetect';
export declare const MIN_TINYLD_ACCURACY = 0.4;
export declare const MIN_LANG_DETECTOR_ACCURACY = 0.2;
export declare const VERY_HIGH_LANG_ACCURACY = 0.7;
export declare const LANGUAGE_DETECTOR: LanguageDetect;
export declare const IGNORE_LANGUAGES: string[];
export declare const OVERCONFIDENT_LANGUAGES: string[];
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
    allDetectResults: LangResult;
    detectedLang?: string;
    accuracy: number;
};
type LanguageDetectInfo = {
    determinedLang?: string;
    langDetector: LangDetectResult;
    tinyLD: LangDetectResult;
    summary: string;
};
export declare const detectLangInfo: (text: string) => LanguageDetectInfo;
export declare const detectHashtagLanguage: (str: string) => string | undefined;
export {};
