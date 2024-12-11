"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Base class for a "feature scorer" which appears to be something that can score
 * a toot based solely on the properties of that toot, optionally coupled with other
 * data can be compiled before retrieving the whole feed, e.g. numFavorites, etc.
 */
const scorer_1 = __importDefault(require("./scorer"));
const Storage_1 = __importDefault(require("../Storage"));
// TODO: Find a better name than "Feature" for this class
class FeatureScorer extends scorer_1.default {
    requiredData = {};
    constructor(scoreName) {
        super(scoreName);
    }
    // Can be overloaded in subclasses to retrieve feature data from the server
    async featureGetter() {
        return {};
    }
    async getFeature() {
        try {
            this.requiredData = await this.featureGetter();
        }
        catch (e) {
            console.warn(`Error in getFeature() for ${this.name}:`, e);
        }
        console.log(`${this.constructor.name} featureGetter() returned:`, this.requiredData);
        this.isReady = true;
        return []; // this is a hack so we can safely use Promise.all().flat() to pull startup data
    }
    // Add numToots and numAccounts to the TrendingLink or TrendingTag object
    static decorateHistoryScores(_obj) {
        const obj = _obj;
        obj.url = obj.url.toLowerCase();
        if (!obj?.history?.length) {
            console.warn(`decorateHistoryScores() found no history for:`, obj);
            obj.history = [];
        }
        const recentHistory = obj.history.slice(0, Storage_1.default.getConfig().numDaysToCountTrendingTagData);
        obj.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
        obj.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    }
    ;
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map