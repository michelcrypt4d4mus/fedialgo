import axios from "axios";
import { camelCase } from "change-case";

import { StatusType } from "./types";

const MAX_CONTENT_CHARS = 150;


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
        console.warn(`Error fetching data for server ${server}:`, error);
        return;
    }
};


// Returns a simplified version of the status for logging
export const condensedStatus = (status: StatusType) => {
    // Contents of post (the text)
    let content = status.reblog?.content || status.content || "";
    if (content.length > MAX_CONTENT_CHARS) content = `${content.slice(0, MAX_CONTENT_CHARS)}...`;
    // Account info
    let accountLabel = describePoster(status);
    if (status.reblog) accountLabel += ` ｟⬆️⬆️RETOOT of ${describePoster(status.reblog)}⬆️⬆️｠`;
    // Attachment info
    let mediaAttachments = status.mediaAttachments.map(attachment => attachment.type);
    if (mediaAttachments.length == 0) mediaAttachments = [];

    const statusObj = {
        FROM: `${accountLabel} [${status.createdAt}]`,
        URL: status.url,
        content: content,
        retootOf: status.reblog ? `${describePoster(status.reblog)} (${status.reblog.createdAt})` : null,
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
                 .filter((k) => statusObj[k as keyof typeof statusObj] != null)
                 .reduce((obj, k) => ({ ...obj, [k]: statusObj[k as keyof typeof statusObj] }), {});
};


// Build a string that contains the display name, account name, etc. for a given post.
const describePoster = (status: StatusType): string => {
    return `${status.account.displayName} (${status.account.acct})`;
};
