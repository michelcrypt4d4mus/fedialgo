/*
 * Detecting language etc.
 */
import LanguageDetect from 'languagedetect';
import { detectAll } from 'tinyld';

import { NULL, isNumber } from './string_helpers';

export const MIN_TINYLD_ACCURACY = 0.4;
export const MIN_LANG_DETECTOR_ACCURACY = 0.2;  // LanguageDetect never gets very high accuracy
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


// Arrives ordered by accuracy
type LangResult = {accuracy: number, lang: string}[];

type LangDetectResult = {
    allDetectResults: LangResult,
    detectedLang?: string,
    accuracy: number,
}

type LanguageDetectInfo = {
    determinedLang?: string;
    langDetector: LangDetectResult;
    tinyLD: LangDetectResult;
    summary: string;
};


const buildLangDetectResult = (allDetectResults?: LangResult): LangDetectResult => {
    allDetectResults ||= [];
    const firstResult = allDetectResults[0];

    return {
        allDetectResults,
        accuracy: firstResult?.accuracy || 0,
        detectedLang: firstResult?.lang,
    }
}

// Use the two different language detectors to guess a language
export const detectLangInfo = (text: string): LanguageDetectInfo => {
    // Use LanguageDetector to get the langInfoFromTinyLD.detectedLang, Reshape it to look like detectedLangs
    const langsFromLangDetector = LANGUAGE_DETECTOR.detect(text)?.map(([language, accuracy], i) => {
        let languageCode = LANGUAGE_CODES[language];

        if (!languageCode) {
            if (i < 3) console.warn(`[detectLangInfo()] language "${langInfoFromTinyLD.detectedLang}" found but not in LANGUAGE_CODES!"`);
            languageCode = language;
        }

        return {accuracy: accuracy, lang: languageCode};
    });

    const langInfoFromLangDetector = buildLangDetectResult(langsFromLangDetector);
    const langInfoFromTinyLD = buildLangDetectResult(detectAll(text));

    if (langInfoFromTinyLD.detectedLang) {
        // Ignore Klingon etc.
        if (IGNORE_LANGUAGES.includes(langInfoFromTinyLD.detectedLang)) {
            langInfoFromTinyLD.detectedLang = undefined;
            langInfoFromTinyLD.accuracy = 0;
        }

        // tinyld is overconfident about some languages
        if (   OVERCONFIDENT_LANGUAGES.includes(langInfoFromTinyLD.detectedLang || NULL)
            && langInfoFromTinyLD.accuracy > VERY_HIGH_LANG_ACCURACY
            && langInfoFromLangDetector.detectedLang
            && langInfoFromLangDetector.detectedLang != langInfoFromTinyLD.detectedLang)
        {
            let msg = `"${langInfoFromTinyLD.detectedLang}" is overconfident (${langInfoFromTinyLD.accuracy}) for "${text}"!`;
            console.warn(`${msg} tinyLD.detectedLang="${langInfoFromTinyLD.detectedLang}" (accuracy: ${langInfoFromTinyLD.accuracy.toPrecision(4)})`);

            // Use the 2nd language if available, otherwise set accuracy to 0.1
            if (langInfoFromTinyLD.allDetectResults.length > 1) {
                const newLangInfo = langInfoFromTinyLD.allDetectResults[1];
                langInfoFromTinyLD.detectedLang = newLangInfo.lang;
                langInfoFromTinyLD.accuracy = newLangInfo.accuracy;
            } else {
                langInfoFromTinyLD.accuracy = 0.1;
            }
        }
    }

    const accuracies = [langInfoFromTinyLD.accuracy, langInfoFromLangDetector.accuracy];
    const summary = `tinyLD="${langInfoFromTinyLD.detectedLang}" (accuracy: ${langInfoFromTinyLD.accuracy.toPrecision(4)})` +
                  `, langDetector="${langInfoFromLangDetector.detectedLang}" (accuracy: ${langInfoFromLangDetector.accuracy.toPrecision(4)})`;

    // We will set determinedLang to be a high confidence guess (if we find one)
    let determinedLang: string | undefined;

    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (       langInfoFromTinyLD.detectedLang
            && langInfoFromTinyLD.detectedLang == langInfoFromLangDetector.detectedLang
            && (
                accuracies.some((a) => a > MIN_LANG_DETECTOR_ACCURACY)
                ||
                accuracies.every((a) => a > (MIN_TINYLD_ACCURACY / 2))
            )
    ) {
        determinedLang = langInfoFromTinyLD.detectedLang;
    }

    else if (  langInfoFromTinyLD.detectedLang
            && langInfoFromLangDetector.detectedLang
            && langInfoFromTinyLD.detectedLang != langInfoFromLangDetector.detectedLang
    ) {
        // if firstLangFromLangDetector.accuracy is high enough and detectedLang is low enough
        if (langInfoFromLangDetector.accuracy >= MIN_LANG_DETECTOR_ACCURACY) {
            if (langInfoFromTinyLD.accuracy < OVERRULE_LANG_ACCURACY) {
                determinedLang = langInfoFromLangDetector.detectedLang;
            } else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        } else if (langInfoFromTinyLD.accuracy >= MIN_TINYLD_ACCURACY) {
            if (langInfoFromLangDetector.accuracy < OVERRULE_LANG_ACCURACY) {
                determinedLang = langInfoFromTinyLD.detectedLang;
            } else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        }
    }

    // tinyld is much better at detecting foreign scripts
    if (langInfoFromTinyLD.accuracy >= VERY_HIGH_LANG_ACCURACY && FOREIGN_SCRIPTS.includes(langInfoFromTinyLD.detectedLang || NULL)) {
        // console.debug(`"${detectedLang}" is foreign script w/high accuracy, using it as determinedLang for "${text}". ${summary}`);
        determinedLang = langInfoFromTinyLD.detectedLang;
    }

    return {
        determinedLang,
        langDetector: langInfoFromLangDetector,
        tinyLD: langInfoFromTinyLD,
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
