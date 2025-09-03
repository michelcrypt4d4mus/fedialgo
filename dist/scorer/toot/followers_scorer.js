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
 * One point for accounts that follow the Fedialgo user.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class FollowersScorer extends acccount_scorer_1.default {
    description = "Favour accounts who follow you";
    constructor() {
        super(enums_1.ScoreName.FOLLOWERS);
    }
    ;
    async prepareScoreData() {
        return account_1.default.countAccounts(await api_1.default.instance.getFollowers());
    }
    ;
}
exports.default = FollowersScorer;
;
//# sourceMappingURL=followers_scorer.js.map