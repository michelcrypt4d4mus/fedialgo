"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("../acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class InteractionsScorer extends acccount_scorer_1.default {
    constructor() {
        super(types_1.WeightName.INTERACTIONS);
    }
    async prepareScoreData() {
        const notifications = await api_1.default.instance.getRecentNotifications();
        const interactionAccounts = notifications.map(notification => new account_1.default(notification.account));
        return account_1.default.buildWebfingerUriLookup(interactionAccounts);
    }
    ;
}
exports.default = InteractionsScorer;
;
//# sourceMappingURL=interactions_scorer.js.map