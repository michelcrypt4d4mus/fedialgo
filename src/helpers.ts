import axios from "axios";
import { camelCase } from "change-case";
import { StatusType } from "./types";

const CONTENT_CHARS_TO_LOG = 150;


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
    let content = status.reblog?.content || status.content || "";
    if (content.length > CONTENT_CHARS_TO_LOG) content = content.slice(0, CONTENT_CHARS_TO_LOG) + '...';

    let mediaAttachments = status.mediaAttachments.map(attachment => attachment.type);
    if (mediaAttachments.length == 0) mediaAttachments = [];
    let tooterLabel = describePoster(status);
    if (status.reblog) tooterLabel += ` ｟⬆️⬆️RETOOT of ${describePoster(status.reblog)}⬆️⬆️｠`;

    const statusObj = {
        FROM: `${tooterLabel} [${status.createdAt}]`,
        URL: status.url,
        content: content,
        retootOf: status.reblog ? `${status.reblog.account.acct} (${status.reblog.createdAt})` : null,
        inReplyToId: status.inReplyToId,
        mediaAttachments: mediaAttachments,

        properties: {
            favouritesCount: status.favouritesCount,
            reblogsCount: status.reblogsCount,
            repliesCount: status.repliesCount,
            tags: (status.tags || status.reblog?.tags || []).map(t => `#${t.name}`).join(" "),
        },

        score: {
            timeWeightedScore: status.value,
            rawScore: status.rawScore,
            timeDiscount: status.timeDiscount,
            scoreComponents: status.scores,
            scoreComponentsWeighted: status.weightedScores,
        },

        raw: status,
    };

    return Object.keys(statusObj)
                 .filter((k) => statusObj[k as keyof typeof statusObj] != null)
                 .reduce((obj, k) => ({ ...obj, [k]: statusObj[k as keyof typeof statusObj] }), {});
};


// Build a string that contains the display name, account name, etc. for a given post.
const describePoster = (status: StatusType): string => {
    // if (!status?.account) return null;
    return `${status.account.displayName} (${status.account.acct})`;
};
