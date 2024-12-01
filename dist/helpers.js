"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumID = exports.videoAttachments = exports.imageAttachments = exports.describeToot = exports.describeAccount = exports.extractScoreInfo = exports.condensedStatus = exports.mastodonFetchPages = exports.mastodonFetch = exports._transformKeys = exports.isRecord = exports.MEDIA_TYPES = exports.VIDEO_TYPES = exports.DEFAULT_RECORDS_PER_PAGE = void 0;
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
// Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
exports.DEFAULT_RECORDS_PER_PAGE = 40;
exports.VIDEO_TYPES = ["gifv", "video"];
exports.MEDIA_TYPES = ["image", ...exports.VIDEO_TYPES];
const DEFAULT_MIN_RECORDS_FOR_FEATURE = 160;
const MAX_CONTENT_CHARS = 150;
const HUGE_ID = 10 ** 100;
//Masto does not support top posts from foreign servers, so we have to do it manually
const isRecord = (x) => {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
};
exports.isRecord = isRecord;
// Apply a transform() function to all keys in a nested object.
const _transformKeys = (data, transform) => {
    if (Array.isArray(data)) {
        return data.map((value) => (0, exports._transformKeys)(value, transform));
    }
    if ((0, exports.isRecord)(data)) {
        return Object.fromEntries(Object.entries(data).map(([key, value]) => [
            transform(key),
            (0, exports._transformKeys)(value, transform),
        ]));
    }
    return data;
};
exports._transformKeys = _transformKeys;
// Retrieve Mastodon server information from a given server and endpoint
const mastodonFetch = async (server, endpoint) => {
    try {
        const json = await axios_1.default.get(`https://${server}${endpoint}`);
        if (json.status === 200 && json.data) {
            return (0, exports._transformKeys)(json.data, change_case_1.camelCase);
        }
        else {
            throw json;
        }
    }
    catch (error) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, error);
        return;
    }
};
exports.mastodonFetch = mastodonFetch;
;
// Fetch min_pages pages of a user's [whatever] (toots, notifications, etc.) from the API and return an array
async function mastodonFetchPages({ fetchMethod, minRecords, label }) {
    minRecords ||= DEFAULT_MIN_RECORDS_FOR_FEATURE;
    label ||= "unknown";
    console.debug(`mastodonFetchPages() for ${label} w/ minRecords=${minRecords}, fetchMethod:`, fetchMethod);
    let results = [];
    let pageNumber = 0;
    try {
        for await (const page of fetchMethod({ limit: exports.DEFAULT_RECORDS_PER_PAGE })) {
            results = results.concat(page);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);
            if (results.length >= minRecords) {
                console.log(`Halting old record retrieval at page ${pageNumber} with ${results.length} records)...`);
                break;
            }
        }
    }
    catch (e) {
        console.error(`Error in mastodonFetchPages():`, e);
        return results;
    }
    return results;
}
exports.mastodonFetchPages = mastodonFetchPages;
;
// Returns a simplified version of the toot for logging
const condensedStatus = (toot) => {
    // Contents of toot (the text)
    let content = toot.reblog?.content || toot.content || "";
    if (content.length > MAX_CONTENT_CHARS)
        content = `${content.slice(0, MAX_CONTENT_CHARS)}...`;
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
        score: (0, exports.extractScoreInfo)(toot),
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
// Extract just the various score related variables from a Toot to a new object.
const extractScoreInfo = (toot) => {
    return toot.scoreInfo;
};
exports.extractScoreInfo = extractScoreInfo;
// Build a string that contains the display name, account name, etc. for a given post.
const describeAccount = (toot) => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};
exports.describeAccount = describeAccount;
// Build a string that can be used in logs to identify a toot
const describeToot = (toot) => {
    return `toot #${toot.id} by ${(0, exports.describeAccount)(toot)}: ${toot.content.slice(0, MAX_CONTENT_CHARS)}`;
};
exports.describeToot = describeToot;
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
//# sourceMappingURL=helpers.js.map