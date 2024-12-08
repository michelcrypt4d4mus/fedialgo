"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsString = exports.tootedAt = exports.repairToot = exports.earliestToot = exports.earliestTootAt = exports.sortByCreatedAt = exports.minimumID = exports.videoAttachments = exports.imageAttachments = exports.describeTootTime = exports.describeAccount = exports.describeToot = exports.condensedStatus = exports.popularity = exports.EARLIEST_TIMESTAMP = void 0;
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
exports.EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const BROKEN_TAG = "<<BROKEN_TAG>>";
const UNKNOWN_APP = "unknown";
// Return total of favourites and reblogs
function popularity(toot) {
    return (toot.favouritesCount || 0) + (toot.reblogsCount || 0);
}
exports.popularity = popularity;
;
// Returns a simplified version of the toot for logging
const condensedStatus = (toot) => {
    // Contents of toot (the text)
    let content = toot.reblog?.content || toot.content || "";
    if (content.length > MAX_CONTENT_PREVIEW_CHARS)
        content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
    // Account info for the person who tooted it
    let accountLabel = (0, exports.describeAccount)(toot);
    if (toot.reblog)
        accountLabel += ` ｟⬆️⬆️RETOOT of ${(0, exports.describeAccount)(toot.reblog)}⬆️⬆️｠`;
    // Attachment info
    let mediaAttachments = toot.mediaAttachments.map(attachment => attachment.type);
    if (mediaAttachments.length == 0)
        mediaAttachments = [];
    const tootObj = {
        FROM: `${accountLabel} [${toot.createdAt}]`,
        URL: toot.url,
        content: content,
        retootOf: toot.reblog ? `${(0, exports.describeAccount)(toot.reblog)} (${toot.reblog.createdAt})` : null,
        inReplyToId: toot.inReplyToId,
        mediaAttachments: mediaAttachments,
        raw: toot,
        scoreInfo: toot.scoreInfo,
        properties: {
            favouritesCount: toot.favouritesCount,
            reblogsCount: toot.reblogsCount,
            repliesCount: toot.repliesCount,
            tags: (toot.tags || toot.reblog?.tags || []).map(t => `#${t.name}`).join(" "),
        },
    };
    return Object.keys(tootObj)
        .filter((k) => tootObj[k] != null)
        .reduce((obj, k) => ({ ...obj, [k]: tootObj[k] }), {});
};
exports.condensedStatus = condensedStatus;
// Build a string that can be used in logs to identify a toot
const describeToot = (toot) => {
    return `${(0, exports.describeTootTime)(toot)} (${(0, exports.describeAccount)(toot)}): "${toot.content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}..."`;
};
exports.describeToot = describeToot;
// Build a string that can be used in logs to identify an account
const describeAccount = (toot) => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};
exports.describeAccount = describeAccount;
const describeTootTime = (toot) => {
    return `[${toot.createdAt}]: ID: ${toot.id}`;
};
exports.describeTootTime = describeTootTime;
// Extract attachments from Toots
const imageAttachments = (toot) => {
    return attachmentsOfType(toot, "image");
};
exports.imageAttachments = imageAttachments;
const videoAttachments = (toot) => {
    const videos = attachmentsOfType(toot, "video");
    const gifs = attachmentsOfType(toot, "gifv"); // gifv format is just an mp4 video file?
    return videos.concat(gifs);
};
exports.videoAttachments = videoAttachments;
const attachmentsOfType = (toot, attachmentType) => {
    if (toot.reblog)
        toot = toot.reblog;
    if (!toot.mediaAttachments)
        return [];
    return toot.mediaAttachments.filter(att => att.type === attachmentType);
};
// Find the minimum ID in a list of toots
const minimumID = (toots) => {
    const minId = toots.reduce((min, toot) => {
        const numericalID = parseInt(toot.id); // IDs are not guaranteed to be numerical
        if (isNaN(numericalID)) {
            console.warn(`toot.id is not a number: ${toot.id}`);
            return min;
        }
        return numericalID < min ? numericalID : min;
    }, HUGE_ID);
    return minId == HUGE_ID ? null : minId;
};
exports.minimumID = minimumID;
const sortByCreatedAt = (toots) => {
    return toots.toSorted((a, b) => {
        return a.createdAt < b.createdAt ? -1 : 1;
    });
};
exports.sortByCreatedAt = sortByCreatedAt;
const earliestTootAt = (toots) => {
    const earliest = (0, exports.earliestToot)(toots);
    return earliest ? (0, exports.tootedAt)(earliest) : null;
};
exports.earliestTootAt = earliestTootAt;
// Find the most recent toot in the feed
const earliestToot = (toots) => {
    if (toots.length == 0)
        return null;
    return toots.reduce((earliest, toot) => {
        try {
            return ((0, exports.tootedAt)(toot) < (0, exports.tootedAt)(earliest)) ? toot : earliest;
        }
        catch (e) {
            console.warn(`Failed to parse toot's createdAt:`, toot);
            return earliest;
        }
    }, toots[0]);
};
exports.earliestToot = earliestToot;
// Repair toot properties:
//   - Set toot.language to defaultLanguage if missing
//   - Set media type to "image" if unknown and reparable
//   - Lowercase all tags
function repairToot(toot) {
    toot.application ??= { name: UNKNOWN_APP };
    toot.application.name ??= UNKNOWN_APP;
    toot.language ??= Storage_1.default.getConfig().defaultLanguage;
    toot.followedTags ??= [];
    // Check for weird media types
    toot.mediaAttachments.forEach((media) => {
        if (media.type === "unknown" && (0, helpers_1.isImage)(media.remoteUrl)) {
            console.log(`Repairing broken media attachment in toot:`, toot);
            media.type = helpers_1.IMAGE;
        }
        else if (!helpers_1.MEDIA_TYPES.includes(media.type)) {
            console.warn(`Unknown media type: '${media.type}' for toot:`, toot);
        }
    });
    // Lowercase and count tags
    toot.tags.forEach(tag => {
        tag.name = (tag.name?.length > 0) ? tag.name.toLowerCase() : BROKEN_TAG;
    });
}
exports.repairToot = repairToot;
;
const tootedAt = (toot) => {
    return new Date(toot.createdAt);
};
exports.tootedAt = tootedAt;
// Tags get turned into links so we can't just use toot.content.includes(tag)
// example: 'class="mention hashtag" rel="tag">#<span>CatsOfMastodon</span></a>'
function containsString(toot, str) {
    if (str.startsWith("#")) {
        const tagStr = str.slice(1);
        return toot.tags.some(tag => tag.name.toLowerCase() == tagStr.toLowerCase());
    }
    else {
        return toot.content.toLowerCase().includes(str.toLowerCase());
    }
}
exports.containsString = containsString;
;
// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
//# sourceMappingURL=toot.js.map