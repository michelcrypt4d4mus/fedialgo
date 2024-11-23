"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been replied to by other users.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const FeatureStore_1 = __importDefault(require("../../features/FeatureStore"));
class numRepliesScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            featureGetter: (api) => FeatureStore_1.default.getTopFavs(api),
            verboseName: "numReplies",
            description: "Favor posts that have been replied to many times",
            defaultWeight: 1,
        });
    }
    async score(_api, toot) {
        return toot?.repliesCount || 0;
    }
}
exports.default = numRepliesScorer;
;
//# sourceMappingURL=numRepliesScorer.js.map