/*
 * Detecting language etc.
 */
import LanguageDetect from 'languagedetect';

import { detectAll } from 'tinyld/*';
import { LanguageDetectInfo } from '../types';
import { NULL } from './string_helpers';

export const MIN_LANG_ACCURACY = 0.4;
export const MIN_ALT_LANG_ACCURACY = 0.2;  // LanguageDetect never gets very high accuracy
export const VERY_HIGH_LANG_ACCURACY = 0.7;
export const LANGUAGE_DETECTOR = new LanguageDetect();

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
    `${LANGUAGE_CODES.chinese}-TW`,
    LANGUAGE_CODES.japanese,
    LANGUAGE_CODES.korean,
];


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

    let determinedLang: string | undefined;
    const accuracies = [detectedLangAccuracy, altLangAccuracy];
    const summary = `detectedLang="${detectedLang}" (accuracy: ${detectedLangAccuracy.toPrecision(4)})` +
        `, altDetectedLang="${altLanguage}" (accuracy: ${altLangAccuracy?.toPrecision(4)})`;

    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (detectedLang && detectedLang == altLanguage
        && accuracies.some((a) => a > MIN_LANG_ACCURACY) || accuracies.every((a) => a > (MIN_LANG_ACCURACY / 2))) {
        determinedLang = detectedLang;
    } else if (detectedLangAccuracy >= VERY_HIGH_LANG_ACCURACY && FOREIGN_SCRIPTS.includes(detectedLang || NULL)) {
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
