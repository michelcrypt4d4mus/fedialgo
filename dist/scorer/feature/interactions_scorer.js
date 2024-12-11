"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const helpers_1 = require("../../helpers");
const api_1 = require("../../api/api");
const types_1 = require("../../types");
class InteractionsScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.INTERACTIONS);
    }
    async featureGetter() {
        const notifications = await api_1.MastoApi.instance.getRecentNotifications();
        return (0, helpers_1.countValues)(notifications, notif => notif?.account?.acct);
    }
    ;
    async _score(toot) {
        return (toot.account.acct in this.requiredData) ? this.requiredData[toot.account.acct] : 0;
    }
}
exports.default = InteractionsScorer;
;
//# sourceMappingURL=interactions_scorer.js.map