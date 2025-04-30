"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score the number of video attachments in the toot.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const types_1 = require("../../types");
class VideoAttachmentScorer extends feature_scorer_1.default {
    constructor() {
        super(types_1.WeightName.VIDEO_ATTACHMENTS);
    }
    async _score(toot) {
        return toot.realToot().videoAttachments.length;
    }
}
exports.default = VideoAttachmentScorer;
;
//# sourceMappingURL=video_attachment_scorer.js.map