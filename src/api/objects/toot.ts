/**
 * @fileoverview Toot class and helper methods for dealing with Mastodon Status objects.
 * Includes methods for scoring, filtering, deduplication, and property repair.
 */
import { capitalCase } from "change-case";
import { isEmpty, isFinite } from "lodash";
import { mastodon } from "masto";
import { Type } from 'class-transformer';

import Account from "./account";
import MastoApi from "../api";
import MastodonServer from "../mastodon_server";
import Scorer from "../../scorer/scorer";
import UserData from "../user_data";
import { ageInHours, ageInMinutes, ageString, timelineCutoffAt, toISOFormat } from "../../helpers/time_helpers";
import { config } from "../../config";
import { FILTERABLE_SCORES } from "../../filters/numeric_filter";
import { FOREIGN_SCRIPTS, LANGUAGE_NAMES, detectForeignScriptLanguage, detectLanguage } from "../../helpers/language_helper";
import { isProduction } from "../../helpers/environment_helpers";
import { isValidForSubstringSearch, repairTag } from "./tag";
import { LoadAction, MediaCategory, ScoreName, TypeFilterName } from '../../enums';
import { Logger } from '../../helpers/logger';
import {
    asOptionalArray,
    batchMap,
    filterWithLog,
    groupBy,
    sortObjsByProps,
    split,
    sumArray,
    uniquify,
    uniquifyByProp
} from "../../helpers/collection_helpers";
import {
    DEFAULT_FONT_SIZE,
    MEDIA_TYPES,
    VIDEO_TYPES,
    at,
    collapseWhitespace,
    determineMediaCategory,
    extractDomain,
    htmlToParagraphs,
    htmlToText,
    optionalSuffix,
    removeDiacritics,
    removeEmojis,
    removeLinks,
    removeMentions,
    removeTags,
    replaceEmojiShortcodesWithImgTags,
    replaceHttpsLinks,
    wordRegex,
} from "../../helpers/string_helpers";
import {
    type AccountLike,
    type FeedFilterSettings,
    type KeysOfValueType,
    type Hashtag,
    type ScoreType,
    type TagWithUsageCounts,
    type TootLike,
    type TootNumberProp,
    type TootScore,
    type TootSource,
    type TrendingLink,
} from "../../types";

// https://docs.joinmastodon.org/entities/Status/#visibility
enum TootVisibility {
    DIRECT_MSG = "direct",
    PUBLIC = "public",
    PRIVATE = "private",
    UNLISTED = "unlisted",
};

enum TootCacheKey {
    CONTENT_STRIPPED = "contentStripped",
    CONTENT_WITH_EMOJIS = "contentWithEmojis",
    CONTENT_WITH_CARD = "contentWithCard",
};

// Cache for methods that build strings from the toot content.
type TootCacheStrings = {[key in TootCacheKey]?: string};
type TootCache = TootCacheStrings & {tagNames?: Set<string>};

class TootCacheObj implements TootCache {
    [TootCacheKey.CONTENT_STRIPPED]?: string;
    [TootCacheKey.CONTENT_WITH_EMOJIS]?: string;
    [TootCacheKey.CONTENT_WITH_CARD]?: string;
    tagNames?: Set<string>;  // Cache of tag names for faster access
}

const UNKNOWN = "unknown";
const BSKY_BRIDGY = 'bsky.brid.gy';
const HASHTAG_LINK_REGEX = /<a href="https:\/\/[\w.]+\/tags\/[\w]+" class="[-\w_ ]*hashtag[-\w_ ]*" rel="[a-z ]+"( target="_blank")?>#<span>[\w]+<\/span><\/a>/i;
const HASHTAG_PARAGRAPH_REGEX = new RegExp(`^<p>(?:${HASHTAG_LINK_REGEX.source} ?)+</p>`, "i");
const PROPS_THAT_CHANGE = FILTERABLE_SCORES.concat("numTimesShown");

const tootLogger = new Logger("Toot");
const repairLogger = tootLogger.tempLogger("repairToot");


/**
 * Extension of mastodon.v1.Status data object with additional properties used by fedialgo
 * that should be serialized to storage.
 */
export interface SerializableToot extends mastodon.v1.Status {
    completedAt?: string;                    // Timestamp a full deep inspection of the toot was completed
    followedTags?: Hashtag[];            // Array of tags that the user follows that exist in this toot
    numTimesShown?: number;                  // Managed in client app. # of times the Toot has been shown to the user.
    participatedTags?: TagWithUsageCounts[]; // Tags that the user has participated in that exist in this toot
    reblog?: SerializableToot | null,        // The toot that was retooted (if any)
    reblogsBy?: AccountLike[];               // The accounts that retooted this toot (if any)
    resolvedID?: string;                     // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                   // Scoring info for weighting/sorting this toot
    sources?: string[];                      // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];          // Links that are trending in this toot
    trendingRank?: number;                   // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TagWithUsageCounts[];     // Tags that are trending in this toot
    audioAttachments?: mastodon.v1.MediaAttachment[];
    imageAttachments?: mastodon.v1.MediaAttachment[];
    videoAttachments?: mastodon.v1.MediaAttachment[];
};

/**
 * Interface for mastodon.v1.Status object with additional helper methods.
 * @interface
 */
