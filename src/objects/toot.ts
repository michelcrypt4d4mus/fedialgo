/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
import { mastodon } from "masto";

import { MAX_CONTENT_CHARS } from "../helpers";
import { Toot } from "../types";

const HUGE_ID = 10 ** 100;


// Return total of favourites and reblogs
export function popularity(toot: Toot): number {
    return (toot.favouritesCount || 0) + (toot.reblogsCount || 0);
};


// Returns a simplified version of the toot for logging
export const condensedStatus = (toot: Toot) => {
    // Contents of toot (the text)
    let content = toot.reblog?.content || toot.content || "";
    if (content.length > MAX_CONTENT_CHARS) content = `${content.slice(0, MAX_CONTENT_CHARS)}...`;
    // Account info for the person who tooted it
    let accountLabel = describeAccount(toot);
    if (toot.reblog) accountLabel += ` ｟⬆️⬆️RETOOT of ${describeAccount(toot.reblog)}⬆️⬆️｠`;
    // Attachment info
    let mediaAttachments = toot.mediaAttachments.map(attachment => attachment.type);
    if (mediaAttachments.length == 0) mediaAttachments = [];

    const tootObj = {
        FROM: `${accountLabel} [${toot.createdAt}]`,
        URL: toot.url,
        content: content,
        retootOf: toot.reblog ? `${describeAccount(toot.reblog)} (${toot.reblog.createdAt})` : null,
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
        .filter((k) => tootObj[k as keyof typeof tootObj] != null)
        .reduce((obj, k) => ({ ...obj, [k]: tootObj[k as keyof typeof tootObj] }), {});
};


// Build a string that can be used in logs to identify a toot
export const describeToot = (toot: Toot): string => {
    return `toot #${toot.id} by ${describeAccount(toot)}: ${toot.content.slice(0, MAX_CONTENT_CHARS)}`;
};


// Build a string that can be used in logs to identify an account
export const describeAccount = (toot: Toot): string => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};


// Extract attachments from Toots
export const imageAttachments = (toot: Toot): Array<mastodon.v1.MediaAttachment> => {
    return attachmentsOfType(toot, "image");
};

export const videoAttachments = (toot: Toot): Array<mastodon.v1.MediaAttachment> => {
    const videos = attachmentsOfType(toot, "video");
    const gifs = attachmentsOfType(toot, "gifv");  // gifv format is just an mp4 video file?
    return videos.concat(gifs);
};

const attachmentsOfType = (
    toot: Toot,
    attachmentType: mastodon.v1.MediaAttachmentType
): Array<mastodon.v1.MediaAttachment> => {
    if (toot.reblog) toot = toot.reblog;
    if (!toot.mediaAttachments) return [];
    return toot.mediaAttachments.filter(att => att.type === attachmentType);
};


// Find the minimum ID in a list of toots
export const minimumID = (toots: Toot[]): number | null => {
    const minId =  toots.reduce((min, toot) => {
        const numericalID = parseInt(toot.id);  // IDs are not guaranteed to be numerical

        if (isNaN(numericalID)) {
            console.warn(`toot.id is not a number: ${toot.id}`);
            return min;
        }

        return numericalID < min ? numericalID : min;
    }, HUGE_ID);

    return minId == HUGE_ID ? null : minId;
};

// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
