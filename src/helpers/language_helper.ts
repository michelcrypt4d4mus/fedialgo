/*
 * Detecting language etc.
 */
import LanguageDetect from 'languagedetect';
import { detectAll } from 'tinyld';

import { NULL, isNumber } from './string_helpers';
import { StringSet } from '../types';

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
    azeri: "az",
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
export const FOREIGN_SCRIPTS: StringSet = new Set([
    LANGUAGE_CODES.arabic,
    LANGUAGE_CODES.chinese,
    `${LANGUAGE_CODES.chinese}-CN`,
    `${LANGUAGE_CODES.chinese}-TW`,
    LANGUAGE_CODES.japanese,
    LANGUAGE_CODES.korean,
]);

// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
// Also https://github.com/slevithan/xregexp/blob/master/tools/output/scripts.js
const LANGUAGE_REGEXES = {
    [LANGUAGE_CODES.arabic]: new RegExp(`^[\\p{Script=Arabic}\\d]+$`, 'v'),
    [LANGUAGE_CODES.greek]: new RegExp(`^[\\p{Script=Greek}\\d]+$`, 'v'), // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets
    // TODO: this doesn't seem to match the "de" (で) character in "これを見た人は無言で"??
    [LANGUAGE_CODES.japanese]: new RegExp(`^[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\da-z]*$`, 'iv'),
    [LANGUAGE_CODES.korean]: new RegExp(`^[\\p{Script=Hangul}\\d]+$`, 'v'), // [KOREAN_LANGUAGE]: /^[가-힣]{2,}/,
    [LANGUAGE_CODES.russian]: new RegExp(`^[\\p{Script=Cyrillic}\\d]+$`, 'v'),
};

const LANG_DETECTOR = new LanguageDetect();
const MIN_LANG_DETECTOR_ACCURACY = 0.2;  // LanguageDetect library never gets very high accuracy
const MIN_TINYLD_ACCURACY = 0.4;  // TinyLD is better at some languages but can be overconfident
const OVERRULE_LANG_ACCURACY = 0.03;
const VERY_HIGH_LANG_ACCURACY = 0.7;

// International locales, see: https://gist.github.com/wpsmith/7604842
const GREEK_LOCALE = `${LANGUAGE_CODES.greek}-GR`;
const JAPANESE_LOCALE = `${LANGUAGE_CODES.japanese}-JP`;
const KOREAN_LOCALE = `${LANGUAGE_CODES.korean}-KR`;
const RUSSIAN_LOCALE = `${LANGUAGE_CODES.russian}-${LANGUAGE_CODES.russian.toUpperCase()}`;

const IGNORE_LANGUAGES: StringSet = new Set([
    "ber",  // Berber
    "eo",   // Esperanto
    "tk",   // Turkmen
    "tlh",  // Klingon
]);

const LANG_DETECTOR_OVERCONFIDENT_LANGS: StringSet = new Set([
    "da",
    "fr",
]);

// Arrives ordered by accuracy
type LanguageAccuracies = {accuracy: number, lang: string}[];

type DetectLangLibraryResult = {
    accuracy: number,
    chosenLang?: string,
    isAccurate: boolean,
    languageAccuracies: LanguageAccuracies,
};

type LanguageDetectInfo = {
    chosenLanguage?: string;
    langDetector: DetectLangLibraryResult;
    tinyLD: DetectLangLibraryResult;
};


