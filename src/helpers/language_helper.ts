/*
 * Detecting language etc.
 */
import LanguageDetect from 'languagedetect';
import { detectAll } from 'tinyld';

import { NULL, isNumber } from './string_helpers';
import { traceLog } from './log_helpers';

export const MIN_LANG_ACCURACY = 0.4;
export const MIN_ALT_LANG_ACCURACY = 0.2;  // LanguageDetect never gets very high accuracy
export const VERY_HIGH_LANG_ACCURACY = 0.7;
export const LANGUAGE_DETECTOR = new LanguageDetect();
const OVERRULE_LANG_ACCURACY = 0.03;
const LOG_LANUAGE_DETECTOR = true;

export const IGNORE_LANGUAGES = [
    "ber",  // Berber
    "eo",   // Esperanto
    "tk",   // Turkmen
    "tlh",  // Klingon
];

export const OVERCONFIDENT_LANGUAGES = [
    "da",
    "fr",
];


// From https://gist.github.com/jrnk/8eb57b065ea0b098d571
export const LANGUAGE_CODES: Record<string, string> = {
    afar: "aa",
    abkhazian: "ab",
    avestan: "ae",
    afrikaans: "af",
    akan: "ak",
    amharic: "am",
    aragonese: "an",
    arabic: "ar",
    assamese: "as",
    avaric: "av",
    aymara: "ay",
    azerbaijani: "az",
    bashkir: "ba",
    belarusian: "be",
    bulgarian: "bg",
    bihari: "bh",
    bislama: "bi",
    bambara: "bm",
    bengali: "bn",
    tibetan: "bo",
    breton: "br",
    bosnian: "bs",
    catalan: "ca",
    cebuano: "ceb",
    chechen: "ce",
    chamorro: "ch",
    corsican: "co",
    cree: "cr",
    czech: "cs",
    churchSlavic: "cu",
    chuvash: "cv",
    welsh: "cy",
    danish: "da",
    german: "de",
    divehi: "dv",
    dzongkha: "dz",
    ewe: "ee",
    greek: "el",
    english: "en",
    esperanto: "eo",
    spanish: "es",
    estonian: "et",
    basque: "eu",
    persian: "fa",
    fulah: "ff",
    finnish: "fi",
    fijian: "fj",
    faroese: "fo",
    french: "fr",
    frisian: "fy",
    irish: "ga",
    gaelic: "gd",
    galician: "gl",
    guarani: "gn",
    gujarati: "gu",
    manx: "gv",
    hausa: "ha",
    hebrew: "he",
    hindi: "hi",
    hirimotu: "ho",
    croatian: "hr",
    haitian: "ht",
    hungarian: "hu",
    armenian: "hy",
    hawaiian: "haw",
    herero: "hz",
    indonesian: "id",
    occidental: "ie",
    igbo: "ig",
    sichuan: "ii",
    inupiaq: "ik",
    ido: "io",
    icelandic: "is",
    italian: "it",
    inuktitut: "iu",
    japanese: "ja",
    javanese: "jv",
    georgian: "ka",
    kongo: "kg",
    kikuyu: "ki",
    kuanyama: "kj",
    kazakh: "kk",
    greenlandic: "kl",
    khmer: "km",
    kannada: "kn",
    korean: "ko",
    kanuri: "kr",
    kashmiri: "ks",
    kurdish: "ku",
    komi: "kv",
    cornish: "kw",
    kyrgyz: "ky",
    latin: "la",
    luxembourgish: "lb",
    ganda: "lg",
    limburgish: "li",
    lingala: "ln",
    lao: "lo",
    lithuanian: "lt",
    lubaKatanga: "lu",
    latvian: "lv",
    malagasy: "mg",
    marshallese: "mh",
    maori: "mi",
    macedonian: "mk",
    malayalam: "ml",
    mongolian: "mn",
    marathi: "mr",
    malay: "ms",
    maltese: "mt",
    burmese: "my",
    nauru: "na",
    norwegianBokmal: "nb",
    ndebele: "nd",
    nepali: "ne",
    ndonga: "ng",
    dutch: "nl",
    norwegianNynorsk: "nn",
    norwegian: "no",
    navajo: "nv",
    chichewa: "ny",
    ojibwa: "oj",
    oromo: "om",
    oriya: "or",
    ossetian: "os",
    punjabi: "pa",
    pali: "pi",
    polish: "pl",
    pashto: "ps",
    pidgin: "en", // Actually Nigerian Pidgin is pcm but we assume it means English
    portuguese: "pt",
    quechua: "qu",
    romansh: "rm",
    rundi: "rn",
    romanian: "ro",
    russian: "ru",
    kinyarwanda: "rw",
    sanskrit: "sa",
    sardinian: "sc",
    sindhi: "sd",
    northernSami: "se",
    sango: "sg",
    sinhalese: "si",
    slovak: "sk",
    slovenian: "sl",
    slovene: "sl",
    samoan: "sm",
    shona: "sn",
    somali: "so",
    albanian: "sq",
    serbian: "sr",
    swati: "ss",
    sothoSouthern: "st",
    sundanese: "su",
    swedish: "sv",
    swahili: "sw",
    tamil: "ta",
    telugu: "te",
    tajik: "tg",
    thai: "th",
    tigrinya: "ti",
    turkmen: "tk",
    tagalog: "tl",
    tswana: "tn",
    tonga: "to",
    turkish: "tr",
    tsonga: "ts",
    tatar: "tt",
    twi: "tw",
    tahitian: "ty",
    uighur: "ug",
    ukrainian: "uk",
    urdu: "ur",
    uzbek: "uz",
    venda: "ve",
    vietnamese: "vi",
    volapük: "vo",
    walloon: "wa",
    wolof: "wo",
    xhosa: "xh",
    yiddish: "yi",
    yoruba: "yo",
    zhuang: "za",
    chinese: "zh",
    zulu: "zu",
};


