import { mastodon } from "masto";
import Account from "./account";
import { Logger } from '../../helpers/logger';
import { MediaCategory, ScoreName } from '../../enums';
import { type AccountLike, type FeedFilterSettings, type MastodonTag, type ScoreType, type StatusList, type TagWithUsageCounts, type TootLike, type TootScore, type TrendingLink } from "../../types";
export declare const JUST_MUTING = "justMuting";
export declare const UNKNOWN = "unknown";
/**
 * Extension of mastodon.v1.Status data object with additional properties used by fedialgo
 * that should be serialized to storage.
 */
export interface SerializableToot extends mastodon.v1.Status {
    completedAt?: string;
    followedTags?: MastodonTag[];
    numTimesShown?: number;
    participatedTags?: TagWithUsageCounts[];
    reblog?: SerializableToot | null;
    reblogsBy?: AccountLike[];
    resolvedID?: string;
    scoreInfo?: TootScore;
    sources?: string[];
    trendingLinks?: TrendingLink[];
    trendingRank?: number;
    trendingTags?: TagWithUsageCounts[];
    audioAttachments?: mastodon.v1.MediaAttachment[];
    imageAttachments?: mastodon.v1.MediaAttachment[];
    videoAttachments?: mastodon.v1.MediaAttachment[];
}
/**
 * Interface for mastodon.v1.Status object with additional helper methods.
 * @interface
 */
interface TootObj extends SerializableToot {
    accounts: Account[];
    attachmentType: MediaCategory | undefined;
    author: Account;
    contentTagsParagraph: string | undefined;
    isDM: boolean;
    isFollowed: boolean;
    isPrivate: boolean;
    isTrending: boolean;
    popularity: number;
    realToot: Toot;
    realURI: string;
    realURL: string;
    score: number;
    withRetoot: Toot[];
    containsString: (str: string) => boolean;
    containsTag: (tag: TagWithUsageCounts, fullScan?: boolean) => boolean;
    containsTagsMsg: () => string | undefined;
    contentNonTagsParagraphs: (fontSize?: number) => string;
    contentParagraphs: (fontSize?: number) => string[];
    contentShortened: (maxChars?: number) => string;
    contentWithEmojis: (fontSize?: number) => string;
    describe: () => string;
    homeserverURL: () => Promise<string>;
    isInTimeline: (filters: FeedFilterSettings) => boolean;
    isValidForFeed: (serverSideFilters: mastodon.v2.Filter[]) => boolean;
    resolve: () => Promise<Toot>;
    resolveID: () => Promise<string>;
}
/**
 * Class representing a Mastodon Toot (status) with helper methods for scoring, filtering, and more.
 * Extends the base Mastodon Status object: https://docs.joinmastodon.org/entities/Status/
 * @class
 * @implements {TootObj}
 * @extends {mastodon.v1.Status}
 * @property {string} [completedAt] - Timestamp a full deep inspection of the toot was completed
 * @property {MastodonTag[]} [followedTags] - Array of tags that the user follows that exist in this toot
 * @property {number} [numTimesShown] - Managed in client app. # of times the Toot has been shown to the user.
 * @property {TagWithUsageCounts[]} [participatedTags] - Tags that the user has participated in that exist in this toot
 * @property {SerializableToot | null} [reblog] - The toot that was retooted (if any)
 * @property {AccountLike[]} [reblogsBy] - The accounts that retooted this toot (if any)
 * @property {string} [resolvedID] - This Toot with URLs resolved to homeserver versions
 * @property {TootScore} [scoreInfo] - Scoring info for weighting/sorting this toot
 * @property {string[]} [sources] - Source of the toot (e.g. trending tag toots, home timeline, etc.)
 * @property {TrendingLink[]} [trendingLinks] - Links that are trending in this toot
 * @property {number} [trendingRank] - Most trending on a server gets a 10, next is a 9, etc.
 * @property {TagWithUsageCounts[]} [trendingTags] - Tags that are trending in this toot
 * @property {mastodon.v1.MediaAttachment[]} [audioAttachments]
 * @property {mastodon.v1.MediaAttachment[]} [imageAttachments]
 * @property {mastodon.v1.MediaAttachment[]} [videoAttachments]
 */
