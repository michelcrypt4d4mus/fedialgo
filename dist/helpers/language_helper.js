"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHashtagLanguage = exports.detectLanguage = exports.FOREIGN_SCRIPTS = exports.LANGUAGE_CODES = void 0;
/*
 * Detecting language etc.
 */
const languagedetect_1 = __importDefault(require("languagedetect"));
const tinyld_1 = require("tinyld");
const math_helper_1 = require("./math_helper");
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
exports.FOREIGN_SCRIPTS = new Set([
    exports.LANGUAGE_CODES.arabic,
    exports.LANGUAGE_CODES.chinese,
    `${exports.LANGUAGE_CODES.chinese}-CN`,
    `${exports.LANGUAGE_CODES.chinese}-TW`,
    exports.LANGUAGE_CODES.japanese,
    exports.LANGUAGE_CODES.korean,
]);
// TODO: this doesn't seem to match the "de" (で) character in "これを見た人は無言で"??
//       also doesn't match half width "ga" (が) character in "やったことある人がいたら嬉しいゲーム";
//       Both of these are weird - in some editors you can delete just the accent mark
// As a workaround we use a regex that triggers Japanese ID if the first two characters are Japanese
// const JP_CHAR_PATTERN = 'ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}';
// See https://www.regular-expressions.info/unicode.html for unicode regex scripts
// Also https://github.com/slevithan/xregexp/blob/master/tools/output/scripts.js
const LANGUAGE_CHAR_CLASSES = {
    [exports.LANGUAGE_CODES.arabic]: `\\p{Script=Arabic}`,
    [exports.LANGUAGE_CODES.greek]: `\\p{Script=Greek}`,
    [exports.LANGUAGE_CODES.japanese]: 'ー・\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}',
    [exports.LANGUAGE_CODES.korean]: `\\p{Script=Hangul}`,
    [exports.LANGUAGE_CODES.russian]: `\\p{Script=Cyrillic}`,
};
// Matches if whole string is language + numbers OR if there's at least three characters in that language somewhere in the string
const LANGUAGE_REGEXES = Object.entries(LANGUAGE_CHAR_CLASSES).reduce((regexes, [lang, chars]) => {
    regexes[lang] = new RegExp(`^[${chars}\\d]+$|[${chars}]{3}`, 'iv'); // 'v' flag is for unicode sets
    return regexes;
}, {});
const LANG_DETECTOR = new languagedetect_1.default();
const MIN_LANG_DETECTOR_ACCURACY = 0.2; // LanguageDetect library never gets very high accuracy
const MIN_TINYLD_ACCURACY = 0.4; // TinyLD is better at some languages but can be overconfident
const OVERRULE_LANG_ACCURACY = 0.03;
const VERY_HIGH_LANG_ACCURACY = 0.7;
// International locales, see: https://gist.github.com/wpsmith/7604842
const GREEK_LOCALE = `${exports.LANGUAGE_CODES.greek}-GR`;
const JAPANESE_LOCALE = `${exports.LANGUAGE_CODES.japanese}-JP`;
const KOREAN_LOCALE = `${exports.LANGUAGE_CODES.korean}-KR`;
const RUSSIAN_LOCALE = `${exports.LANGUAGE_CODES.russian}-${exports.LANGUAGE_CODES.russian.toUpperCase()}`;
const IGNORE_LANGUAGES = new Set([
    "ber",
    "eo",
    "tk",
    "tlh", // Klingon
]);
const LANG_DETECTOR_OVERCONFIDENT_LANGS = new Set([
    "da",
    "fr",
]);
// Use the two different language detectors to guess a language
function detectLanguage(text) {
    const langInfoFromLangDetector = detectLangWithLangDetector(text);
    const langInfoFromTinyLD = detectLangWithTinyLD(text);
    // We will set determinedLang to be a high confidence guess (if we find one)
    let chosenLanguage;
    if (langInfoFromTinyLD.chosenLang) {
        // Ignore Klingon etc.
        if (IGNORE_LANGUAGES.has(langInfoFromTinyLD.chosenLang)) {
            langInfoFromTinyLD.chosenLang = undefined;
            langInfoFromTinyLD.accuracy = 0;
        }
        // tinyld is overconfident about some languages
        if (LANG_DETECTOR_OVERCONFIDENT_LANGS.has(langInfoFromTinyLD.chosenLang)
            && langInfoFromLangDetector.chosenLang != langInfoFromTinyLD.chosenLang
            && langInfoFromTinyLD.accuracy > VERY_HIGH_LANG_ACCURACY) {
            let msg = `"${langInfoFromTinyLD.chosenLang}" is overconfident (${langInfoFromTinyLD.accuracy}) for "${text}"!`;
            // Use the 2nd language if available, otherwise set accuracy to 0.1
            if (langInfoFromTinyLD.languageAccuracies.length > 1) {
                const newLangInfo = langInfoFromTinyLD.languageAccuracies[1];
                langInfoFromTinyLD.chosenLang = newLangInfo.lang;
                langInfoFromTinyLD.accuracy = newLangInfo.accuracy;
                msg += ` Replaced it with "${langInfoFromTinyLD.chosenLang}" (${langInfoFromTinyLD.accuracy})`;
            }
            else {
                langInfoFromTinyLD.accuracy = 0.1;
            }
            console.warn(msg, langInfoFromLangDetector);
        }
    }
    const accuracies = [langInfoFromTinyLD.accuracy, langInfoFromLangDetector.accuracy];
    // If both detectors agree on the language and one is MIN_LANG_ACCURACY or both are half MIN_LANG_ACCURACY use that
    if (langInfoFromTinyLD.chosenLang
        && langInfoFromTinyLD.chosenLang == langInfoFromLangDetector.chosenLang
        && (accuracies.some((a) => a > MIN_LANG_DETECTOR_ACCURACY) // TODO: use isaccurate?
            ||
                accuracies.every((a) => a > (MIN_TINYLD_ACCURACY / 2)))) {
        chosenLanguage = langInfoFromTinyLD.chosenLang;
    }
    else if (langInfoFromTinyLD.chosenLang
        && langInfoFromLangDetector.chosenLang
        && langInfoFromTinyLD.chosenLang != langInfoFromLangDetector.chosenLang) {
        // if firstLangFromLangDetector.accuracy is high enough and detectedLang is low enough
        if (langInfoFromLangDetector.isAccurate && langInfoFromTinyLD.accuracy < OVERRULE_LANG_ACCURACY) {
            chosenLanguage = langInfoFromLangDetector.chosenLang;
        }
        else if (langInfoFromTinyLD.isAccurate && langInfoFromLangDetector.accuracy < OVERRULE_LANG_ACCURACY) {
            chosenLanguage = langInfoFromTinyLD.chosenLang;
        }
    }
    // tinyld is much better at detecting foreign scripts
    if (langInfoFromTinyLD.accuracy >= VERY_HIGH_LANG_ACCURACY && exports.FOREIGN_SCRIPTS.has(langInfoFromTinyLD.chosenLang)) {
        // console.debug(`"${detectedLang}" is foreign script w/high accuracy, using it as determinedLang for "${text}"`);
        chosenLanguage = langInfoFromTinyLD.chosenLang;
    }
    return {
        chosenLanguage,
        langDetector: langInfoFromLangDetector,
        tinyLD: langInfoFromTinyLD,
    };
}
exports.detectLanguage = detectLanguage;
;
// Returns the language code of the matched regex (if any). Not as thorough as detectLanguage() and only
// meant for non Latin scripts like japanese, korean, etc.
function detectHashtagLanguage(tagName) {
    for (const [language, regex] of Object.entries(LANGUAGE_REGEXES)) {
        if (regex.test(tagName) && !(0, math_helper_1.isNumber)(tagName)) {
            return language;
        }
    }
    ;
}
exports.detectHashtagLanguage = detectHashtagLanguage;
;
function buildLangDetectResult(minAccuracy, langAccuracies) {
    langAccuracies ||= [];
    const firstResult = langAccuracies[0];
    const accuracy = firstResult?.accuracy || 0;
    return {
        accuracy,
        chosenLang: firstResult?.lang,
        languageAccuracies: langAccuracies,
        isAccurate: accuracy >= minAccuracy,
    };
}
;
// Use LanguageDetector library to detect language
function detectLangWithLangDetector(text) {
    // Reshape LanguageDetector return value to look like tinyLD return value
    const langsFromLangDetector = LANG_DETECTOR.detect(text)?.map(([language, accuracy], i) => {
        let languageCode = exports.LANGUAGE_CODES[language];
        if (!languageCode) {
            if (i < 3)
                console.warn(`[detectLangWithLangDetector()] "${language}" isn't in LANGUAGE_CODES!"`);
            languageCode = language;
        }
        return { accuracy: accuracy, lang: languageCode };
    });
    return buildLangDetectResult(MIN_LANG_DETECTOR_ACCURACY, langsFromLangDetector);
}
;
// Use tinyLD library to detect language
function detectLangWithTinyLD(text) {
    return buildLangDetectResult(MIN_TINYLD_ACCURACY, (0, tinyld_1.detectAll)(text));
}
;
//# sourceMappingURL=language_helper.js.map