// The tinyld library is better at detecting these languages than the LanguageDetector.
export const FOREIGN_SCRIPTS = [
    LANGUAGE_CODES.arabic,
    LANGUAGE_CODES.chinese,
    `${LANGUAGE_CODES.chinese}-CN`,
    `${LANGUAGE_CODES.chinese}-TW`,
    LANGUAGE_CODES.japanese,
    LANGUAGE_CODES.korean,
];


// International locales, see: https://gist.github.com/wpsmith/7604842
export const GREEK_LOCALE = `${LANGUAGE_CODES.greek}-GR`;
export const JAPANESE_LOCALE = `${LANGUAGE_CODES.japanese}-JP`;
export const KOREAN_LOCALE = `${LANGUAGE_CODES.korean}-KR`;
export const RUSSIAN_LOCALE = `${LANGUAGE_CODES.russian}-${LANGUAGE_CODES.russian.toUpperCase()}`;

// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
export const LANGUAGE_REGEXES = {
    [LANGUAGE_CODES.arabic]: new RegExp(`^[\\p{Script=Arabic}\\d]+$`, 'v'),
    [LANGUAGE_CODES.greek]: new RegExp(`^[\\p{Script=Greek}\\d]+$`, 'v'), // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets
    [LANGUAGE_CODES.japanese]: new RegExp(`^[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\da-z]*$`, 'v'), //    /^[一ー-龯ぁ-んァ-ン]{2,}/,         // https://gist.github.com/terrancesnyder/1345094
    [LANGUAGE_CODES.korean]: new RegExp(`^[\\p{Script=Hangul}\\d]+$`, 'v'), // [KOREAN_LANGUAGE]: /^[가-힣]{2,}/,
    [LANGUAGE_CODES.russian]: new RegExp(`^[\\p{Script=Cyrillic}\\d]+$`, 'v'),
};


type LanguageDetectInfo = {
    accuracies: number[];
    altLanguage?: string;
    altDetectedLangs: [string, number][];
    altLangAccuracy: number;
    detectedLang?: string;
    detectedLangs: {accuracy: number, lang: string}[];
    detectedLangAccuracy: number;
    determinedLang?: string;
    summary: string;
};


