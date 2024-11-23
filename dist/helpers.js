"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.condensedStatus = exports.mastodonFetchPages = exports.mastodonFetch = exports._transformKeys = exports.isRecord = void 0;
const axios_1 = __importDefault(require("axios"));
const change_case_1 = require("change-case");
const MAX_CONTENT_CHARS = 150;
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
        console.warn(`Error fetching data for server ${server}: `, error);
        return;
    }
};
exports.mastodonFetch = mastodonFetch;
// Fetch N pages of a user's [whatever] (toots, notifications, etc.) from the server and rerun as an arry
async function mastodonFetchPages(fetchMethod, min_pages, max_records) {
    console.log(`mastodonFetchPages() called with min_pages=${min_pages}, max_records=${max_records}`);
    let results = [];
    let pageNumber = 0;
    try {
        for await (const page of fetchMethod({ limit: max_records })) {
            results = results.concat(page);
            pageNumber++;
            console.log(`Retrieved page ${pageNumber} of current user's records...`);
            if (pageNumber >= min_pages || results.length >= max_records) {
                console.log(`Halting old record retrieval at page ${pageNumber} with ${results.length} records)...`);
                break;
            }
        }
    }
    catch (e) {
        console.error(e);
        return results;
    }
    return results;
}
exports.mastodonFetchPages = mastodonFetchPages;
// Returns a simplified version of the status for logging
const condensedStatus = (status) => {
    // Contents of post (the text)
    let content = status.reblog?.content || status.content || "";
    if (content.length > MAX_CONTENT_CHARS)
        content = `${content.slice(0, MAX_CONTENT_CHARS)}...`;
    // Account info
    let accountLabel = describeAccount(status);
    if (status.reblog)
        accountLabel += ` ｟⬆️⬆️RETOOT of ${describeAccount(status.reblog)}⬆️⬆️｠`;
    // Attachment info
    let mediaAttachments = status.mediaAttachments.map(attachment => attachment.type);
    if (mediaAttachments.length == 0)
        mediaAttachments = [];
    const statusObj = {
        FROM: `${accountLabel} [${status.createdAt}]`,
        URL: status.url,
        content: content,
        retootOf: status.reblog ? `${describeAccount(status.reblog)} (${status.reblog.createdAt})` : null,
        inReplyToId: status.inReplyToId,
        mediaAttachments: mediaAttachments,
        raw: status,
        properties: {
            favouritesCount: status.favouritesCount,
            reblogsCount: status.reblogsCount,
            repliesCount: status.repliesCount,
            tags: (status.tags || status.reblog?.tags || []).map(t => `#${t.name}`).join(" "),
        },
        score: {
            rawScore: status.rawScore,
            scoreComponents: status.scores,
            scoreComponentsWeighted: status.weightedScores,
            timeDiscount: status.timeDiscount,
            timeWeightedScore: status.value,
        },
    };
    return Object.keys(statusObj)
        .filter((k) => statusObj[k] != null)
        .reduce((obj, k) => ({ ...obj, [k]: statusObj[k] }), {});
};
exports.condensedStatus = condensedStatus;
// Build a string that contains the display name, account name, etc. for a given post.
const describeAccount = (status) => {
    return `${status.account.displayName} (${status.account.acct})`;
};
//# sourceMappingURL=helpers.js.map