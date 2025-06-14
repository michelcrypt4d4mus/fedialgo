"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score the number of video attachments in the toot.
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const enums_1 = require("../../enums");
class VideoAttachmentScorer extends feature_scorer_1.default {
    description = "Favour video attachments";
    constructor() {
        super(enums_1.ScoreName.VIDEO_ATTACHMENTS);
    }
    async _score(toot) {
        return toot.realToot.videoAttachments.length;
    }
}
exports.default = VideoAttachmentScorer;
;
//# sourceMappingURL=video_attachment_scorer.js.map