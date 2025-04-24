"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class MostRetootedUsersScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.MOST_RETOOTED_ACCOUNTS);
    }
    async featureGetter() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        return (0, helpers_1.countValues)(recentRetoots, (toot) => toot.reblog?.account?.webfingerURI());
    }
    ;
    async _score(toot) {
        const authorScore = this.requiredData[toot.account.webfingerURI()] || 0;
        const retootScore = this.requiredData[toot.reblog?.account?.webfingerURI() || "NONE"] || 0;
        return authorScore + retootScore;
    }
    ;
}
exports.default = MostRetootedUsersScorer;
;
//# sourceMappingURL=most_retooted_users_scorer.js.map