import axios from "axios";
import { camelCase } from "change-case";
import { mastodon } from "masto";

import { Toot } from "./types";

// Max per page is usually 40: https://docs.joinmastodon.org/methods/timelines/#request-2
export const DEFAULT_RECORDS_PER_PAGE = 40;
export const VIDEO_TYPES = ["video", "gifv"];
export const MEDIA_TYPES = ["image", ...VIDEO_TYPES];
const DEFAULT_MIN_RECORDS_FOR_FEATURE = 160;
const MAX_CONTENT_CHARS = 150;
const HUGE_ID = 10 ** 100;


//Masto does not support top posts from foreign servers, so we have to do it manually
export const isRecord = (x: unknown): x is Record<string, unknown> => {
    return typeof x === "object" && x !== null && x.constructor.name === "Object";
}


// Apply a transform() function to all keys in a nested object.
export const _transformKeys = <T>(data: T, transform: (key: string) => string): T => {
    if (Array.isArray(data)) {
        return data.map((value) => _transformKeys<T>(value, transform)) as T;
    }

    if (isRecord(data)) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                transform(key),
                _transformKeys(value, transform),
            ]),
        ) as T;
    }

    return data as T;
};


// Retrieve Mastodon server information from a given server and endpoint
export const mastodonFetch = async <T>(server: string, endpoint: string): Promise<T | undefined> => {
    try {
        const json = await axios.get<T>(`https://${server}${endpoint}`);

        if (json.status === 200 && json.data) {
            return _transformKeys(json.data, camelCase);
        } else {
            throw json;
        }
    } catch (error) {
        console.warn(`Error fetching data for server ${server} from endpoint '${endpoint}'`, error);
        return;
    }
};


interface FetchParams<T> {
    fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>,
    minRecords?: number,
    label?: string,
};

// Fetch min_pages pages of a user's [whatever] (toots, notifications, etc.) from the API and return an array
export async function mastodonFetchPages<T>({
    fetchMethod,
    minRecords,
    label
}: FetchParams<T>): Promise<T[]> {
    minRecords ||= DEFAULT_MIN_RECORDS_FOR_FEATURE;
    label ||= label;
    console.debug(`mastodonFetchPages() for ${label} w/ minRecords=${minRecords}, fetchMethod:`, fetchMethod);
    let results: T[] = [];
    let pageNumber = 0;

    try {
        for await (const page of fetchMethod({ limit: DEFAULT_RECORDS_PER_PAGE })) {
            results = results.concat(page as T[]);
            console.log(`Retrieved page ${++pageNumber} of current user's ${label}...`);

            if (results.length >= minRecords) {
                console.log(`Halting old record retrieval at page ${pageNumber} with ${results.length} records)...`);
                break;
            }
        }
    } catch (e) {
        console.error(`Error in mastodonFetchPages():`, e);
        return results;
    }

    return results;
}


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
        score: extractScoreInfo(toot),

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


// Extract just the various score related variables from a Toot to a new object.
export const extractScoreInfo = (toot: Toot) => {
    return {
        rawScore: toot.rawScore,
        scoreComponents: toot.scores,
        scoreComponentsWeighted: toot.weightedScores,
        timeDecayMultiplier: toot.timeDecayMultiplier,
        timeWeightedScore: toot.value,
    };
};


// Build a string that contains the display name, account name, etc. for a given post.
export const describeAccount = (toot: Toot): string => {
    return `${toot.account.displayName} (${toot.account.acct})`;
};


// Build a string that can be used in logs to identify a toot
export const describeToot = (toot: Toot): string => {
    return `toot #${toot.id} by ${describeAccount(toot)}: ${toot.content.slice(0, MAX_CONTENT_CHARS)}`;
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
