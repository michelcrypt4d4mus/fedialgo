import { mastodon } from "masto";
import { FeedFilterSettings, StatusList, TootScore, TrendingLink, TrendingTag } from "../../types";
import { TheAlgorithm } from "../..";
export declare enum TootVisibility {
    DIRECT_MSG = "direct",
    PUBLIC = "public",
    PRIVATE = "private",
    UNLISTED = "unlisted"
}
export interface SerializableToot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];
    isFollowed?: boolean;
    reblog?: SerializableToot | null;
    reblogsBy?: mastodon.v1.Account[];
    resolveAttempted?: boolean;
    resolvedToot?: Toot;
    scoreInfo?: TootScore;
    trendingLinks?: TrendingLink[];
    trendingRank?: number;
    trendingTags?: TrendingTag[];
}
interface TootObj extends SerializableToot {
    containsString: (str: string) => boolean;
    describe: () => string;
    homserverAccountURL: () => string;
    homeserverURL: () => Promise<string>;
    isDM: () => boolean;
    popularity: () => number;
    realURI: () => string;
    resolve: () => Promise<Toot | undefined>;
    tootedAt: () => Date;
    audioAttachments: () => Array<mastodon.v1.MediaAttachment>;
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
    followedTags: mastodon.v1.Tag[];
    isFollowed?: boolean;
    reblogsBy: mastodon.v1.Account[];
    resolveAttempted?: boolean;
    resolvedToot?: Toot;
    scoreInfo?: TootScore;
    trendingRank?: number;
    trendingLinks: TrendingLink[];
    trendingTags: TrendingTag[];
    constructor(toot: SerializableToot);
    containsString(str: string): boolean;
    describe(): string;
    describeAccount(): string;
    describeRealAccount(): string;
    popularity(): number;
    realURI(): string;
    realURL(): string;
    resolve(): Promise<Toot | undefined>;
    homserverAccountURL(): string;
    homeserverURL(): Promise<string>;
    tootedAt(): Date;
    audioAttachments(): Array<mastodon.v1.MediaAttachment>;
    imageAttachments(): Array<mastodon.v1.MediaAttachment>;
    videoAttachments(): Array<mastodon.v1.MediaAttachment>;
    isInTimeline(filters: FeedFilterSettings): boolean;
    isValidForFeed(algo: TheAlgorithm): boolean;
    contentWithEmojis(fontSize?: number): string;
    isDM(): boolean;
    isTrending(): boolean;
    contentShortened(): string;
    condensedStatus(): object;
    reblogsByAccts(): string[];
    attachmentPrefix(): string;
    attachmentType(): string | undefined;
    serialize(): SerializableToot;
    private repairToot;
    private attachmentsOfType;
    static dedupeToots(toots: Toot[], logLabel?: string): Toot[];
}
export declare const tootedAt: (toot: mastodon.v1.Status) => Date;
export declare const earliestToot: (toots: StatusList) => mastodon.v1.Status | null;
export declare const mostRecentToot: (toots: StatusList) => mastodon.v1.Status | null;
export declare const sortByCreatedAt: (toots: StatusList) => StatusList;
export declare const earliestTootedAt: (toots: StatusList) => Date | null;
export declare const mostRecentTootedAt: (toots: StatusList) => Date | null;
export declare const minimumID: (toots: Toot[]) => number | null;
export {};
