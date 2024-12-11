"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    async fetchRequiredData() {
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
    // Add numToots & numAccounts to the trending object by summing numDaysToCountTrendingTagData of 'history'
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
    // Return one of each unique trending object w/numToots & numAccounts set to the max in the Fediverse
    // sorted by numAccounts.
    static uniquifyTrendingObjs(trendingObjs) {
        const urlObjs = trendingObjs.reduce((unique, obj) => {
            if (unique[obj.url]) {
                unique[obj.url].numToots = Math.max(unique[obj.url].numToots || 0, obj.numToots || 0);
                unique[obj.url].numAccounts = Math.max(unique[obj.url].numAccounts || 0, obj.numAccounts || 0);
            }
            else {
                unique[obj.url] = obj;
            }
            return unique;
        }, {});
        return Object.values(urlObjs).sort((a, b) => (b.numAccounts || 0) - (a.numAccounts || 0));
    }
}
exports.default = FeatureScorer;
;
//# sourceMappingURL=feature_scorer.js.map