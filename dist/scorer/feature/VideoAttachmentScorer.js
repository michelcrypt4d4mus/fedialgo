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
const types_1 = require("../../types");
// TODO: unclear whether favorites are pulled from servers other than the users' home server
class VideoAttachmentScorer extends feature_scorer_1.default {
    constructor() {
        super({ scoreName: types_1.WeightName.VIDEO_ATTACHMENTS });
    }
    async _score(toot) {
        return (0, toot_1.videoAttachments)(toot).length;
    }
}
exports.default = VideoAttachmentScorer;
;
//# sourceMappingURL=VideoAttachmentScorer.js.map