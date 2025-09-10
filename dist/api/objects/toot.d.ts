import { mastodon } from "masto";
import Account from "./account";
import { MediaCategory, ScoreName } from '../../enums';
import { Logger } from '../../helpers/logger';
import { type AccountLike, type FeedFilterSettings, type Hashtag, type ScoreType, type TagWithUsageCounts, type TootLike, type TootScore, type TootSource, type TrendingLink } from "../../types";
/**
 * Extension of mastodon.v1.Status data object with additional properties used by fedialgo
 * that should be serialized to storage.
 */
export interface SerializableToot extends mastodon.v1.Status {
    completedAt?: string;
    followedTags?: Hashtag[];
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
    description: string;
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
    localServerUrl: () => Promise<string>;
    isInTimeline: (filters: FeedFilterSettings) => boolean;
    isValidForFeed: (mutedKeywordRegex: RegExp, blockedDomains: Set<string>) => boolean;
    resolve: () => Promise<Toot>;
    resolveID: () => Promise<string>;
    tagNames: () => Set<string>;
}
/**
 * Class representing a Mastodon {@linkcode Toot} with helper methods for scoring, filtering, and more.
 * Extends the base Mastodon {@linkcode https://docs.joinmastodon.org/entities/Status/ Status} object.
 * Note: the base {@linkcode https://docs.joinmastodon.org/entities/Status/ Status} class's
 * properties are not documented here.
 *
 * @implements {TootObj}
 * @extends {mastodon.v1.Status}
 * @property {Account[]} accounts - Array with the author of the toot and (if it exists) the account that retooted it.
 * @property {number} ageInHours - Age of this toot in hours.
 * @property {mastodon.v1.CustomEmoji[]} allEmojis - All custom emojis in the toot, including the author's.
 * @property {MediaAttachmentType} [attachmentType] - The type of media in the toot (image, video, audio, etc.).
 * @property {Account} author - The account that posted this toot, not the account that reblogged it.
 * @property {string} [completedAt] - Timestamp when a full deep inspection of the toot was last completed.
 * @property {string} [contentTagsParagraph] - If the last paragraph is 100% hashtag this is the HTML for that paragraph.
 * @property {string} description - A string describing the toot, including author, content, and createdAt.
 * @property {MastodonTag[]} [followedTags] - Array of tags that the user follows that exist in this toot.
 * @property {string} homeserver - The homeserver of the author of the toot.
 * @property {boolean} isDM - True if the toot is a direct message (DM) to the user.
 * @property {boolean} isFollowed - True if this toot is from a followed account or contains a followed tag.
 * @property {boolean} isLocal - True if this toot is from the FediAlgo user's home server.
 * @property {boolean} isPrivate - True if it's for followers only.
 * @property {boolean} isTrending - True if it's a trending toot or contains any trending hashtags or links.
 * @property {string} lastEditedAt - The date when the toot was last edited, or createdAt if never edited.
 * @property {number} [numTimesShown] - Managed in client app. # of times the Toot has been shown to the user.
 * @property {TagWithUsageCounts[]} [participatedTags] - Tags that the user has participated in that exist in this toot
 * @property {number} popularity - Sum of the trendingRank, numReblogs, replies, and local server favourites. Currently unused.
 * @property {Toot} realToot - The toot that was reblogged if it's a reblog, otherwise this toot.
 * @property {string} realURI - URI for the realToot.
 * @property {string} realURL - Default to this.realURI if url property is empty.
 * @property {SerializableToot | null} [reblog] - The toot that was retooted (if any).
 * @property {AccountLike[]} [reblogsBy] - The accounts that retooted this toot (if any)
 * @property {string[]} replyMentions - The webfinger URIs of the accounts mentioned in the toot + the author prepended with @.
 * @property {string} [resolvedID] - This Toot with URLs resolved to homeserver versions
 * @property {number} score - Current overall score for this toot.
 * @property {TootScore} [scoreInfo] - Scoring info for weighting/sorting this toot
 * @property {string[]} [sources] - Source of the toot (e.g. trending tag toots, home timeline, etc.)
 * @property {Date} tootedAt - Timestamp of toot's createdAt.
 * @property {TrendingLink[]} [trendingLinks] - Links that are trending in this toot
 * @property {number} [trendingRank] - Most trending on a server gets a 10, next is a 9, etc.
 * @property {TagWithUsageCounts[]} [trendingTags] - Tags that are trending in this toot
 * @property {Toot[]} withRetoot - Returns the toot and the retoot, if it exists, as an array.
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
    get accounts(): Account[];
    get ageInHours(): number;
    get allEmojis(): mastodon.v1.CustomEmoji[];
    get author(): Account;
    get homeserver(): string;
    get isDM(): boolean;
    get isFollowed(): boolean;
    get isLocal(): boolean;
    get isPrivate(): boolean;
    get isTrending(): boolean;
    get lastEditedAt(): string;
    get popularity(): number;
    get realToot(): Toot;
    get realURI(): string;
    get realURL(): string;
    get replyMentions(): string[];
    get score(): number;
    get tootedAt(): Date;
    get withRetoot(): Toot[];
    get attachmentType(): MediaCategory | undefined;
    get contentTagsParagraph(): string | undefined;
    get description(): string;
    private contentCache;
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {SerializableToot} toot - The toot data to build from.
     * @returns {Toot} The constructed Toot instance.
     */
    static build(toot: SerializableToot | Toot): Toot;
    /**
     * True if toot contains {@linkcode str} in the tags, the content, or the link preview card description.
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
     * Generate a string describing the followed, trending, and participated tags in the toot.
     * TODO: add favourited tags?
     * @returns {string | undefined}
     */
    containsTagsMsg(): string | undefined;
    /**
     * Returns {@linkcode true} if the fedialgo user is mentioned in this {@linkcode Toot}.
     * @returns {boolean}
     */
    containsUserMention(): boolean;
    /**
     * Return all but the last paragraph if that last paragraph is just hashtag links.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji <img> tags. Should match surrounding txt.
     * @returns {string}
     */
    contentNonTagsParagraphs(fontSize?: number): string;
    /**
     * Break up the content into paragraphs and add <img> tags for custom emojis.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji <img> tags. Should match surrounding txt.
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
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji imgs. Should match surrounding text.
     * @returns {string}
     */
    contentWithEmojis(fontSize?: number): string;
    /**
     * Fetch the conversation for this toot (Mastodon API calls this a
     * {@linkcode https://docs.joinmastodon.org/entities/Context/ Context}).
     * @returns {Promise<Toot[]>}
     */
    getConversation(): Promise<Toot[]>;
    /**
     * Get an individual score for this {@linkcode Toot}.
     * @param {ScoreType} scoreType - The score type.
     * @param {ScoreName} name - The score name.
     * @returns {number}
     */
    getIndividualScore(scoreType: ScoreType, name: ScoreName): number;
    /**
     * Return true if the {@linkcode Toot} should not be filtered out of the feed by the current filters.
     * @param {FeedFilterSettings} filters - The feed filter settings.
     * @returns {boolean}
     */
    isInTimeline(filters: FeedFilterSettings): boolean;
    /**
     * Return false if {@linkcode Toot} should be discarded from feed altogether and permanently.
     * @param {mastodon.v2.Filter[]} serverSideFilters - Server-side filters.
     * @returns {boolean}
     */
    isValidForFeed(mutedKeywordRegex: RegExp, blockedDomains: Set<string>): boolean;
    /**
     * Make an API call to get this {@linkcode Toot}'s URL on the FediAlgo user's home server instead of on
     * the {@linkcode Toot}'s home server.
     * @example "https://fosstodon.org/@kate/114360290341300577" => "https://universeodon.com/@kate@fosstodon.org/114360290578867339"
     * @returns {Promise<string>} The home server URL.
     */
    localServerUrl(): Promise<string>;
    /**
     * True if {@linkcode Toot} matches {@linkcode regex} in the tags, the content, or the link preview card description.
     * @param {RegExp} regex - The string to search for.
     * @returns {boolean}
     */
    matchesRegex(regex: RegExp): boolean;
    /**
     * Get {@linkcode https://docs.joinmastodon.org/entities/Status/ Status} obj for this {@linkcode Toot}
     * from user's home server so the property URLs point to the home server.
     * @returns {Promise<Toot>}
     */
    resolve(): Promise<Toot>;
    /**
     * Get {@linkcode https://docs.joinmastodon.org/entities/Status/ Status} ID for {@linkcode Toot} from
     * user's home server so the property URLs point to the home server.
     * @returns {Promise<string>}
     */
    resolveID(): Promise<string>;
    /**
     * Get the {@linkcode Toot}'s tags as a {@linkcode Set} of strings. Caches results for future calls.
     * @returns {Set<string>} Set of the names of the tags in this toot.
     */
    tagNames(): Set<string>;
    /**
     * Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags in a string.
     * @private
     */
    private addEmojiHtmlTags;
    /**
     * Return {@linkcode MediaAttachmentType} objects with type == {@linkcode attachmentType}
     * @private
     * @param {MediaAttachmentType} attachmentType - The attachment type to filter for.
     * @returns {mastodon.v1.MediaAttachment[]}
     */
    private attachmentsOfType;
    /**
     * Some properties cannot be repaired and/or set until info about the user is available.
     * Also some properties are very slow - in particular all the tag and trendingLink calcs.
     * {@linkcode isDeepInspect} argument is used to determine if we should do the slow
     * calculations or quick ones.
     * @private
     * @param {UserData} userData - The user data.
     * @param {TrendingLink[]} trendingLinks - The trending links.
     * @param {TagWithUsageCounts[]} trendingTags - The trending tags.
     * @param {TootSource} [source] - The source of the toot (e.g. REFRESH_HOME_TIMELINE).
     */
    private completeProperties;
    private containsTagsOfTypeMsg;
    private contentString;
    private contentStripped;
    private contentWithCard;
    private determineLanguage;
    /**
     * Returns true if the {@linkcode Toot} needs to be (re-)evaluated for trending tags, links, etc.
     * @private
     */
    private isComplete;
    /**
     * Returns true if this toot is by the fedialgo user.
     * @private
     */
    private isUsersOwnToot;
    /**
     * Repair toot properties:
     *   1. Set {@linkcode Toot.application.name} to UNKNOWN if missing
     *   2. Call {@linkcode Toot.determineLanguage} to set the language
     *   3. Lowercase all tags
     *   4. Repair {@linkcode mediaAttachment} types if reparable based on URL file extension
     *   5. Repair {@linkcode https://docs.joinmastodon.org/entities/StatusMention/ StatusMention} objects for users on home server
     * @private
     */
    private repair;
    /**
     * Build array of new {@linkcode Toot} objects from an array of
     * {@linkcode https://docs.joinmastodon.org/entities/Status/ Status} objects (or {@linkcode Toot}s).
     * {@linkcode Toot}s returned are sorted by score and should have most of their properties set correctly.
     * @param {TootLike[]} statuses - Array of status objects or Toots.
     * @param {TootSource} source - The source label for logging.
     * @returns {Promise<Toot[]>}
     */
    static buildToots(statuses: TootLike[], source: TootSource): Promise<Toot[]>;
    /**
     * Fetch all the data we need to set dependent properties and set them on the toots.
     * If {@linkcode source} arg is provided we set it as the {@linkcode Toot.source} prop and avoid doing an
     * {@linkcode Toot.isDeepInspect} completion.
     * @param {TootLike[]} toots - Array of toots to complete.
     * @param {Logger} logger - Logger for logging.
     * @param {string} [source] - Optional source label.
     * @returns {Promise<Toot[]>}
     */
    static completeToots(toots: TootLike[], logger: Logger, source?: TootSource): Promise<Toot[]>;
    /**
     * Remove dupes by uniquifying on the {@linkcode Toot}'s URI.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} [inLogger] - Logger for logging.
     * @returns {Toot[]} Deduped array of toots.
     */
    static dedupeToots(toots: Toot[], inLogger?: Logger): Toot[];
    /**
     * Get rid of {@linkcode Toot}s we never want to see again.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Promise<Toot[]>}
     */
    static removeInvalidToots(toots: Toot[], logger: Logger): Promise<Toot[]>;
    /**
     * Get rid of the user's own {@linkcode Toot}s.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Toot[]} Array without user's own toots.
     */
    static removeUsersOwnToots(toots: Toot[], logger: Logger): Toot[];
    /**
     * Filter an array of {@linkcode Toot}s down to just the retoots.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of retoots.
     */
    static onlyRetoots(toots: Toot[]): Toot[];
    /**
     * Filter an array of {@linkcode Toot}s down to just the replies.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of replies.
     */
    static onlyReplies(toots: Toot[]): Toot[];
    /**
     * Return a new array of a {@linkcode Toot} property collected and uniquified from an array of {@linkcode Toot}s.
     * @private
     * @template T
     * @param {Toot[]} toots - Array of toots.
     * @param {KeysOfValueType<Toot, any[] | undefined>} property - The property to collect.
     * @param {(elem: T) => string} uniqFxn - Function to get unique key for each element.
     * @returns {T[]} Array of unique property values.
     */
    private static uniqFlatMap;
}
/**
 * Get the Date the {@linkcode Toot} was created.
 * @private
 * @param {TootLike} toot - The toot object.
 * @returns {Date}
 */
export declare const tootedAt: (toot: TootLike) => Date;
/**
 * Get the earliest {@linkcode Toot} from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
export declare const earliestToot: (toots: TootLike[]) => TootLike | null;
/**
 * Get the most recent {@linkcode Toot} from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
export declare const mostRecentToot: (toots: TootLike[]) => TootLike | null;
/**
 * Returns array with oldest {@linkcode Toot} first.
 * @private
 * @template T extends TootLike
 * @param {T} toots - List of toots.
 * @returns {T}
 */
export declare function sortByCreatedAt<T extends TootLike[]>(toots: T): T;
/**
 * Get the Date of the earliest {@linkcode Toot} in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
export declare const earliestTootedAt: (toots: TootLike[]) => Date | null;
/**
 * Get the Date of the most recent {@linkcode Toot} in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
export declare const mostRecentTootedAt: (toots: TootLike[]) => Date | null;
export {};
