"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorateTrendingTag = void 0;
const Storage_1 = __importDefault(require("../../Storage"));
// Lowercase the tag text; inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
function decorateTrendingTag(tag) {
    const trendingTag = tag;
    trendingTag.name = trendingTag.name.toLowerCase();
    if (!trendingTag?.history || trendingTag.history.length == 0) {
        console.warn(`decorateTrendingTag() found no history for tag:`, trendingTag);
        trendingTag.history = [];
    }
    const recentHistory = trendingTag.history.slice(0, Storage_1.default.getConfig().numDaysToCountTrendingTagData);
    trendingTag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    trendingTag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return trendingTag;
}
exports.decorateTrendingTag = decorateTrendingTag;
;
//# sourceMappingURL=tag.js.map