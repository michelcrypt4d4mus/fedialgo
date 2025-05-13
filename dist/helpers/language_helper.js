"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHashtagLanguage = exports.detectLangInfo = exports.LANGUAGE_REGEXES = exports.RUSSIAN_LOCALE = exports.KOREAN_LOCALE = exports.JAPANESE_LOCALE = exports.GREEK_LOCALE = exports.FOREIGN_SCRIPTS = exports.LANGUAGE_CODES = exports.OVERCONFIDENT_LANGUAGES = exports.IGNORE_LANGUAGES = exports.LANGUAGE_DETECTOR = exports.VERY_HIGH_LANG_ACCURACY = exports.MIN_ALT_LANG_ACCURACY = exports.MIN_LANG_ACCURACY = void 0;
/*
 * Detecting language etc.
 */
const languagedetect_1 = __importDefault(require("languagedetect"));
const tinyld_1 = require("tinyld");
const string_helpers_1 = require("./string_helpers");
exports.MIN_LANG_ACCURACY = 0.4;
exports.MIN_ALT_LANG_ACCURACY = 0.2; // LanguageDetect never gets very high accuracy
exports.VERY_HIGH_LANG_ACCURACY = 0.7;
exports.LANGUAGE_DETECTOR = new languagedetect_1.default();
const OVERRULE_LANG_ACCURACY = 0.03;
const LOG_LANUAGE_DETECTOR = true;
exports.IGNORE_LANGUAGES = [
    "ber",
    "eo",
    "tk",
    "tlh", // Klingon
];
exports.OVERCONFIDENT_LANGUAGES = [
    "da",
    "fr",
];
// From https://gist.github.com/jrnk/8eb57b065ea0b098d571
exports.LANGUAGE_CODES = {
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
    pidgin: "en",
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
exports.FOREIGN_SCRIPTS = [
    exports.LANGUAGE_CODES.arabic,
    exports.LANGUAGE_CODES.chinese,
    `${exports.LANGUAGE_CODES.chinese}-CN`,
    `${exports.LANGUAGE_CODES.chinese}-TW`,
    exports.LANGUAGE_CODES.japanese,
    exports.LANGUAGE_CODES.korean,
];
// International locales, see: https://gist.github.com/wpsmith/7604842
exports.GREEK_LOCALE = `${exports.LANGUAGE_CODES.greek}-GR`;
exports.JAPANESE_LOCALE = `${exports.LANGUAGE_CODES.japanese}-JP`;
exports.KOREAN_LOCALE = `${exports.LANGUAGE_CODES.korean}-KR`;
exports.RUSSIAN_LOCALE = `${exports.LANGUAGE_CODES.russian}-${exports.LANGUAGE_CODES.russian.toUpperCase()}`;
// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
exports.LANGUAGE_REGEXES = {
    [exports.LANGUAGE_CODES.arabic]: new RegExp(`^[\\p{Script=Arabic}\\d]+$`, 'v'),
    [exports.LANGUAGE_CODES.greek]: new RegExp(`^[\\p{Script=Greek}\\d]+$`, 'v'),
    [exports.LANGUAGE_CODES.japanese]: new RegExp(`^[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}]{2,}[ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\da-z]*$`, 'v'),
    [exports.LANGUAGE_CODES.korean]: new RegExp(`^[\\p{Script=Hangul}\\d]+$`, 'v'),
    [exports.LANGUAGE_CODES.russian]: new RegExp(`^[\\p{Script=Cyrillic}\\d]+$`, 'v'),
};
// Use the two different language detectors to guess a language
const detectLangInfo = (text) => {
    // Use the tinyld language detector to get the detectedLang
    const detectedLangs = (0, tinyld_1.detectAll)(text);
    let detectedLang = detectedLangs[0]?.lang;
    let detectedLangAccuracy = detectedLangs[0]?.accuracy || 0;
    // Use LanguageDetector to get the altLanguage
    const altDetectedLangs = exports.LANGUAGE_DETECTOR.detect(text);
    let altLanguage = altDetectedLangs.length ? altDetectedLangs[0][0] : undefined;
    const altLangAccuracy = altDetectedLangs.length ? altDetectedLangs[0][1] : 0;
    if (altLanguage && altLanguage in exports.LANGUAGE_CODES) {
        altLanguage = exports.LANGUAGE_CODES[altLanguage];
    }
    else if (altLanguage) {
        console.warn(`[detectLangInfo()] altLanguage "${altLanguage}" found but not in LANGUAGE_CODES!"`);
    }
    // Ignore Klingon etc.
    if (detectedLang) {
        if (exports.IGNORE_LANGUAGES.includes(detectedLang)) {
            detectedLang = undefined;
            detectedLangAccuracy = 0;
        }
        // tinyld is overconfident about some languages
        if (exports.OVERCONFIDENT_LANGUAGES.includes(detectedLang || string_helpers_1.NULL)
            && detectedLangAccuracy > exports.VERY_HIGH_LANG_ACCURACY
            && altLanguage
            && altLanguage != detectedLang) {
            let warning = `"${detectedLang}" is overconfident (${detectedLangAccuracy}) for "${text}"!`;
            console.warn(`${warning} altLanguage="${altLanguage}" (accuracy: ${altLangAccuracy.toPrecision(4)})`);
            if (detectedLangs.length > 1) {
                detectedLang = detectedLangs[1].lang;
                detectedLangAccuracy = detectedLangs[1].accuracy;
            }
            else {
                detectedLangAccuracy = 0.1;
            }
        }
    }
    const accuracies = [detectedLangAccuracy, altLangAccuracy];
    const summary = `detectedLang="${detectedLang}" (accuracy: ${detectedLangAccuracy.toPrecision(4)})` +
        `, altDetectedLang="${altLanguage}" (accuracy: ${altLangAccuracy?.toPrecision(4)})`;
    // We will set determinedLang to be a high confidence guess (if we find one)
    let determinedLang;
    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (detectedLang
        && detectedLang == altLanguage
        && accuracies.some((a) => a > exports.MIN_ALT_LANG_ACCURACY) || accuracies.every((a) => a > (exports.MIN_LANG_ACCURACY / 2))) {
        determinedLang = detectedLang;
    }
    else if (altLanguage && detectedLang && altLanguage != detectedLang) {
        // if altLangAccuracy is high enough and detectedLang is low enough
        if (altLangAccuracy >= exports.MIN_ALT_LANG_ACCURACY) {
            if (detectedLangAccuracy < OVERRULE_LANG_ACCURACY) {
                determinedLang = altLanguage;
            }
            else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        }
        else if (detectedLangAccuracy >= exports.MIN_LANG_ACCURACY) {
            if (altLangAccuracy < OVERRULE_LANG_ACCURACY) {
                detectedLang = detectedLang;
            }
            else {
                // traceLog(`[detectLangInfo()] languages disagree too much for "${text}". ${summary}`);
            }
        }
    }
    // tinyld is much better at detecting foreign scripts
    if (detectedLangAccuracy >= exports.VERY_HIGH_LANG_ACCURACY && exports.FOREIGN_SCRIPTS.includes(detectedLang || string_helpers_1.NULL)) {
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
exports.detectLangInfo = detectLangInfo;
// Returns the language code of the matched regex (if any). This is our janky version of language detection.
const detectHashtagLanguage = (str) => {
    let language;
    Object.entries(exports.LANGUAGE_REGEXES).forEach(([lang, regex]) => {
        if (regex.test(str) && !(0, string_helpers_1.isNumber)(str)) {
            language = lang;
        }
    });
    return language;
};
exports.detectHashtagLanguage = detectHashtagLanguage;
//# sourceMappingURL=language_helper.js.map