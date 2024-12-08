"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorateTrendingTag = void 0;
const Storage_1 = __importDefault(require("../../Storage"));
// Lowercase the tag text; inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
function decorateTrendingTag(_tag) {
    let tag = _tag;
    tag.name = tag.name.toLowerCase();
    if (!tag?.history || tag.history.length == 0) {
        console.warn(`decorateTrendingTag() found no history for tag:`, tag);
        tag.history = [];
    }
    const recentHistory = tag.history.slice(0, Storage_1.default.getConfig().numDaysToCountTrendingTagData);
    tag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    tag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return tag;
}
exports.decorateTrendingTag = decorateTrendingTag;
;
//# sourceMappingURL=tag.js.map