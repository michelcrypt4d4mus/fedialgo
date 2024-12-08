/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
import { mastodon } from "masto";

import Storage from "../../Storage";
import { IMAGE, MEDIA_TYPES, groupBy, isImage } from "../../helpers";
import { Toot } from "../../types";

const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const BROKEN_TAG = "<<BROKEN_TAG>>"
const UNKNOWN_APP = "unknown";


// Return total of favourites and reblogs
export function popularity(toot: Toot): number {
    return (toot.favouritesCount || 0) + (toot.reblogsCount || 0);
};


// Returns a simplified version of the toot for logging
export const condensedStatus = (toot: Toot) => {
    // Contents of toot (the text)
    let content = toot.reblog?.content || toot.content || "";
    if (content.length > MAX_CONTENT_PREVIEW_CHARS) content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
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
    return `${describeTootTime(toot)} (${describeAccount(toot)}): "${toot.content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}..."`;
};


// Build a string that can be used in logs to identify an account
export const describeAccount = (toot: Toot): string => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};


export const describeTootTime = (toot: Toot): string => {
    return `[${toot.createdAt}]: ID: ${toot.id}`;
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


export const sortByCreatedAt = (toots: Toot[]): Toot[] => {
    return toots.toSorted((a, b) => {
        return a.createdAt < b.createdAt ? -1 : 1;
    });
};


export const earliestTootAt = (toots: Toot[]): Date | null => {
    const earliest = earliestToot(toots);
    return earliest ? tootedAt(earliest) : null;
};


// Find the most recent toot in the feed
export const earliestToot = (toots: Toot[]): Toot | null => {
    if (toots.length == 0) return null;

    return toots.reduce(
        (earliest: Toot, toot: Toot) => {
            try {
                return (tootedAt(toot) < tootedAt(earliest)) ? toot : earliest;
            } catch (e) {
                console.warn(`Failed to parse toot's createdAt:`, toot);
                return earliest;
            }
        },
        toots[0]
    );
};


// Repair toot properties:
//   - Set toot.language to defaultLanguage if missing
//   - Set media type to "image" if unknown and reparable
//   - Lowercase all tags
export function repairToot(toot: Toot): void {
    toot.application ??= {name: UNKNOWN_APP};
    toot.application.name ??= UNKNOWN_APP;
    toot.language ??= Storage.getConfig().defaultLanguage;
    toot.followedTags ??= [];

    // Check for weird media types
    toot.mediaAttachments.forEach((media) => {
        if (media.type === "unknown" && isImage(media.remoteUrl)) {
            console.log(`Repairing broken media attachment in toot:`, toot);
            media.type = IMAGE;
        } else if (!MEDIA_TYPES.includes(media.type)) {
            console.warn(`Unknown media type: '${media.type}' for toot:`, toot);
        }
    });

    // Lowercase and count tags
    toot.tags.forEach(tag => {
        tag.name = (tag.name?.length > 0) ? tag.name.toLowerCase() : BROKEN_TAG;
    });
};


export const tootedAt = (toot: Toot): Date => {
    return new Date(toot.createdAt);
};


// Tags get turned into links so we can't just use toot.content.includes(tag)
// example: 'class="mention hashtag" rel="tag">#<span>CatsOfMastodon</span></a>'
export function containsString(toot: Toot, str: string): boolean {
    if (str.startsWith("#")) {
        const tagStr = str.slice(1);
        return toot.tags.some(tag => tag.name.toLowerCase() == tagStr.toLowerCase());
    } else {
        return toot.content.toLowerCase().includes(str.toLowerCase());
    }
};


// Remove dupes by uniquifying on the toot's URI
export function dedupeToots(toots: Toot[], logLabel: string | undefined = undefined): Toot[] {
    const prefix = logLabel ? `[${logLabel}] ` : '';
    const tootsByURI = groupBy<Toot>(toots, (toot) => toot.uri);

    Object.entries(tootsByURI).forEach(([uri, uriToots]) => {
        if (!uriToots || uriToots.length == 0) return;
        const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
        const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()];

        // if (allTrendingTags.length > 0 && uniqueTrendingTags.length != allTrendingTags.length) {
        //     console.debug(`${prefix}allTags for ${uri}:`, allTrendingTags);
        //     console.debug(`${prefix}uniqueTags for ${uri}:`, uniqueTrendingTags);
        // }
        // Set all toots to have all trending tags so when we uniquify we catch everything
        uriToots.forEach((toot) => {
            toot.trendingTags = uniqueTrendingTags || [];
        });
    });

    const deduped = [...new Map(toots.map((toot: Toot) => [toot.uri, toot])).values()];
    console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
    return deduped;
}


// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
