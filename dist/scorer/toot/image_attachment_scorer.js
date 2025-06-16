"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score the number of image attachments in the toot.
 */
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
class ImageAttachmentScorer extends toot_scorer_1.default {
    description = "Favour toots with images";
    constructor() {
        super(enums_1.ScoreName.IMAGE_ATTACHMENTS);
    }
    async _score(toot) {
        return toot.realToot.imageAttachments.length;
    }
}
exports.default = ImageAttachmentScorer;
;
//# sourceMappingURL=image_attachment_scorer.js.map