"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score a toot based on how many times the user has retooted the author (or
 * the original author if it's a retoot).
 */
const acccount_scorer_1 = __importDefault(require("../acccount_scorer"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = __importDefault(require("../../api/api"));
const types_1 = require("../../types");
class MostRetootedUsersScorer extends acccount_scorer_1.default {
    constructor() {
        super(types_1.WeightName.MOST_RETOOTED_ACCOUNTS);
    }
    async prepareScoreData() {
        const recentToots = await api_1.default.instance.getUserRecentToots();
        const recentRetoots = recentToots.filter(toot => toot?.reblog);
        return (0, collection_helpers_1.countValues)(recentRetoots, (toot) => toot.reblog?.account?.webfingerURI);
    }
    ;
}
exports.default = MostRetootedUsersScorer;
;
//# sourceMappingURL=most_retooted_users_scorer.js.map