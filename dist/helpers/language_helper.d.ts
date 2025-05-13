import LanguageDetect from 'languagedetect';
export declare const MIN_LANG_ACCURACY = 0.4;
export declare const MIN_ALT_LANG_ACCURACY = 0.2;
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
type LanguageDetectInfo = {
    accuracies: number[];
    altLanguage?: string;
    altDetectedLangs: [string, number][];
    altLangAccuracy: number;
    detectedLang?: string;
    detectedLangs: {
        accuracy: number;
        lang: string;
    }[];
    detectedLangAccuracy: number;
    determinedLang?: string;
    summary: string;
};
export declare const detectLangInfo: (text: string) => LanguageDetectInfo;
export declare const detectHashtagLanguage: (str: string) => string | undefined;
export {};
