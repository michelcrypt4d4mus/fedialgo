import { mastodon } from "masto";
import { FeedFilterSettings } from "../../types";
import { TootExtension, TootScore, TrendingTag } from "../../types";
interface TootObj extends TootExtension {
    containsString: (str: string) => boolean;
    describe: () => string;
    popularity: () => number;
    tootedAt: () => Date;
    imageAttachments: () => Array<mastodon.v1.MediaAttachment>;
    videoAttachments: () => Array<mastodon.v1.MediaAttachment>;
}
export default class Toot implements TootObj {
    id: string;
    uri: string;
    createdAt: string;
    editedAt: string | null;
    account: mastodon.v1.Account;
    content: string;
    visibility: mastodon.v1.StatusVisibility;
    sensitive: boolean;
    spoilerText: string;
    mediaAttachments: mastodon.v1.MediaAttachment[];
    application: mastodon.v1.Application;
    mentions: mastodon.v1.StatusMention[];
    tags: mastodon.v1.Tag[];
    emojis: mastodon.v1.CustomEmoji[];
    reblogsCount: number;
    favouritesCount: number;
    filtered?: mastodon.v1.FilterResult[];
    repliesCount: number;
    url?: string | null;
    inReplyToId?: string | null;
    inReplyToAccountId?: string | null;
    reblog?: Toot | null;
    poll?: mastodon.v1.Poll | null;
    card?: mastodon.v1.PreviewCard | null;
    language?: string | null;
    text?: string | null;
    favourited?: boolean | null;
    reblogged?: boolean | null;
    muted?: boolean | null;
    bookmarked?: boolean | null;
    pinned?: boolean | null;
    followedTags?: mastodon.v1.Tag[];
    isFollowed?: boolean;
    reblogBy?: mastodon.v1.Account;
    scoreInfo?: TootScore;
    trendingRank?: number;
    trendingTags?: TrendingTag[];
    constructor(toot: TootExtension);
    containsString(str: string): boolean;
    describe(): string;
    describeAccount(): string;
    popularity(): number;
    tootedAt(): Date;
    imageAttachments(): Array<mastodon.v1.MediaAttachment>;
    videoAttachments(): Array<mastodon.v1.MediaAttachment>;
    isInTimeline(filters: FeedFilterSettings): boolean;
    isValidForFeed(user: mastodon.v1.Account): boolean;
    repairToot(): void;
    condensedStatus(): {};
    private attachmentsOfType;
    static dedupeToots(toots: Toot[], logLabel?: string): Toot[];
}
export declare const minimumID: (toots: Toot[]) => number | null;
export declare const sortByCreatedAt: (toots: mastodon.v1.Status[]) => mastodon.v1.Status[];
export declare const earliestTootAt: (toots: mastodon.v1.Status[]) => Date | null;
export declare const mostRecentToot: (toots: mastodon.v1.Status[]) => mastodon.v1.Status | null;
export declare const mostRecentTootAt: (toots: mastodon.v1.Status[]) => Date | null;
export declare const earliestToot: (toots: mastodon.v1.Status[]) => mastodon.v1.Status | null;
export declare const tootedAt: (toot: mastodon.v1.Status) => Date;
export {};
