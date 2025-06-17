"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("../../api/objects/account"));
const acccount_scorer_1 = __importDefault(require("./acccount_scorer"));
const api_1 = __importDefault(require("../../api/api"));
const enums_1 = require("../../enums");
/**
 * Gives higher weight to posts from users that have often interacted with your posts.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class InteractionsScorer extends acccount_scorer_1.default {
    description = "Favour accounts that interact with your toots";
    constructor() {
        super(enums_1.ScoreName.INTERACTIONS);
    }
    async prepareScoreData() {
        const notifications = await api_1.default.instance.getNotifications();
        const interactionAccounts = notifications.map(notification => account_1.default.build(notification.account));
        return account_1.default.countAccounts(interactionAccounts);
    }
    ;
}
exports.default = InteractionsScorer;
;
//# sourceMappingURL=interactions_scorer.js.map