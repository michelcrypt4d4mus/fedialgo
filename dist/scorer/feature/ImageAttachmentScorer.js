"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score how many times the toot has been favorited by other users.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const toot_1 = require("../../objects/toot");
const SCORE_NAME = "ImageAttachments";
// TODO: unclear whether favorites are pulled from servers other than the users' home server
class ImageAttachmentScorer extends feature_scorer_1.default {
    constructor() {
        super({
            description: "Favour image attachments",
            defaultWeight: 0,
            scoreName: SCORE_NAME,
        });
    }
    async _score(toot) {
        return (0, toot_1.imageAttachments)(toot).length;
    }
}
exports.default = ImageAttachmentScorer;
;
//# sourceMappingURL=ImageAttachmentScorer.js.map