export default class Toot implements TootObj {
    id: string;
    uri: string;
    application: mastodon.v1.Application;
    account: Account;
    content: string;
    createdAt: string;
    editedAt: string | null;
    emojis: mastodon.v1.CustomEmoji[];
    favouritesCount: number;
    mediaAttachments: mastodon.v1.MediaAttachment[];
    mentions: mastodon.v1.StatusMention[];
    reblogsCount: number;
    repliesCount: number;
    sensitive: boolean;
    spoilerText: string;
    tags: TagWithUsageCounts[];
    visibility: mastodon.v1.StatusVisibility;
    bookmarked?: boolean | null;
    card?: mastodon.v1.PreviewCard | null;
    favourited?: boolean | null;
    filtered?: mastodon.v1.FilterResult[];
    language?: string | null;
    inReplyToAccountId?: string | null;
    inReplyToId?: string | null;
    muted?: boolean | null;
    pinned?: boolean | null;
    poll?: mastodon.v1.Poll | null;
    reblog?: Toot | null;
    reblogged?: boolean | null;
    text?: string | null;
    url?: string | null;
    completedAt?: string;
    followedTags?: mastodon.v1.Tag[];
    numTimesShown: number;
    participatedTags?: TagWithUsageCounts[];
    reblogsBy: Account[];
    resolvedID?: string;
    scoreInfo?: TootScore;
    sources?: string[];
    trendingLinks?: TrendingLink[];
    trendingRank?: number;
    trendingTags?: TagWithUsageCounts[];
    audioAttachments: mastodon.v1.MediaAttachment[];
    imageAttachments: mastodon.v1.MediaAttachment[];
    videoAttachments: mastodon.v1.MediaAttachment[];
    private contentCache;
    /** Array with the author of the toot and (if it exists) the account that retooted it. */
    get accounts(): Account[];
    /** Age of this toot in hours */
    get ageInHours(): number;
    /** Return the account that posted this toot, not the account that reblogged it. */
    get author(): Account;
    /** True if the toot is a direct message (DM) to the user. */
    get isDM(): boolean;
    /** True if this toot is from a followed account or contains a followed tag. */
    get isFollowed(): boolean;
    /** True if it's for followers only. */
    get isPrivate(): boolean;
    /** True if it's a trending toot or contains any trending hashtags or links. */
    get isTrending(): boolean;
    /** Sum of the trendingRank, numReblogs, replies, and local server favourites. Currently unused. */
    get popularity(): number;
    /** Return the toot that was reblogged if it's a reblog, otherwise return this toot. */
    get realToot(): Toot;
    /** URI for the realToot. @returns {string} */
    get realURI(): string;
    /** Default to this.realURI if url property is empty. */
    get realURL(): string;
    /** Get the webfinger URIs of the accounts mentioned in the toot + the author prepended with @. */
    get replyMentions(): string[];
    /** Current overall score for this toot. */
    get score(): number;
    /** Timestamp of toot's createdAt // * TODO: should this consider the values in reblogsBy? */
    get tootedAt(): Date;
    /** Returns the toot and the retoot, if it exists, as an array. */
    get withRetoot(): Toot[];
    /**
     * Return 'video' if toot contains a video, 'image' if there's an image, undefined if no attachments.
     * @returns {MediaCategory | undefined}
     */
    get attachmentType(): MediaCategory | undefined;
    /**
     * If the final <p> paragraph of the content is just hashtags, return it.
     * @returns {string | undefined}
     */
    get contentTagsParagraph(): string | undefined;
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {SerializableToot} toot - The toot data to build from.
     * @returns {Toot} The constructed Toot instance.
     */
    static build(toot: SerializableToot): Toot;
    /**
     * True if toot contains 'str' in the tags, the content, or the link preview card description.
     * @param {string} str - The string to search for.
     * @returns {boolean}
     */
    containsString(str: string): boolean;
    /**
     * Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search.
     * @param {TagWithUsageCounts} tag - The tag to search for.
     * @param {boolean} [fullScan] - Whether to use full scan.
     * @returns {boolean}
     */
    containsTag(tag: TagWithUsageCounts, fullScan?: boolean): boolean;
    /**
     * Generate a string describing the followed and trending tags in the toot.
     * @returns {string | undefined}
     */
    containsTagsMsg(): string | undefined;
    /**
     * Returns true if the fedialgo user is mentioned in the toot.
     * @returns {boolean}
     */
    containsUserMention(): boolean;
    /**
     * Return all but the last paragraph if that last paragraph is just hashtag links.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentNonTagsParagraphs(fontSize?: number): string;
    /**
     * Break up the content into paragraphs and add <img> tags for custom emojis.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string[]}
     */
    contentParagraphs(fontSize?: number): string[];
    /**
     * Shortened string of content property stripped of HTML tags.
     * @param {number} [maxChars]
     * @returns {string}
     */
    contentShortened(maxChars?: number): string;
    /**
     * Replace custom emoji shortcodes (e.g. ":myemoji:") with image tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentWithEmojis(fontSize?: number): string;
    /**
     * String that describes the toot in not so many characters.
     * @returns {string}
     */
    describe(): string;
    /**
     * Fetch the conversation (context) for this toot (Mastodon API calls this a 'context').
     * @returns {Promise<Toot[]>}
     */
    getConversation(): Promise<Toot[]>;
    /**
     * Get an individual score for this toot.
     * @param {ScoreType} scoreType - The score type.
     * @param {ScoreName} name - The score name.
     * @returns {number}
     */
    getIndividualScore(scoreType: ScoreType, name: ScoreName): number;
    /**
     * Make an API call to get this toot's URL on the home server instead of on the toot's original server.
     *       this: https://fosstodon.org/@kate/114360290341300577
     *    becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
     * @returns {Promise<string>} The home server URL.
     */
    homeserverURL(): Promise<string>;
    /**
     * Return true if the toot should not be filtered out of the feed by the current filters.
     * @param {FeedFilterSettings} filters - The feed filter settings.
     * @returns {boolean}
     */
    isInTimeline(filters: FeedFilterSettings): boolean;
    /**
     * Return false if Toot should be discarded from feed altogether and permanently.
     * @param {mastodon.v2.Filter[]} serverSideFilters - Server-side filters.
     * @returns {boolean}
     */
    isValidForFeed(serverSideFilters: mastodon.v2.Filter[]): boolean;
    /**
     * Get Status obj for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<Toot>}
     */
    resolve(): Promise<Toot>;
    /**
     * Get Status ID for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<string>}
     */
    resolveID(): Promise<string>;
    private addEmojiHtmlTags;
    private attachmentsOfType;
    private completeProperties;
    private containsTagsOfTypeMsg;
    private contentString;
    private contentStripped;
    private contentWithCard;
    private determineLanguage;
    private isComplete;
    private isUsersOwnToot;
    private repair;
    /**
     * Build array of new Toot objects from an array of Status objects (or Toots).
     * Toots returned are sorted by score and should have most of their properties set correctly.
     * @param {TootLike[]} statuses - Array of status objects or Toots.
     * @param {string} source - The source label for logging.
     * @param {boolean} [skipSort] - If true, don't sort by score and don't remove the user's own toots.
     * @returns {Promise<Toot[]>}
     */
    static buildToots(statuses: TootLike[], source: string, skipSort?: boolean): Promise<Toot[]>;
    /**
     * Fetch all the data we need to set dependent properties and set them on the toots.
     * If 'source' arg is provided we set it as the Toot.source prop and avoid doing an isDeepInspect completion.
     * @param {TootLike[]} toots - Array of toots to complete.
     * @param {Logger} logger - Logger for logging.
     * @param {string} [source] - Optional source label.
     * @returns {Promise<Toot[]>}
     */
    static completeToots(toots: TootLike[], logger: Logger, source?: string): Promise<Toot[]>;
    /**
     * Remove dupes by uniquifying on the toot's URI.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} [inLogger] - Logger for logging.
     * @returns {Toot[]} Deduped array of toots.
     */
    static dedupeToots(toots: Toot[], inLogger?: Logger): Toot[];
    /**
     * Get rid of toots we never want to see again.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Promise<Toot[]>}
     */
    static removeInvalidToots(toots: Toot[], logger: Logger): Promise<Toot[]>;
    /**
     * Get rid of the user's own toots.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Toot[]} Array without user's own toots.
     */
    static removeUsersOwnToots(toots: Toot[], logger: Logger): Toot[];
    /**
     * Filter an array of toots down to just the retoots.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of retoots.
     */
    static onlyRetoots(toots: Toot[]): Toot[];
    /**
     * Filter an array of toots down to just the replies.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of replies.
     */
    static onlyReplies(toots: Toot[]): Toot[];
    /**
     * Return a new array of a toot property collected and uniquified from an array of toots.
     * @template T
     * @param {Toot[]} toots - Array of toots.
     * @param {KeysOfValueType<Toot, any[] | undefined>} property - The property to collect.
     * @param {(elem: T) => string} uniqFxn - Function to get unique key for each element.
     * @returns {T[]} Array of unique property values.
     */
    private static uniqFlatMap;
}
/**
 * Get the Date the toot was created.
 * @private
 * @param {TootLike} toot - The toot object.
 * @returns {Date}
 */
export declare const tootedAt: (toot: TootLike) => Date;
/**
 * Get the earliest toot from a list.
 * @private
 * @param {StatusList} toots - List of toots.
 * @returns {TootLike | null}
 */
export declare const earliestToot: (toots: StatusList) => TootLike | null;
/**
 * Get the most recent toot from a list.
 * @private
 * @param {StatusList} toots - List of toots.
 * @returns {TootLike | null}
 */
export declare const mostRecentToot: (toots: StatusList) => TootLike | null;
/**
 * Returns array with oldest toot first.
 * @private
 * @template T
 * @param {T} toots - List of toots.
 * @returns {T}
 */
export declare function sortByCreatedAt<T extends StatusList>(toots: T): T;
/**
 * Get the Date of the earliest toot in a list.
 * @private
 * @param {StatusList} toots - List of toots.
 * @returns {Date | null}
 */
export declare const earliestTootedAt: (toots: StatusList) => Date | null;
/**
 * Get the Date of the most recent toot in a list.
 * @private
 * @param {StatusList} toots - List of toots.
 * @returns {Date | null}
 */
export declare const mostRecentTootedAt: (toots: StatusList) => Date | null;
export {};