// Use the two different language detectors to guess a language
export function detectLanguage(text: string): LanguageDetectInfo {
    const langInfoFromLangDetector = detectLangWithLangDetector(text);
    const langInfoFromTinyLD = detectLangWithTinyLD(text);
    // We will set determinedLang to be a high confidence guess (if we find one)
    let chosenLanguage: string | undefined;

    if (langInfoFromTinyLD.chosenLang) {
        // Ignore Klingon etc.
        if (IGNORE_LANGUAGES.has(langInfoFromTinyLD.chosenLang)) {
            langInfoFromTinyLD.chosenLang = undefined;
            langInfoFromTinyLD.accuracy = 0;
        }

        // tinyld is overconfident about some languages
        if (   LANG_DETECTOR_OVERCONFIDENT_LANGS.has(langInfoFromTinyLD.chosenLang)
            && langInfoFromLangDetector.chosenLang != langInfoFromTinyLD.chosenLang
            && langInfoFromTinyLD.accuracy > VERY_HIGH_LANG_ACCURACY)
        {
            let msg = `"${langInfoFromTinyLD.chosenLang}" is overconfident (${langInfoFromTinyLD.accuracy}) for "${text}"!`;

            // Use the 2nd language if available, otherwise set accuracy to 0.1
            if (langInfoFromTinyLD.languageAccuracies.length > 1) {
                const newLangInfo = langInfoFromTinyLD.languageAccuracies[1];
                langInfoFromTinyLD.chosenLang = newLangInfo.lang;
                langInfoFromTinyLD.accuracy = newLangInfo.accuracy;
                msg += ` Replaced it with "${langInfoFromTinyLD.chosenLang}" (${langInfoFromTinyLD.accuracy})`;
            } else {
                langInfoFromTinyLD.accuracy = 0.1;
            }

            console.warn(msg, langInfoFromLangDetector);
        }
    }

    const accuracies = [langInfoFromTinyLD.accuracy, langInfoFromLangDetector.accuracy];

    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (       langInfoFromTinyLD.chosenLang
            && langInfoFromTinyLD.chosenLang == langInfoFromLangDetector.chosenLang
            && (
                accuracies.some((a) => a > MIN_LANG_DETECTOR_ACCURACY) // TODO: use isaccurate?
                ||
                accuracies.every((a) => a > (MIN_TINYLD_ACCURACY / 2))
            ))
    {
        chosenLanguage = langInfoFromTinyLD.chosenLang;
    }
    else if (  langInfoFromTinyLD.chosenLang
            && langInfoFromLangDetector.chosenLang
            && langInfoFromTinyLD.chosenLang != langInfoFromLangDetector.chosenLang
    ) {
        // if firstLangFromLangDetector.accuracy is high enough and detectedLang is low enough
        if (langInfoFromLangDetector.isAccurate && langInfoFromTinyLD.accuracy < OVERRULE_LANG_ACCURACY) {
            chosenLanguage = langInfoFromLangDetector.chosenLang;
        } else if (langInfoFromTinyLD.isAccurate && langInfoFromLangDetector.accuracy < OVERRULE_LANG_ACCURACY) {
            chosenLanguage = langInfoFromTinyLD.chosenLang;
        }
    }

    // tinyld is much better at detecting foreign scripts
    if (langInfoFromTinyLD.accuracy >= VERY_HIGH_LANG_ACCURACY && FOREIGN_SCRIPTS.has(langInfoFromTinyLD.chosenLang)) {
        // console.debug(`"${detectedLang}" is foreign script w/high accuracy, using it as determinedLang for "${text}"`);
        chosenLanguage = langInfoFromTinyLD.chosenLang;
    }

    return {
        chosenLanguage,
        langDetector: langInfoFromLangDetector,
        tinyLD: langInfoFromTinyLD,
    };
};


// Returns the language code of the matched regex (if any). This is our janky version of language detection.
export function detectHashtagLanguage(str: string): string | undefined {
    let language: string | undefined;

    Object.entries(LANGUAGE_REGEXES).forEach(([lang, regex]) => {
        if (regex.test(str) && !isNumber(str)) {
            language = lang;
        }
    });

    return language;
};


function buildLangDetectResult(minAccuracy: number, langAccuracies?: LanguageAccuracies): DetectLangLibraryResult {
    langAccuracies ||= [];
    const firstResult = langAccuracies[0];
    const accuracy = firstResult?.accuracy || 0;

    return {
        accuracy,
        chosenLang: firstResult?.lang,
        languageAccuracies: langAccuracies,
        isAccurate: accuracy >= minAccuracy,
    }
};


// Use LanguageDetector library to detect language
function detectLangWithLangDetector(text: string): DetectLangLibraryResult {
    // Reshape LanguageDetector return value to look like tinyLD return value
    const langsFromLangDetector = LANG_DETECTOR.detect(text)?.map(([language, accuracy], i) => {
        let languageCode = LANGUAGE_CODES[language];

        if (!languageCode) {
            if (i < 3) console.warn(`[detectLangWithLangDetector()] "${language}" isn't in LANGUAGE_CODES!"`);
            languageCode = language;
        }

        return {accuracy: accuracy, lang: languageCode};
    });

    return buildLangDetectResult(MIN_LANG_DETECTOR_ACCURACY, langsFromLangDetector);
};


// Use tinyLD library to detect language
function detectLangWithTinyLD(text: string): DetectLangLibraryResult {
    return buildLangDetectResult(MIN_TINYLD_ACCURACY, detectAll(text));
};
