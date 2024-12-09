"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
// TODO: rename MostRetootedUsersScorer
class RetootedUsersScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: () => RetootedUsersScorer.fetchRequiredData(),
            scoreName: types_1.WeightName.MOST_RETOOTED_ACCOUNTS,
        });
    }
    async _score(toot) {
        const authorScore = this.feature[toot.account.acct] || 0;
        const retootScore = toot.reblog?.account?.acct ? (this.feature[toot.reblog.account.acct] || 0) : 0;
        return authorScore + retootScore;
    }
    static async fetchRequiredData() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        console.log(`Recent toot history: `, recentToots);
        console.log(`Recent retoot history: `, recentRetoots);
        const retootCounts = (0, helpers_1.countValues)(recentRetoots, (toot) => toot?.reblog?.account?.acct);
        console.log(`Retoot counts:`, retootCounts);
        return retootCounts;
    }
    ;
}
exports.default = RetootedUsersScorer;
;
//# sourceMappingURL=retooted_users_scorer.js.map