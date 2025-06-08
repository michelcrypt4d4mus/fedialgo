"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score toots from people who follow you.
 */
const acccount_scorer_1 = __importDefault(require("./acccount_scorer"));
const account_1 = __importDefault(require("../../api/objects/account"));
const api_1 = __importDefault(require("../../api/api"));
const enums_1 = require("../../enums");
class FollowersScorer extends acccount_scorer_1.default {
    description = "Favour accounts who follow you";
    constructor() {
        super(enums_1.ScoreName.FOLLOWERS);
    }
    ;
    async prepareScoreData() {
        const followers = await api_1.default.instance.getFollowers();
        this.logger.debug(`Found ${followers.length} followers:`, followers);
        return account_1.default.countAccounts(followers);
    }
    ;
}
exports.default = FollowersScorer;
;
//# sourceMappingURL=followers_scorer.js.map