// Use the two different language detectors to guess a language
export const detectLangInfo = (text: string): LanguageDetectInfo => {
    // Use the tinyld language detector to get the detectedLang
    const detectedLangs = detectAll(text);
    let detectedLang: string | undefined = detectedLangs[0]?.lang;
    let detectedLangAccuracy = detectedLangs[0]?.accuracy || 0;

    // Use LanguageDetector to get the altLanguage
    const altDetectedLangs = LANGUAGE_DETECTOR.detect(text);
    let altLanguage = altDetectedLangs.length ? altDetectedLangs[0][0] : undefined;
    const altLangAccuracy = altDetectedLangs.length ? altDetectedLangs[0][1] : 0;

    if (altLanguage && altLanguage in LANGUAGE_CODES) {
        altLanguage = LANGUAGE_CODES[altLanguage];
    } else if (altLanguage) {
        console.warn(`[detectLangInfo()] altLanguage "${altLanguage}" found but not in LANGUAGE_CODES!"`);
    }

    // Ignore Klingon etc.
    if (detectedLang) {
        if (IGNORE_LANGUAGES.includes(detectedLang)) {
            detectedLang = undefined;
            detectedLangAccuracy = 0;
        }

        // tinyld is overconfident about some languages
        if (OVERCONFIDENT_LANGUAGES.includes(detectedLang || NULL)
            && detectedLangAccuracy > VERY_HIGH_LANG_ACCURACY
            && altLanguage
            && altLanguage != detectedLang) {
            let warning = `"${detectedLang}" is overconfident (${detectedLangAccuracy}) for "${text}"!`;
            console.warn(`${warning} altLanguage="${altLanguage}" (accuracy: ${altLangAccuracy.toPrecision(4)})`);

            if (detectedLangs.length > 1) {
                detectedLang = detectedLangs[1].lang;
                detectedLangAccuracy = detectedLangs[1].accuracy;
            } else {
                detectedLang = undefined;
                detectedLangAccuracy = 0;
            }
        }
    }

    const accuracies = [detectedLangAccuracy, altLangAccuracy];
    const summary = `detectedLang="${detectedLang}" (accuracy: ${detectedLangAccuracy.toPrecision(4)})` +
                  `, altDetectedLang="${altLanguage}" (accuracy: ${altLangAccuracy?.toPrecision(4)})`;

    // We will set determinedLang to be a high confidence guess (if we find one)
    let determinedLang: string | undefined;

    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (       detectedLang
            && detectedLang == altLanguage
            && accuracies.some((a) => a > MIN_ALT_LANG_ACCURACY) || accuracies.every((a) => a > (MIN_LANG_ACCURACY / 2))) {
        determinedLang = detectedLang;
    } else if (altLanguage && detectedLang && altLanguage != detectedLang) {
        // if altLangAccuracy is high enough and detectedLang is low enough
        if (altLangAccuracy >= MIN_ALT_LANG_ACCURACY) {
            if (detectedLangAccuracy < OVERRULE_LANG_ACCURACY) {
                determinedLang = altLanguage;
            } else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        } else if (detectedLangAccuracy >= MIN_LANG_ACCURACY) {
            if (altLangAccuracy < OVERRULE_LANG_ACCURACY) {
                detectedLang = detectedLang;
            } else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        }
    }

    // tinyld is much better at detecting foreign scripts
    if (detectedLangAccuracy >= VERY_HIGH_LANG_ACCURACY && FOREIGN_SCRIPTS.includes(detectedLang || NULL)) {
        // console.debug(`"${detectedLang}" is foreign script w/high accuracy, using it as determinedLang for "${text}". ${summary}`);
        determinedLang = detectedLang;
    }

    return {
        accuracies,
        altDetectedLangs,
        altLanguage,
        altLangAccuracy,
        detectedLangs,
        detectedLang,
        detectedLangAccuracy,
        determinedLang,
        summary,
    };
};


// Returns the language code of the matched regex (if any). This is our janky version of language detection.
export const detectHashtagLanguage = (str: string): string | undefined => {
    let language: string | undefined;

    Object.entries(LANGUAGE_REGEXES).forEach(([lang, regex]) => {
        if (regex.test(str) && !isNumber(str)) {
            language = lang;
        }
    });

    return language;
};
