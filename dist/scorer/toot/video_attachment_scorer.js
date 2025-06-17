"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
/**
 * Score the number of video attachments in the toot.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class VideoAttachmentScorer extends toot_scorer_1.default {
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