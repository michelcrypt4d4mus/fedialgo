"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoAttachments = exports.imageAttachments = exports.describeAccount = exports.describeToot = exports.condensedStatus = exports.popularity = void 0;
const helpers_1 = require("../helpers");
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
    if (content.length > helpers_1.MAX_CONTENT_CHARS)
        content = `${content.slice(0, helpers_1.MAX_CONTENT_CHARS)}...`;
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
}; // Build a string that can be used in logs to identify a toot
exports.condensedStatus = condensedStatus;
const describeToot = (toot) => {
    return `toot #${toot.id} by ${(0, exports.describeAccount)(toot)}: ${toot.content.slice(0, helpers_1.MAX_CONTENT_CHARS)}`;
};
exports.describeToot = describeToot;
const describeAccount = (toot) => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};
exports.describeAccount = describeAccount;
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
// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
//# sourceMappingURL=toot.js.map