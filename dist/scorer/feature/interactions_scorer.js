"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
const api_1 = require("../../api/api");
class InteractionsScorer extends feature_scorer_1.default {
    constructor() {
        super({
            featureGetter: () => InteractionsScorer.fetchRequiredData(),
            scoreName: types_1.WeightName.INTERACTIONS,
        });
    }
    async _score(toot) {
        return (toot.account.acct in this.feature) ? this.feature[toot.account.acct] : 0;
    }
    static async fetchRequiredData() {
        const results = await api_1.MastoApi.instance.getRecentNotifications();
        console.log(`Retrieved ${results.length} notifications for InteractionsScorer: `, results);
        return results.reduce((interactionCount, notification) => {
            const account = notification?.account?.acct;
            if (!account)
                return interactionCount;
            interactionCount[account] = (interactionCount[account] || 0) + 1;
            return interactionCount;
        }, {});
    }
    ;
}
exports.default = InteractionsScorer;
;
//# sourceMappingURL=interactions_scorer.js.map