interface TootObj extends SerializableToot {
    // Getters
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
    // Methods
    containsString: (str: string) => boolean;
    containsTag: (tag: TagWithUsageCounts, fullScan?: boolean) => boolean;
    containsTagsMsg: () => string | undefined;
    contentNonTagsParagraphs: (fontSize?: number) => string;
    contentParagraphs: (fontSize?: number) => string[];
    contentShortened: (maxChars?: number) => string;
    contentWithEmojis: (fontSize?: number) => string;
    localServerUrl: () => Promise<string>;
    isInTimeline: (filters: FeedFilterSettings) => boolean;
    isValidForFeed: (mutedKeywordRegex: RegExp, blockedDomains:Set<string>) => boolean;
    resolve: () => Promise<Toot>;
    resolveID: () => Promise<string>;
    tagNames: () => Set<string>;
};


/**
 * Class representing a Mastodon Toot (status) with helper methods for scoring, filtering, and more.
 * Extends the base Mastodon Status object. The base class's properties are not documented here; see
 * {@link https://docs.joinmastodon.org/entities/Status/ the official docs} for details.
 *
 * @implements {TootObj}
 * @extends {mastodon.v1.Status}
 * @property {Account[]} accounts - Array with the author of the toot and (if it exists) the account that retooted it.
 * @property {number} ageInHours - Age of this toot in hours.
 * @property {mastodon.v1.CustomEmoji[]} allEmojis - All custom emojis in the toot, including the author's.
 * @property {MediaAttachmentType} [attachmentType] - The type of media in the toot (image, video, audio, etc.).
 * @property {Account} author - The account that posted this toot, not the account that reblogged it.
 * @property {string} [completedAt] - Timestamp when a full deep inspection of the toot was last completed.
 * @property {string} [contentTagsParagraph] - The content of last paragraph in the Toot but only if it's just hashtags links.
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
    // Props from mastodon.v1.Status
    id!: string;
    uri!: string;
    application!: mastodon.v1.Application;
    @Type(() => Account) account!: Account;
    content!: string;
    createdAt!: string;
    editedAt: string | null = null;
    emojis!: mastodon.v1.CustomEmoji[];
    favouritesCount!: number;
    mediaAttachments!: mastodon.v1.MediaAttachment[];
    mentions!: mastodon.v1.StatusMention[];
    reblogsCount!: number;
    repliesCount!: number;
    sensitive!: boolean;
    spoilerText!: string;
    tags!: TagWithUsageCounts[];
    visibility!: mastodon.v1.StatusVisibility;
    // Optional fields
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
    @Type(() => Toot) reblog?: Toot | null;
    reblogged?: boolean | null;
    text?: string | null;
    url?: string | null;

    // extensions to mastodon.v1.Status. Most of these are set in completeProperties()
    completedAt?: string;
    followedTags?: mastodon.v1.Tag[];            // Array of tags that the user follows that exist in this toot
    numTimesShown!: number;
    participatedTags?: TagWithUsageCounts[];     // Array of tags that the user has participated in that exist in this toot
    @Type(() => Account) reblogsBy!: Account[];  // The accounts that retooted this toot
    resolvedID?: string;                         // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                       // Scoring info for weighting/sorting this toot
    sources?: string[];                          // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];              // Links that are trending in this toot
    trendingRank?: number;                       // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TagWithUsageCounts[];         // Tags that are trending that appear in this toot
    audioAttachments!: mastodon.v1.MediaAttachment[];
    imageAttachments!: mastodon.v1.MediaAttachment[];
    videoAttachments!: mastodon.v1.MediaAttachment[];

    // See JSDoc comment for explanations of the various getters
    get accounts(): Account[] { return this.withRetoot.map((toot) => toot.account)};
    get ageInHours(): number { return ageInHours(this.createdAt) };
    get allEmojis(): mastodon.v1.CustomEmoji[] { return (this.emojis || []).concat(this.account.emojis || []) };
    get author(): Account { return this.realToot.account };
    get homeserver(): string { return this.author.homeserver };
    get isDM(): boolean { return this.visibility === TootVisibility.DIRECT_MSG };
    get isFollowed(): boolean { return !!(this.accounts.some(a => a.isFollowed) || this.realToot.followedTags?.length) };
    get isLocal(): boolean { return MastoApi.instance.isLocalUrl(this.realURI) };
    get isPrivate(): boolean { return this.visibility === TootVisibility.PRIVATE };
    get isTrending(): boolean { return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length) };
    get lastEditedAt(): string { return this.editedAt || this.createdAt };
    get popularity() { return sumArray([this.favouritesCount, this.reblogsCount, this.repliesCount, this.trendingRank]) };
    get realToot(): Toot { return this.reblog ?? this };
    get realURI(): string { return this.realToot.uri };
    get realURL(): string { return this.realToot.url || this.realURI };
    get replyMentions() { return [this.author.webfingerURI].concat((this.mentions || []).map((m) => m.acct)).map(at) };
    get score(): number { return this.scoreInfo?.score || 0 };
    get tootedAt(): Date { return new Date(this.createdAt) };  // TODO: should this consider the values in reblogsBy?
    get withRetoot(): Toot[] { return [this, ...asOptionalArray(this.reblog)] };

    get attachmentType(): MediaCategory | undefined {
        if (this.imageAttachments.length) {
            return MediaCategory.IMAGE;
        } else if (this.videoAttachments.length) {
            return MediaCategory.VIDEO;
        } else if (this.audioAttachments.length) {
            return MediaCategory.AUDIO;
        }
    }

    get contentTagsParagraph(): string | undefined {
        const finalParagraph = this.contentParagraphs().slice(-1)[0];
        return HASHTAG_PARAGRAPH_REGEX.test(finalParagraph) ? finalParagraph : undefined;
    }

    get description(): string {
        const msg = `${this.account.description} [url="${this.url || this.uri}"`;
        return `${msg}, createdAt="${toISOFormat(this.createdAt)}"]: "${this.contentShortened()}"`;
    }

    // Temporary caches for performance (profiler said contentWithCard() was using a lot of runtime)
    private contentCache: TootCache = {};

    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {SerializableToot} toot - The toot data to build from.
     * @returns {Toot} The constructed Toot instance.
     */
    static build(toot: SerializableToot | Toot): Toot {
        if (toot instanceof Toot) {
            // Clear the cache if the toot was edited // TODO: Probably not the ideal time to clear the cache
            if (toot.editedAt) toot.contentCache = {};
            return toot;
        }

        const tootObj = new Toot();
        tootObj.id = toot.id;
        tootObj.uri = toot.uri;
        tootObj.account = Account.build(toot.account);
        tootObj.application = toot.application;
        tootObj.bookmarked = toot.bookmarked;
        tootObj.card = toot.card;
        tootObj.content = toot.content;
        tootObj.createdAt = toot.createdAt;
        tootObj.editedAt = toot.editedAt;
        tootObj.emojis = toot.emojis;
        tootObj.favourited = toot.favourited;
        tootObj.favouritesCount = toot.favouritesCount;
        tootObj.filtered = toot.filtered;
        tootObj.inReplyToAccountId = toot.inReplyToAccountId;
        tootObj.inReplyToId = toot.inReplyToId;
        tootObj.language = toot.language;
        tootObj.mediaAttachments = toot.mediaAttachments || [];
        tootObj.mentions = toot.mentions;
        tootObj.muted = toot.muted;
        tootObj.pinned = toot.pinned;
        tootObj.poll = toot.poll;
        tootObj.reblogged = toot.reblogged;
        tootObj.reblogsCount = toot.reblogsCount;
        tootObj.repliesCount = toot.repliesCount;
        tootObj.sensitive = toot.sensitive;
        tootObj.spoilerText = toot.spoilerText;
        tootObj.tags = toot.tags;
        tootObj.text = toot.text;
        tootObj.url = toot.url;
        tootObj.visibility = toot.visibility;

        // Unique to fedialgo
        tootObj.numTimesShown = toot.numTimesShown || 0;
        tootObj.completedAt = toot.completedAt;
        tootObj.followedTags = toot.followedTags;
        tootObj.reblog = toot.reblog ? Toot.build(toot.reblog) : undefined;
        // TODO: the reblogsBy don't necessarily have the isFollowed flag set correctly
        tootObj.reblogsBy = (toot.reblogsBy ?? []).map(account => Account.build(account));
        tootObj.resolvedID = toot.resolvedID;
        tootObj.scoreInfo = toot.scoreInfo;
        tootObj.sources = toot.sources;
        tootObj.trendingLinks = toot.trendingLinks;
        tootObj.trendingRank = toot.trendingRank;
        tootObj.trendingTags = toot.trendingTags;

        tootObj.repair();
        // These must be set after repair() has a chance to fix any broken media types
        tootObj.audioAttachments = tootObj.attachmentsOfType(MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(MediaCategory.IMAGE);
        tootObj.videoAttachments = VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));

        if (tootObj.account.suspended) {
            tootLogger.warn(`Toot from suspended account:`, tootObj);
        } else if (tootObj.account.limited) {
            tootLogger.trace(`Toot from limited account:`, tootObj);
        }

        return tootObj;
    }

    /**
     * True if toot contains 'str' in the tags, the content, or the link preview card description.
     * @param {string} str - The string to search for.
     * @returns {boolean}
     */
    containsString(str: string): boolean {
        return this.matchesRegex(wordRegex(str));
    }

    /**
     * Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search.
     * @param {TagWithUsageCounts} tag - The tag to search for.
     * @param {boolean} [fullScan] - Whether to use full scan.
     * @returns {boolean}
     */
    containsTag(tag: TagWithUsageCounts, fullScan?: boolean): boolean {
        if (fullScan && isValidForSubstringSearch(tag)) {
            if (!tag.regex) {
                tootLogger.warn(`containsTag() called on tag without regex:`, tag);
                tag.regex = wordRegex(tag.name);
            }

            return this.matchesRegex(tag.regex);
        } else {
            try {
                return this.tagNames().has(tag.name);
            } catch (err) {
                tootLogger.error(`Error in containsTag("${tag.name}"), current cache:`, this.contentCache, err);
                this.contentCache.tagNames = new Set<string>((this.tags || []).map((tag) => tag.name))
                return this.contentCache.tagNames!.has(tag.name);
            }
        }
    }

    /**
     * Generate a string describing the followed, trending, and participated tags in the toot.
     * TODO: add favourited tags?
     * @returns {string | undefined}
     */
    containsTagsMsg(): string | undefined {
        let msgs = [
            this.containsTagsOfTypeMsg(TypeFilterName.FOLLOWED_HASHTAGS),
            this.containsTagsOfTypeMsg(TypeFilterName.TRENDING_TAGS),
            this.containsTagsOfTypeMsg(TypeFilterName.PARTICIPATED_TAGS),
        ];

        msgs = msgs.filter((msg) => msg);
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }

    /**
     * Returns true if the fedialgo user is mentioned in the toot.
     * @returns {boolean}
     */
    containsUserMention(): boolean {
        return this.mentions.some((mention) => mention.acct == MastoApi.instance.user.webfingerURI);
    }

    /**
     * Return all but the last paragraph if that last paragraph is just hashtag links.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentNonTagsParagraphs(fontSize: number = DEFAULT_FONT_SIZE): string {
        const paragraphs = this.contentParagraphs(fontSize);
        if (this.contentTagsParagraph) paragraphs.pop();  // Remove the last paragraph if it's just hashtags
        return paragraphs.join("\n");
    }

    /**
     * Break up the content into paragraphs and add <img> tags for custom emojis.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string[]}
     */
    contentParagraphs(fontSize: number = DEFAULT_FONT_SIZE): string[] {
        return htmlToParagraphs(this.contentWithEmojis(fontSize));
    }

    /**
     * Shortened string of content property stripped of HTML tags.
     * @param {number} [maxChars]
     * @returns {string}
     */
    contentShortened(maxChars?: number): string {
        maxChars ||= config.toots.maxContentPreviewChars;
        let content = replaceHttpsLinks(this.contentString());

        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            content = `<${capitalCase(this.attachmentType || 'empty')} post by ${this.author.description}>`;
        } else if (content.length > maxChars) {
            content = `${content.slice(0, maxChars)}...`;
        }

        return content;
    }

    /**
     * Replace custom emoji shortcodes (e.g. ":myemoji:") with image tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        if (!this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS])  {
            this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS] = this.addEmojiHtmlTags(this.content, fontSize);
        }

        return this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS];
    }

    /**
     * Fetch the conversation (context) for this toot (Mastodon API calls this a 'context').
     * @returns {Promise<Toot[]>}
     */
    async getConversation(): Promise<Toot[]> {
        const action = LoadAction.GET_CONVERSATION;
        const logger = tootLogger.tempLogger(action);
        logger.debug(`Fetching conversation for toot:`, this.description);
        const startTime = new Date();
        const context = await MastoApi.instance.api.v1.statuses.$select(await this.resolveID()).context.fetch();
        const toots = await Toot.buildToots([...context.ancestors, this, ...context.descendants], action);
        logger.trace(`Fetched ${toots.length} toots ${ageString(startTime)}`, toots.map(t => t.description));
        return toots;
    }

    /**
     * Get an individual score for this toot.
     * @param {ScoreType} scoreType - The score type.
     * @param {ScoreName} name - The score name.
     * @returns {number}
     */
    getIndividualScore(scoreType: ScoreType, name: ScoreName): number {
        if (isFinite(this.scoreInfo?.scores?.[name]?.[scoreType])) {
            return this.scoreInfo!.scores[name][scoreType];
        } else {
            tootLogger.trace(`no score available for ${scoreType}/${name}:`, this);
            return 0;
        }
    }

    /**
     * Return true if the toot should not be filtered out of the feed by the current filters.
     * @param {FeedFilterSettings} filters - The feed filter settings.
     * @returns {boolean}
     */
    isInTimeline(filters: FeedFilterSettings): boolean {
        const isOK = Object.values(filters.booleanFilters).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }

    /**
     * Return false if Toot should be discarded from feed altogether and permanently.
     * @param {mastodon.v2.Filter[]} serverSideFilters - Server-side filters.
     * @returns {boolean}
     */
    isValidForFeed(mutedKeywordRegex: RegExp, blockedDomains: Set<string>): boolean {
        if (this.reblog?.muted || this.muted) {
            tootLogger.trace(`Removing toot from muted account (${this.author.description}):`, this);
            return false;
        } else if (Date.now() < this.tootedAt.getTime()) {
            // Sometimes there are wonky statuses that are like years in the future so we filter them out.
            tootLogger.warn(`Removing toot with future timestamp:`, this);
            return false;
        } else if (this.filtered?.length || this.reblog?.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatches = (this.filtered || []).concat(this.reblog?.filtered || []);
            const filterMatchStr = filterMatches[0].keywordMatches?.join(' ');
            tootLogger.trace(`Removing toot matching server filter (${filterMatchStr}): ${this.description}`);
            return false;
        } else if (this.tootedAt < timelineCutoffAt()) {
            tootLogger.trace(`Removing toot older than ${timelineCutoffAt()}:`, this.tootedAt);
            return false;
        } else if (blockedDomains.has(this.author.homeserver)) {
            tootLogger.trace(`Removing toot from blocked domain:`, this);
            return false;
        } else if (this.matchesRegex(mutedKeywordRegex)) {
            tootLogger.trace(`Removing toot matching muted keyword regex:`, this);
            return false;
        }

        return true;
    }

    /**
     * Make an API call to get this toot's URL on the FediAlgo user's home server instead of on the toot's home server.
     *       this: https://fosstodon.org/@kate/114360290341300577
     *    becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
     * @returns {Promise<string>} The home server URL.
     */
    async localServerUrl(): Promise<string> {
        const homeURL = `${this.account.localServerUrl}/${await this.resolveID()}`;
        tootLogger.debug(`<homeserverURL()> converted '${this.realURL}' to '${homeURL}'`);
        return homeURL;
    }

    /**
     * True if toot matches 'regex' in the tags, the content, or the link preview card description.
     * @param {RegExp} regex - The string to search for.
     * @returns {boolean}
     */
    matchesRegex(regex: RegExp): boolean {
        return regex.test(this.contentWithCard());
    }

    /**
     * Get Status obj for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<Toot>}
     */
    async resolve(): Promise<Toot> {
        try {
            tootLogger.trace(`Resolving local toot ID for`, this);
            const resolvedToot = await MastoApi.instance.resolveToot(this);
            this.resolvedID = resolvedToot.id; // Cache the resolved ID for future calls
            return resolvedToot;
        } catch (error) {
            tootLogger.error(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            throw error;
        }
    }

    /**
     * Get Status ID for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<string>}
     */
    async resolveID(): Promise<string> {
        this.resolvedID ||= (await this.resolve()).id;
        return this.resolvedID;
    }

    /**
     * Get the toot's tags as a Set of strings. Caches results for future calls.
     * @returns {Set<string>} Set of the names of the tags in this toot.
     */
    tagNames(): Set<string> {
        // TODO: class-transformer doesn't serialize Sets correctly so we have to check if it's an array
        //       See https://github.com/typestack/class-transformer/issues/54
        if (!this.contentCache.tagNames || Array.isArray(this.contentCache.tagNames)) {
            this.contentCache.tagNames = new Set((this.tags || []).map((tag) => tag.name));
        }

        return this.contentCache.tagNames;
    }

    //////////////////////////////
    //     Private methods      //
    //////////////////////////////

    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags in a string
    private addEmojiHtmlTags(str: string, fontSize: number = DEFAULT_FONT_SIZE): string {
        return replaceEmojiShortcodesWithImgTags(str, this.allEmojis, fontSize);
    }

    // return MediaAttachmentType objects with type == attachmentType
    private attachmentsOfType(attachmentType: mastodon.v1.MediaAttachmentType): mastodon.v1.MediaAttachment[] {
        return this.realToot.mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }

    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    private completeProperties(
        userData: UserData,
        trendingLinks: TrendingLink[],
        trendingTags: TagWithUsageCounts[],
        source?: TootSource
    ): void {
        if (source) {
            this.sources ??= [];

            // REFRESH_MUTED_ACCOUNTS isn't a sources for toots even if it's a reason for invoking this method.
            if (source != LoadAction.REFRESH_MUTED_ACCOUNTS && !this.sources.includes(source)) {
                this.sources?.push(source);
            }
        }

        const isDeepInspect = !source;
        this.muted ||= (this.author.webfingerURI in userData.mutedAccounts);
        this.account.isFollowed ||= (this.account.webfingerURI in userData.followedAccounts);

        if (this.reblog) {
            this.reblog.account.isFollowed ||= (this.reblog.account.webfingerURI in userData.followedAccounts);
        }

        // TODO: We handled muted/followed before checking if complete so we can refresh mutes & follows which sucks
        if (this.isComplete()) return;
        const toot = this.realToot;  // Retoots never have their own tags, etc.

        // containsString() matched way too many toots so we use containsTag() for participated tags
        // TODO: things might be fast enough to try this again
        toot.participatedTags = userData.participatedTags.filter(tag => toot.containsTag(tag)).objs;
        // With all the containsString() calls it takes ~1.1 seconds to build 40 toots
        // Without them it's ~0.1 seconds. In particular the trendingLinks are slow! maybe 90% of that time.
        toot.followedTags = userData.followedTags.filter(tag => toot.containsTag(tag, isDeepInspect)).objs;
        toot.trendingTags = trendingTags.filter(tag => toot.containsTag(tag, isDeepInspect));

        // Only set the completedAt field if isDeepInspect is true  // TODO: might be fast enough to try this again?
        if (isDeepInspect) {
            toot.trendingLinks = trendingLinks.filter(link => toot.matchesRegex(link.regex!));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Note the multiple assignmnet!
        } else {
            toot.trendingLinks ??= [];  // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }

    // Generate a string describing the followed and trending tags in the toot
    private containsTagsOfTypeMsg(tagType: TypeFilterName): string | undefined {
        let tags: Hashtag[] = [];

        if (tagType == TypeFilterName.FOLLOWED_HASHTAGS) {
            tags = this.followedTags || [];
        } else if (tagType == TypeFilterName.PARTICIPATED_TAGS) {
            tags = this.participatedTags || [];
        } else if (tagType == TypeFilterName.TRENDING_TAGS) {
            tags = this.trendingTags || [];
        } else {
            tootLogger.warn(`containsTagsOfTypeMsg() called with invalid tagType: ${tagType}`);
            return;
        }

        if (!tags.length) return;
        const tagTypeStr = capitalCase(tagType).replace(/ Tag/, " Hashtag");
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }

     // Return the toot's 'content' field stripped of HTML tags and emojis
    private contentString(): string {
        return htmlToText(this.realToot.contentWithEmojis());
    }

    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    private contentStripped(): string {
        if (!this.contentCache[TootCacheKey.CONTENT_STRIPPED]) {
            const str = removeEmojis(removeTags(removeLinks(this.contentWithCard())));
            this.contentCache[TootCacheKey.CONTENT_STRIPPED] = collapseWhitespace(removeMentions(str));
        }

        return this.contentCache[TootCacheKey.CONTENT_STRIPPED];
    }

    // Return the content with the card title and description added in parentheses, stripped of diacritics for matching tags
    // cache results for future calls to containsString() and containsTag() etc.
    private contentWithCard(): string {
        if (!this.contentCache[TootCacheKey.CONTENT_WITH_CARD]) {
            const cardContent = [this.card?.title || "", this.card?.description || ""].join(" ").trim();
            const txt = (this.contentString() + optionalSuffix(cardContent, htmlToText)).trim();
            this.contentCache[TootCacheKey.CONTENT_WITH_CARD] = removeDiacritics(txt);
        }

        return this.contentCache[TootCacheKey.CONTENT_WITH_CARD];
    }

    // Figure out an appropriate language for the toot based on the content.
    private determineLanguage(): void {
        const text = this.contentStripped();

        // if (this.isUsersOwnToot() || text.length < config.toots.minCharsForLanguageDetect) {
        if (text.length < config.toots.minCharsForLanguageDetect) {
            this.language ??= config.locale.defaultLanguage;
            return;
        }

        const langDetectInfo = detectLanguage(text);
        const { chosenLanguage, langDetector, tinyLD } = langDetectInfo;
        const langLogObj = {...langDetectInfo, text, toot: this, tootLanguage: this.language};
        const logTrace = (msg: string) => repairLogger.trace(`${msg} for "${text}"`, langLogObj);

        // If there's nothing detected log a warning (if text is long enough) and set language to default
        if ((tinyLD.languageAccuracies.length + langDetector.languageAccuracies.length) == 0) {
            // Last ditch effort with detectHashtagLanguage() for foreign scripts
            const foreignScript = detectForeignScriptLanguage(text);

            if (foreignScript) {
                logTrace(`Falling back to foreign script "${foreignScript}" as language`);
                this.language = foreignScript;
            } else if (text.length > (config.toots.minCharsForLanguageDetect * 2)) {
                repairLogger.warn(`no language detected`, langLogObj);
            }

            this.language ??= config.locale.defaultLanguage;
            return;
        }

        // If either language detection matches this.language return
        if (this.language && (tinyLD.chosenLang == this.language || langDetector.chosenLang == this.language)) {
            return;
        }

        // Or if we have successfully detected a language assign it to this.language and return
        if (chosenLanguage) {
            // Don't overwrite "zh-TW" with "zh"
            if (this.language?.startsWith(chosenLanguage)) {
                return;
            } else if (this.language && this.language != UNKNOWN) {
                logTrace(`Using chosenLanguage "${chosenLanguage}" to replace "${this.language}"`);
            }

            this.language = chosenLanguage;
            return;
        }

        if (FOREIGN_SCRIPTS.has(tinyLD.chosenLang) && this.language?.startsWith(tinyLD.chosenLang!)) {
            logTrace(`Using existing foreign lang "${this.language}" even with low accuracy`);
            return;
        }

        // Prioritize English in edge cases with low tinyLD accuracy but "en" either in toot or in LangDetector result
        if (!tinyLD.isAccurate && langDetector.isAccurate && langDetector.chosenLang == LANGUAGE_NAMES.english) {
            logTrace(`Accepting "en" from langDetector.detectedLang`);
            this.language = LANGUAGE_NAMES.english;
            return;
        }

        if (this.language) {
            if (text.length > (2 * config.toots.minCharsForLanguageDetect)) {
                logTrace(`No guess good enough to override language "${this.language}" for "${text}"`);
            }
        } else {
            logTrace(`Defaulting language prop to "en"`);
            this.language ??= config.locale.defaultLanguage;
        }

        // If this is the user's own toot and we have a language set, log it
        // TODO: remove this eventually
        if (this.isUsersOwnToot() && this.language != config.locale.defaultLanguage) {
            repairLogger.warn(`User's own toot language set to "${this.language}"`, langLogObj);
        }
    }

    // Returns true if the toot needs to be (re-)evaluated for trending tags, links, etc.
    private isComplete(): boolean {
        if (!this.completedAt || (this.completedAt < this.lastEditedAt) || !this.trendingLinks) {
            return false;
        }

        // If we have completed it, check if we need to re-evaluate for newer trending tags, links, etc.
        return (
               // Check if toot was completed long enough ago that we might want to re-evaluate it
               ageInMinutes(this.completedAt) < config.minTrendingMinutesUntilStale()
               // But not tooted so long ago that there's little chance of new data
            || ageInMinutes(this.createdAt) > config.toots.completeAfterMinutes
        );
    }

    // Returns true if this toot is by the fedialgo user
    private isUsersOwnToot(): boolean {
        return this.accounts.some((account) => account.webfingerURI == MastoApi.instance.user.webfingerURI)
    }

    /**
     * Repair toot properties:
     *   - Set toot.application.name to UNKNOWN if missing
     *   - Call determineLanguage() to set the language
     *   - Lowercase all tags
     *   - Repair mediaAttachment types if reparable based on URL file extension
     *   - Repair StatusMention objects for users on home server
     * @private
     */
    private repair(): void {
        this.application ??= {name: UNKNOWN};
        this.application.name ??= UNKNOWN;
        this.tags.forEach(repairTag);  // Repair Tags
        this.determineLanguage();      // Determine language

        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);

            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                this.reblog.reblogsBy.push(this.account);
                this.reblog.reblogsBy = sortObjsByProps(this.reblog.reblogsBy, ["displayName"], true, true);
            }
        }

        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                const category = determineMediaCategory(media.remoteUrl);

                if (category) {
                    repairLogger.trace(`Repaired broken ${category} attachment in toot:`, this);
                    media.type = category;
                } else if (this.uri?.includes(BSKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    // Special handling for Bluesky bridge images
                    repairLogger.debug(`Repairing broken bluesky bridge image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else {
                    repairLogger.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            } else if (!MEDIA_TYPES.includes(media.type)) {
                repairLogger.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }

            if (isEmpty(media?.url)) {
                repairLogger.warn(`Media attachment URL is empty for toot:`, this);
            }
        });

        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += at(extractDomain(mention.url));
            }
        })
    }

    ////////////////////////////////
    //       Static methods       //
    ////////////////////////////////

    /**
     * Build array of new Toot objects from an array of Status objects (or Toots).
     * Toots returned are sorted by score and should have most of their properties set correctly.
     * @param {TootLike[]} statuses - Array of status objects or Toots.
     * @param {TootSource} source - The source label for logging.
     * @returns {Promise<Toot[]>}
     */
    static async buildToots(statuses: TootLike[], source: TootSource): Promise<Toot[]> {
        if (!statuses.length) return [];  // Avoid the data fetching if we don't to build anything
        const logger = tootLogger.tempLogger(source, `buildToots`);
        const startedAt = new Date();

        let toots = await this.completeToots(statuses, logger, source);
        toots = await this.removeInvalidToots(toots, logger);
        toots = Toot.dedupeToots(toots, logger);
        // "Best effort" scoring. Note scoreToots() does not sort 'toots' in place but the return value is sorted.
        const tootsSortedByScore = await Scorer.scoreToots(toots, false);

        if (source != LoadAction.REFRESH_MUTED_ACCOUNTS) {
            toots = this.removeUsersOwnToots(tootsSortedByScore, logger);
        }

        logger.trace(`${toots.length} toots built in ${ageString(startedAt)}`);
        return toots;
    }

    /**
     * Fetch all the data we need to set dependent properties and set them on the toots.
     * If 'source' arg is provided we set it as the Toot.source prop and avoid doing an isDeepInspect completion.
     * @param {TootLike[]} toots - Array of toots to complete.
     * @param {Logger} logger - Logger for logging.
     * @param {string} [source] - Optional source label.
     * @returns {Promise<Toot[]>}
     */
    static async completeToots(toots: TootLike[], logger: Logger, source?: TootSource): Promise<Toot[]> {
        logger = logger.tempLogger(`completeToots(${source || ''})`);
        const isDeepInspect = !source;
        const startedAt = new Date();

        const userData = await MastoApi.instance.getUserData();
        const trendingTags = (await MastodonServer.fediverseTrendingTags()).topObjs();
        const trendingLinks = isDeepInspect ? (await MastodonServer.fediverseTrendingLinks()) : []; // Skip trending links
        let completedToots: TootLike[] = [];
        let incompleteToots = toots;

        // If isDeepInspect separate toots that need completing bc it's slow to rely on isComplete() + batching
        if (isDeepInspect) {
            [completedToots, incompleteToots] = (split(toots, (t) => t instanceof Toot && t.isComplete()));
        }

        const newCompleteToots: Toot[] = await batchMap(
            incompleteToots,
            async (tootLike: TootLike) => {
                const toot = (tootLike instanceof Toot) ? tootLike : Toot.build(tootLike);
                toot.completeProperties(userData, trendingLinks, trendingTags, source);
                return toot as Toot;
            },
            {
                batchSize: config.toots.batchCompleteSize,
                logger,
                sleepBetweenMS: isDeepInspect ? config.toots.batchCompleteSleepBetweenMS : 0
            }
        );

        const msg = `${toots.length} toots ${ageString(startedAt)}`;
        logger.debug(`${msg} (${newCompleteToots.length} completed, ${completedToots.length} skipped)`);
        return newCompleteToots.concat(completedToots as Toot[]);
    }

    /**
     * Remove dupes by uniquifying on the toot's URI.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} [inLogger] - Logger for logging.
     * @returns {Toot[]} Deduped array of toots.
     */
    static dedupeToots(toots: Toot[], inLogger?: Logger): Toot[] {
        inLogger ||= tootLogger;
        const logger = inLogger.tempLogger('dedupeToots()');
        const tootsByURI = groupBy<Toot>(toots, toot => toot.realURI);

        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            if (uriToots.length == 1) return;  // If there's only one toot, nothing to do

            uriToots.sort((a, b) => (b.lastEditedAt < a.lastEditedAt) ? -1 : 1);
            const lastCompleted = uriToots.find(toot => !!(toot.realToot.completedAt));
            const lastScored = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably not 100% correct
            const lastTrendingRank = uriToots.find(toot => !!toot.realToot.trendingRank);
            // Deal with array properties that we want to collate
            const uniqFiltered = this.uniqFlatMap<mastodon.v1.FilterResult>(uriToots, "filtered", (f) => f.filter.id);
            const uniqFollowedTags = this.uniqFlatMap<mastodon.v1.Tag>(uriToots, "followedTags", (t) => t.name);
            const uniqTrendingLinks = this.uniqFlatMap<TrendingLink>(uriToots, "trendingLinks", (t) => t.url);
            const uniqTrendingTags = this.uniqFlatMap<TagWithUsageCounts>(uriToots, "trendingTags", (t) => t.name);
            const uniqSources = this.uniqFlatMap<string>(uriToots, "sources", (source) => source);
            // Collate multiple retooters if they exist
            let reblogsBy = this.uniqFlatMap<Account>(uriToots, "reblogsBy", (account) => account.webfingerURI);
            reblogsBy = sortObjsByProps(reblogsBy, ["displayName"], true, true);
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(toot => toot.accounts);
            // Helper method to collate the isFollowed property for the accounts
            const isFollowed = (uri: string) => allAccounts.some((a) => a.isFollowed && (a.webfingerURI == uri));
            const isSuspended = (uri: string) => allAccounts.some((a) => a.suspended && (a.webfingerURI == uri));

            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = PROPS_THAT_CHANGE.reduce((propValues, propName) => {
                propValues[propName] = Math.max(...uriToots.map(t => t.realToot[propName] || 0));
                return propValues;
            }, {} as Record<TootNumberProp, number>);

            uriToots.forEach((toot) => {
                // propsThatChange are only set on the realToot
                toot.realToot.favouritesCount = propsThatChange.favouritesCount;
                toot.realToot.numTimesShown = propsThatChange.numTimesShown;
                toot.realToot.reblogsCount = propsThatChange.reblogsCount;
                toot.realToot.repliesCount = propsThatChange.repliesCount;
                // Props set on first found
                toot.realToot.completedAt ??= lastCompleted?.realToot.completedAt;
                toot.realToot.trendingRank ??= lastTrendingRank?.realToot.trendingRank;
                toot.scoreInfo ??= lastScored?.scoreInfo; // TODO: this is probably wrong... retoot scores could differ but should be corrected
                // Tags + sources + server side filter matches
                toot.realToot.followedTags = uniqFollowedTags;
                toot.realToot.trendingLinks = uniqTrendingLinks;
                toot.realToot.trendingTags = uniqTrendingTags;
                toot.filtered = uniqFiltered;
                toot.sources = uniqSources;
                // Booleans usually only set on the realToot
                toot.realToot.bookmarked = uriToots.some(toot => toot.realToot.bookmarked);
                toot.realToot.favourited = uriToots.some(toot => toot.realToot.favourited);
                toot.realToot.reblogged = uriToots.some(toot => toot.realToot.reblogged);
                toot.muted = uriToots.some(toot => toot.muted || toot.realToot.muted);  // Liberally set muted on retoots and real toots

                toot.accounts.forEach((account) => {
                    account.isFollowed ||= isFollowed(account.webfingerURI);
                    account.suspended ||= isSuspended(account.webfingerURI);
                });

                // Reblog props
                if (toot.reblog) {
                    toot.reblog.completedAt ??= lastCompleted?.realToot.completedAt;
                    toot.reblog.filtered = uniqFiltered;
                    toot.reblog.reblogsBy = reblogsBy;
                    toot.reblog.sources = uniqSources;
                }
            });
        });

        // Choose the most recent retoot from the group of toots with the same realURI value
        const deduped = Object.values(tootsByURI).map((toots) => {
            const mostRecent = mostRecentToot(toots)! as Toot;

            // Skip logging this in production
            if (!isProduction && uniquify(toots.map(t => t.uri))!.length > 1) {
                logger.deep(`deduped ${toots.length} toots to ${mostRecent.description}:`, toots);
            }

            return mostRecent;
        });

        logger.logArrayReduction(toots, deduped, "Toot", "duplicate");
        return deduped;
    }

    /**
     * Get rid of toots we never want to see again.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Promise<Toot[]>}
     */
    static async removeInvalidToots(toots: Toot[], logger: Logger): Promise<Toot[]> {
        let blockedDomains: Set<string> = new Set();
        let mutedKeywordsRegex: RegExp;

        if (MastoApi.instance.userData) {
            blockedDomains = new Set(MastoApi.instance.userData.blockedDomains);
            mutedKeywordsRegex = MastoApi.instance.userData.mutedKeywordsRegex;
        } else {
            blockedDomains = new Set(await MastoApi.instance.getBlockedDomains());
            mutedKeywordsRegex = await UserData.getMutedKeywordsRegex();
        }

        return filterWithLog(
            toots,
            toot => toot.isValidForFeed(mutedKeywordsRegex, blockedDomains),
            logger,
            'invalid',
            'Toot'
        );
    }

    /**
     * Get rid of the user's own toots.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Toot[]} Array without user's own toots.
     */
    static removeUsersOwnToots(toots: Toot[], logger: Logger): Toot[] {
        const newToots = toots.filter(toot => !toot.isUsersOwnToot());
        logger.logArrayReduction(toots, newToots, 'Toot', "user's own toots")
        return newToots;
    }

    /**
     * Filter an array of toots down to just the retoots.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of retoots.
     */
    static onlyRetoots(toots: Toot[]): Toot[] {
        return toots.filter(toot => toot.reblog);
    }

    /**
     * Filter an array of toots down to just the replies.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of replies.
     */
    static onlyReplies(toots: Toot[]): Toot[] {
        return toots.filter(toot => toot.inReplyToAccountId);
    }

    /**
     * Return a new array of a toot property collected and uniquified from an array of toots.
     * @private
     * @template T
     * @param {Toot[]} toots - Array of toots.
     * @param {KeysOfValueType<Toot, any[] | undefined>} property - The property to collect.
     * @param {(elem: T) => string} uniqFxn - Function to get unique key for each element.
     * @returns {T[]} Array of unique property values.
     */
    private static uniqFlatMap<T>(
        toots: Toot[],
        property: KeysOfValueType<Toot, unknown[] | undefined>,
        uniqFxn: (elem: T) => string
    ): T[] {
        const mappedReblogs = toots.flatMap(toot => (toot.reblog?.[property] as T[] | undefined) ?? []);
        const mapped = (toots.flatMap(toot => (toot[property] as T[] | undefined) ?? [])).concat(mappedReblogs);
        return uniquifyByProp(mapped, uniqFxn);
    }
};

/**
 * Get the Date the toot was created.
 * @private
 * @param {TootLike} toot - The toot object.
 * @returns {Date}
 */
export const tootedAt = (toot: TootLike): Date => new Date(toot.createdAt);

/**
 * Get the earliest toot from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
export const earliestToot = (toots: TootLike[]): TootLike | null => sortByCreatedAt(toots)[0];

/**
 * Get the most recent toot from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
export const mostRecentToot = (toots: TootLike[]): TootLike | null => sortByCreatedAt(toots).slice(-1)[0];

/**
 * Returns array with oldest toot first.
 * @private
 * @template T extends TootLike
 * @param {T} toots - List of toots.
 * @returns {T}
 */
export function sortByCreatedAt<T extends TootLike[]>(toots: T): T {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1) as T;
};

/**
 * Get the Date of the earliest toot in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
export const earliestTootedAt = (toots: TootLike[]): Date | null => {
    const earliest = earliestToot(toots);
    return earliest ? tootedAt(earliest) : null;
};

/**
 * Get the Date of the most recent toot in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
export const mostRecentTootedAt = (toots: TootLike[]): Date | null => {
    const newest = mostRecentToot(toots);
    return newest ? tootedAt(newest) : null;
};
