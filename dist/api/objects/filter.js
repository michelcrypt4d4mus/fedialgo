"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMutedKeywords = exports.buildMutedRegex = void 0;
const logger_1 = __importDefault(require("../../helpers/logger"));
const string_helpers_1 = require("../../helpers/string_helpers");
const logger = new logger_1.default(`filter.ts`);
function buildMutedRegex(serverSideFilters) {
    return (0, string_helpers_1.wordsRegex)(extractMutedKeywords(serverSideFilters));
}
exports.buildMutedRegex = buildMutedRegex;
;
function extractMutedKeywords(serverSideFilters) {
    let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
    keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
    logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
    return keywords;
}
exports.extractMutedKeywords = extractMutedKeywords;
;
//# sourceMappingURL=filter.js.map