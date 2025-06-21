"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mostRecentTootedAt = exports.earliestTootedAt = exports.sortByCreatedAt = exports.mostRecentToot = exports.earliestToot = exports.tootedAt = void 0;
/**
 * @fileoverview Toot class and helper methods for dealing with Mastodon Status objects.
 * Includes methods for scoring, filtering, deduplication, and property repair.
 */
const change_case_1 = require("change-case");
const lodash_1 = require("lodash");
const class_transformer_1 = require("class-transformer");
const account_1 = __importDefault(require("./account"));
const api_1 = __importDefault(require("../api"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const scorer_1 = __importDefault(require("../../scorer/scorer"));
const user_data_1 = __importDefault(require("../user_data"));
const time_helpers_1 = require("../../helpers/time_helpers");
const config_1 = require("../../config");
const numeric_filter_1 = require("../../filters/numeric_filter");
const language_helper_1 = require("../../helpers/language_helper");
const environment_helpers_1 = require("../../helpers/environment_helpers");
const tag_1 = require("./tag");
const enums_1 = require("../../enums");
const logger_1 = require("../../helpers/logger");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const string_helpers_1 = require("../../helpers/string_helpers");
// https://docs.joinmastodon.org/entities/Status/#visibility
var TootVisibility;
(function (TootVisibility) {
    TootVisibility["DIRECT_MSG"] = "direct";
    TootVisibility["PUBLIC"] = "public";
    TootVisibility["PRIVATE"] = "private";
    TootVisibility["UNLISTED"] = "unlisted";
})(TootVisibility || (TootVisibility = {}));
;
var TootCacheKey;
(function (TootCacheKey) {
    TootCacheKey["CONTENT_STRIPPED"] = "contentStripped";
    TootCacheKey["CONTENT_WITH_EMOJIS"] = "contentWithEmojis";
    TootCacheKey["CONTENT_WITH_CARD"] = "contentWithCard";
})(TootCacheKey || (TootCacheKey = {}));
;
class TootCacheObj {
    [TootCacheKey.CONTENT_STRIPPED];
    [TootCacheKey.CONTENT_WITH_EMOJIS];
    [TootCacheKey.CONTENT_WITH_CARD];
    tagNames; // Cache of tag names for faster access
}
const UNKNOWN = "unknown";
const BSKY_BRIDGY = 'bsky.brid.gy';
const HASHTAG_LINK_REGEX = /<a href="https:\/\/[\w.]+\/tags\/[\w]+" class="[-\w_ ]*hashtag[-\w_ ]*" rel="[a-z ]+"( target="_blank")?>#<span>[\w]+<\/span><\/a>/i;
const HASHTAG_PARAGRAPH_REGEX = new RegExp(`^<p>(?:${HASHTAG_LINK_REGEX.source} ?)+</p>`, "i");
const PROPS_THAT_CHANGE = numeric_filter_1.FILTERABLE_SCORES.concat("numTimesShown");
const tootLogger = new logger_1.Logger("Toot");
const repairLogger = tootLogger.tempLogger("repairToot");
;
;
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
class Toot {
    // Props from mastodon.v1.Status
    id;
    uri;
    application;
    account;
    content;
    createdAt;
    editedAt = null;
    emojis;
    favouritesCount;
    mediaAttachments;
    mentions;
    reblogsCount;
    repliesCount;
    sensitive;
    spoilerText;
    tags;
    visibility;
    // Optional fields
    bookmarked;
    card;
    favourited;
    filtered;
    language;
    inReplyToAccountId;
    inReplyToId;
    muted;
    pinned;
    poll;
    reblog;
    reblogged;
    text;
    url;
    // extensions to mastodon.v1.Status. Most of these are set in completeProperties()
    completedAt;
    followedTags; // Array of tags that the user follows that exist in this toot
    numTimesShown;
    participatedTags; // Array of tags that the user has participated in that exist in this toot
    reblogsBy; // The accounts that retooted this toot
    resolvedID; // This Toot with URLs resolved to homeserver versions
    scoreInfo; // Scoring info for weighting/sorting this toot
    sources; // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks; // Links that are trending in this toot
    trendingRank; // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags; // Tags that are trending that appear in this toot
    audioAttachments;
    imageAttachments;
    videoAttachments;
    // See JSDoc comment for explanations of the various getters
    get accounts() { return this.withRetoot.map((toot) => toot.account); }
    ;
    get ageInHours() { return (0, time_helpers_1.ageInHours)(this.createdAt); }
    ;
    get allEmojis() { return (this.emojis || []).concat(this.account.emojis || []); }
    ;
    get author() { return this.realToot.account; }
    ;
    get homeserver() { return this.author.homeserver; }
    ;
    get isDM() { return this.visibility === TootVisibility.DIRECT_MSG; }
    ;
    get isFollowed() { return !!(this.accounts.some(a => a.isFollowed) || this.realToot.followedTags?.length); }
    ;
    get isLocal() { return api_1.default.instance.isLocalUrl(this.realURI); }
    ;
    get isPrivate() { return this.visibility === TootVisibility.PRIVATE; }
    ;
    get isTrending() { return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length); }
    ;
    get lastEditedAt() { return this.editedAt || this.createdAt; }
    ;
    get popularity() { return (0, collection_helpers_1.sumArray)([this.favouritesCount, this.reblogsCount, this.repliesCount, this.trendingRank]); }
    ;
    get realToot() { return this.reblog ?? this; }
    ;
    get realURI() { return this.realToot.uri; }
    ;
    get realURL() { return this.realToot.url || this.realURI; }
    ;
    get replyMentions() { return [this.author.webfingerURI].concat((this.mentions || []).map((m) => m.acct)).map(string_helpers_1.at); }
    ;
    get score() { return this.scoreInfo?.score || 0; }
    ;
    get tootedAt() { return new Date(this.createdAt); }
    ; // TODO: should this consider the values in reblogsBy?
    get withRetoot() { return [this, ...(0, collection_helpers_1.asOptionalArray)(this.reblog)]; }
    ;
    get attachmentType() {
        if (this.imageAttachments.length) {
            return enums_1.MediaCategory.IMAGE;
        }
        else if (this.videoAttachments.length) {
            return enums_1.MediaCategory.VIDEO;
        }
        else if (this.audioAttachments.length) {
            return enums_1.MediaCategory.AUDIO;
        }
    }
    get contentTagsParagraph() {
        const finalParagraph = this.contentParagraphs().slice(-1)[0];
        return HASHTAG_PARAGRAPH_REGEX.test(finalParagraph) ? finalParagraph : undefined;
    }
    get description() {
        const msg = `${this.account.description} [url="${this.url || this.uri}"`;
        return `${msg}, createdAt="${(0, time_helpers_1.toISOFormat)(this.createdAt)}"]: "${this.contentShortened()}"`;
    }
    // Temporary caches for performance (profiler said contentWithCard() was using a lot of runtime)
    contentCache = {};
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {SerializableToot} toot - The toot data to build from.
     * @returns {Toot} The constructed Toot instance.
     */
    static build(toot) {
        if (toot instanceof Toot) {
            // Clear the cache if the toot was edited // TODO: Probably not the ideal time to clear the cache
            if (toot.editedAt)
                toot.contentCache = {};
            return toot;
        }
        const tootObj = new Toot();
        tootObj.id = toot.id;
        tootObj.uri = toot.uri;
        tootObj.account = account_1.default.build(toot.account);
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
        tootObj.reblogsBy = (toot.reblogsBy ?? []).map(account => account_1.default.build(account));
        tootObj.resolvedID = toot.resolvedID;
        tootObj.scoreInfo = toot.scoreInfo;
        tootObj.sources = toot.sources;
        tootObj.trendingLinks = toot.trendingLinks;
        tootObj.trendingRank = toot.trendingRank;
        tootObj.trendingTags = toot.trendingTags;
        tootObj.repair();
        // These must be set after repair() has a chance to fix any broken media types
        tootObj.audioAttachments = tootObj.attachmentsOfType(enums_1.MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(enums_1.MediaCategory.IMAGE);
        tootObj.videoAttachments = string_helpers_1.VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));
        if (tootObj.account.suspended) {
            tootLogger.warn(`Toot from suspended account:`, tootObj);
        }
        else if (tootObj.account.limited) {
            tootLogger.trace(`Toot from limited account:`, tootObj);
        }
        return tootObj;
    }
    /**
     * True if toot contains 'str' in the tags, the content, or the link preview card description.
     * @param {string} str - The string to search for.
     * @returns {boolean}
     */
    containsString(str) {
        return this.matchesRegex((0, string_helpers_1.wordRegex)(str));
    }
    /**
     * Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search.
     * @param {TagWithUsageCounts} tag - The tag to search for.
     * @param {boolean} [fullScan] - Whether to use full scan.
     * @returns {boolean}
     */
    containsTag(tag, fullScan) {
        if (fullScan && (0, tag_1.isValidForSubstringSearch)(tag)) {
            if (!tag.regex) {
                tootLogger.warn(`containsTag() called on tag without regex:`, tag);
                tag.regex = (0, string_helpers_1.wordRegex)(tag.name);
            }
            return this.matchesRegex(tag.regex);
        }
        else {
            try {
                return this.tagNames().has(tag.name);
            }
            catch (err) {
                tootLogger.error(`Error in containsTag("${tag.name}"), current cache:`, this.contentCache, err);
                this.contentCache.tagNames = new Set((this.tags || []).map((tag) => tag.name));
                return this.contentCache.tagNames.has(tag.name);
            }
        }
    }
    /**
     * Generate a string describing the followed, trending, and participated tags in the toot.
     * TODO: add favourited tags?
     * @returns {string | undefined}
     */
    containsTagsMsg() {
        let msgs = [
            this.containsTagsOfTypeMsg(enums_1.TypeFilterName.FOLLOWED_HASHTAGS),
            this.containsTagsOfTypeMsg(enums_1.TypeFilterName.TRENDING_TAGS),
            this.containsTagsOfTypeMsg(enums_1.TypeFilterName.PARTICIPATED_TAGS),
        ];
        msgs = msgs.filter((msg) => msg);
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }
    /**
     * Returns true if the fedialgo user is mentioned in the toot.
     * @returns {boolean}
     */
    containsUserMention() {
        return this.mentions.some((mention) => mention.acct == api_1.default.instance.user.webfingerURI);
    }
    /**
     * Return all but the last paragraph if that last paragraph is just hashtag links.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentNonTagsParagraphs(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const paragraphs = this.contentParagraphs(fontSize);
        if (this.contentTagsParagraph)
            paragraphs.pop(); // Remove the last paragraph if it's just hashtags
        return paragraphs.join("\n");
    }
    /**
     * Break up the content into paragraphs and add <img> tags for custom emojis.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string[]}
     */
    contentParagraphs(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.htmlToParagraphs)(this.contentWithEmojis(fontSize));
    }
    /**
     * Shortened string of content property stripped of HTML tags.
     * @param {number} [maxChars]
     * @returns {string}
     */
    contentShortened(maxChars) {
        maxChars ||= config_1.config.toots.maxContentPreviewChars;
        let content = (0, string_helpers_1.replaceHttpsLinks)(this.contentString());
        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            content = `<${(0, change_case_1.capitalCase)(this.attachmentType || 'empty')} post by ${this.author.description}>`;
        }
        else if (content.length > maxChars) {
            content = `${content.slice(0, maxChars)}...`;
        }
        return content;
    }
    /**
     * Replace custom emoji shortcodes (e.g. ":myemoji:") with image tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    contentWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        if (!this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS]) {
            this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS] = this.addEmojiHtmlTags(this.content, fontSize);
        }
        return this.contentCache[TootCacheKey.CONTENT_WITH_EMOJIS];
    }
    /**
     * Fetch the conversation (context) for this toot (Mastodon API calls this a 'context').
     * @returns {Promise<Toot[]>}
     */
    async getConversation() {
        const action = enums_1.LoadAction.GET_CONVERSATION;
        const logger = tootLogger.tempLogger(action);
        logger.debug(`Fetching conversation for toot:`, this.description);
        const startTime = new Date();
        const context = await api_1.default.instance.api.v1.statuses.$select(await this.resolveID()).context.fetch();
        const toots = await Toot.buildToots([...context.ancestors, this, ...context.descendants], action);
        logger.trace(`Fetched ${toots.length} toots ${(0, time_helpers_1.ageString)(startTime)}`, toots.map(t => t.description));
        return toots;
    }
    /**
     * Get an individual score for this toot.
     * @param {ScoreType} scoreType - The score type.
     * @param {ScoreName} name - The score name.
     * @returns {number}
     */
    getIndividualScore(scoreType, name) {
        if ((0, lodash_1.isFinite)(this.scoreInfo?.scores?.[name]?.[scoreType])) {
            return this.scoreInfo.scores[name][scoreType];
        }
        else {
            tootLogger.trace(`no score available for ${scoreType}/${name}:`, this);
            return 0;
        }
    }
    /**
     * Return true if the toot should not be filtered out of the feed by the current filters.
     * @param {FeedFilterSettings} filters - The feed filter settings.
     * @returns {boolean}
     */
    isInTimeline(filters) {
        const isOK = Object.values(filters.booleanFilters).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }
    /**
     * Return false if Toot should be discarded from feed altogether and permanently.
     * @param {mastodon.v2.Filter[]} serverSideFilters - Server-side filters.
     * @returns {boolean}
     */
    isValidForFeed(mutedKeywordRegex, blockedDomains) {
        if (this.reblog?.muted || this.muted) {
            tootLogger.trace(`Removing toot from muted account (${this.author.description}):`, this);
            return false;
        }
        else if (Date.now() < this.tootedAt.getTime()) {
            // Sometimes there are wonky statuses that are like years in the future so we filter them out.
            tootLogger.warn(`Removing toot with future timestamp:`, this);
            return false;
        }
        else if (this.filtered?.length || this.reblog?.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatches = (this.filtered || []).concat(this.reblog?.filtered || []);
            const filterMatchStr = filterMatches[0].keywordMatches?.join(' ');
            tootLogger.trace(`Removing toot matching server filter (${filterMatchStr}): ${this.description}`);
            return false;
        }
        else if (this.tootedAt < (0, time_helpers_1.timelineCutoffAt)()) {
            tootLogger.trace(`Removing toot older than ${(0, time_helpers_1.timelineCutoffAt)()}:`, this.tootedAt);
            return false;
        }
        else if (blockedDomains.has(this.author.homeserver)) {
            tootLogger.trace(`Removing toot from blocked domain:`, this);
            return false;
        }
        else if (this.matchesRegex(mutedKeywordRegex)) {
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
    async localServerUrl() {
        const homeURL = `${this.account.localServerUrl}/${await this.resolveID()}`;
        tootLogger.debug(`<homeserverURL()> converted '${this.realURL}' to '${homeURL}'`);
        return homeURL;
    }
    /**
     * True if toot matches 'regex' in the tags, the content, or the link preview card description.
     * @param {RegExp} regex - The string to search for.
     * @returns {boolean}
     */
    matchesRegex(regex) {
        return regex.test(this.contentWithCard());
    }
    /**
     * Get Status obj for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<Toot>}
     */
    async resolve() {
        try {
            tootLogger.trace(`Resolving local toot ID for`, this);
            const resolvedToot = await api_1.default.instance.resolveToot(this);
            this.resolvedID = resolvedToot.id; // Cache the resolved ID for future calls
            return resolvedToot;
        }
        catch (error) {
            tootLogger.error(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            throw error;
        }
    }
    /**
     * Get Status ID for toot from user's home server so the property URLs point to the home server.
     * @returns {Promise<string>}
     */
    async resolveID() {
        this.resolvedID ||= (await this.resolve()).id;
        return this.resolvedID;
    }
    /**
     * Get the toot's tags as a Set of strings. Caches results for future calls.
     * @returns {Set<string>} Set of the names of the tags in this toot.
     */
    tagNames() {
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
    addEmojiHtmlTags(str, fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImgTags)(str, this.allEmojis, fontSize);
    }
    // return MediaAttachmentType objects with type == attachmentType
    attachmentsOfType(attachmentType) {
        return this.realToot.mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }
    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    completeProperties(userData, trendingLinks, trendingTags, source) {
        if (source) {
            this.sources ??= [];
            // REFRESH_MUTED_ACCOUNTS isn't a sources for toots even if it's a reason for invoking this method.
            if (source != enums_1.LoadAction.REFRESH_MUTED_ACCOUNTS && !this.sources.includes(source)) {
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
        if (this.isComplete())
            return;
        const toot = this.realToot; // Retoots never have their own tags, etc.
        // containsString() matched way too many toots so we use containsTag() for participated tags
        // TODO: things might be fast enough to try this again
        toot.participatedTags = userData.participatedTags.filter(tag => toot.containsTag(tag)).objs;
        // With all the containsString() calls it takes ~1.1 seconds to build 40 toots
        // Without them it's ~0.1 seconds. In particular the trendingLinks are slow! maybe 90% of that time.
        toot.followedTags = userData.followedTags.filter(tag => toot.containsTag(tag, isDeepInspect)).objs;
        toot.trendingTags = trendingTags.filter(tag => toot.containsTag(tag, isDeepInspect));
        // Only set the completedAt field if isDeepInspect is true  // TODO: might be fast enough to try this again?
        if (isDeepInspect) {
            toot.trendingLinks = trendingLinks.filter(link => toot.matchesRegex(link.regex));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Note the multiple assignmnet!
        }
        else {
            toot.trendingLinks ??= []; // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsOfTypeMsg(tagType) {
        let tags = [];
        if (tagType == enums_1.TypeFilterName.FOLLOWED_HASHTAGS) {
            tags = this.followedTags || [];
        }
        else if (tagType == enums_1.TypeFilterName.PARTICIPATED_TAGS) {
            tags = this.participatedTags || [];
        }
        else if (tagType == enums_1.TypeFilterName.TRENDING_TAGS) {
            tags = this.trendingTags || [];
        }
        else {
            tootLogger.warn(`containsTagsOfTypeMsg() called with invalid tagType: ${tagType}`);
            return;
        }
        if (!tags.length)
            return;
        const tagTypeStr = (0, change_case_1.capitalCase)(tagType).replace(/ Tag/, " Hashtag");
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }
    // Return the toot's 'content' field stripped of HTML tags and emojis
    contentString() {
        return (0, string_helpers_1.htmlToText)(this.realToot.contentWithEmojis());
    }
    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    contentStripped() {
        if (!this.contentCache[TootCacheKey.CONTENT_STRIPPED]) {
            const str = (0, string_helpers_1.removeEmojis)((0, string_helpers_1.removeTags)((0, string_helpers_1.removeLinks)(this.contentWithCard())));
            this.contentCache[TootCacheKey.CONTENT_STRIPPED] = (0, string_helpers_1.collapseWhitespace)((0, string_helpers_1.removeMentions)(str));
        }
        return this.contentCache[TootCacheKey.CONTENT_STRIPPED];
    }
    // Return the content with the card title and description added in parentheses, stripped of diacritics for matching tags
    // cache results for future calls to containsString() and containsTag() etc.
    contentWithCard() {
        if (!this.contentCache[TootCacheKey.CONTENT_WITH_CARD]) {
            const cardContent = [this.card?.title || "", this.card?.description || ""].join(" ").trim();
            const txt = (this.contentString() + (0, string_helpers_1.optionalSuffix)(cardContent, string_helpers_1.htmlToText)).trim();
            this.contentCache[TootCacheKey.CONTENT_WITH_CARD] = (0, string_helpers_1.removeDiacritics)(txt);
        }
        return this.contentCache[TootCacheKey.CONTENT_WITH_CARD];
    }
    // Figure out an appropriate language for the toot based on the content.
    determineLanguage() {
        const text = this.contentStripped();
        // if (this.isUsersOwnToot() || text.length < config.toots.minCharsForLanguageDetect) {
        if (text.length < config_1.config.toots.minCharsForLanguageDetect) {
            this.language ??= config_1.config.locale.defaultLanguage;
            return;
        }
        const langDetectInfo = (0, language_helper_1.detectLanguage)(text);
        const { chosenLanguage, langDetector, tinyLD } = langDetectInfo;
        const langLogObj = { ...langDetectInfo, text, toot: this, tootLanguage: this.language };
        const logTrace = (msg) => repairLogger.trace(`${msg} for "${text}"`, langLogObj);
        // If there's nothing detected log a warning (if text is long enough) and set language to default
        if ((tinyLD.languageAccuracies.length + langDetector.languageAccuracies.length) == 0) {
            // Last ditch effort with detectHashtagLanguage() for foreign scripts
            const foreignScript = (0, language_helper_1.detectForeignScriptLanguage)(text);
            if (foreignScript) {
                logTrace(`Falling back to foreign script "${foreignScript}" as language`);
                this.language = foreignScript;
            }
            else if (text.length > (config_1.config.toots.minCharsForLanguageDetect * 2)) {
                repairLogger.warn(`no language detected`, langLogObj);
            }
            this.language ??= config_1.config.locale.defaultLanguage;
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
            }
            else if (this.language && this.language != UNKNOWN) {
                logTrace(`Using chosenLanguage "${chosenLanguage}" to replace "${this.language}"`);
            }
            this.language = chosenLanguage;
            return;
        }
        if (language_helper_1.FOREIGN_SCRIPTS.has(tinyLD.chosenLang) && this.language?.startsWith(tinyLD.chosenLang)) {
            logTrace(`Using existing foreign lang "${this.language}" even with low accuracy`);
            return;
        }
        // Prioritize English in edge cases with low tinyLD accuracy but "en" either in toot or in LangDetector result
        if (!tinyLD.isAccurate && langDetector.isAccurate && langDetector.chosenLang == language_helper_1.LANGUAGE_NAMES.english) {
            logTrace(`Accepting "en" from langDetector.detectedLang`);
            this.language = language_helper_1.LANGUAGE_NAMES.english;
            return;
        }
        if (this.language) {
            if (text.length > (2 * config_1.config.toots.minCharsForLanguageDetect)) {
                logTrace(`No guess good enough to override language "${this.language}" for "${text}"`);
            }
        }
        else {
            logTrace(`Defaulting language prop to "en"`);
            this.language ??= config_1.config.locale.defaultLanguage;
        }
        // If this is the user's own toot and we have a language set, log it
        // TODO: remove this eventually
        if (this.isUsersOwnToot() && this.language != config_1.config.locale.defaultLanguage) {
            repairLogger.warn(`User's own toot language set to "${this.language}"`, langLogObj);
        }
    }
    // Returns true if the toot needs to be (re-)evaluated for trending tags, links, etc.
    isComplete() {
        if (!this.completedAt || (this.completedAt < this.lastEditedAt) || !this.trendingLinks) {
            return false;
        }
        // If we have completed it, check if we need to re-evaluate for newer trending tags, links, etc.
        return (
        // Check if toot was completed long enough ago that we might want to re-evaluate it
        (0, time_helpers_1.ageInMinutes)(this.completedAt) < config_1.config.minTrendingMinutesUntilStale()
            // But not tooted so long ago that there's little chance of new data
            || (0, time_helpers_1.ageInMinutes)(this.createdAt) > config_1.config.toots.completeAfterMinutes);
    }
    // Returns true if this toot is by the fedialgo user
    isUsersOwnToot() {
        return this.accounts.some((account) => account.webfingerURI == api_1.default.instance.user.webfingerURI);
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
    repair() {
        this.application ??= { name: UNKNOWN };
        this.application.name ??= UNKNOWN;
        this.tags.forEach(tag_1.repairTag); // Repair Tags
        this.determineLanguage(); // Determine language
        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);
            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                this.reblog.reblogsBy.push(this.account);
                this.reblog.reblogsBy = (0, collection_helpers_1.sortObjsByProps)(this.reblog.reblogsBy, ["displayName"], true, true);
            }
        }
        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                const category = (0, string_helpers_1.determineMediaCategory)(media.remoteUrl);
                if (category) {
                    repairLogger.trace(`Repaired broken ${category} attachment in toot:`, this);
                    media.type = category;
                }
                else if (this.uri?.includes(BSKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    // Special handling for Bluesky bridge images
                    repairLogger.debug(`Repairing broken bluesky bridge image attachment in toot:`, this);
                    media.type = enums_1.MediaCategory.IMAGE;
                }
                else {
                    repairLogger.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            }
            else if (!string_helpers_1.MEDIA_TYPES.includes(media.type)) {
                repairLogger.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }
            if ((0, lodash_1.isEmpty)(media?.url)) {
                repairLogger.warn(`Media attachment URL is empty for toot:`, this);
            }
        });
        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += (0, string_helpers_1.at)((0, string_helpers_1.extractDomain)(mention.url));
            }
        });
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
    static async buildToots(statuses, source) {
        if (!statuses.length)
            return []; // Avoid the data fetching if we don't to build anything
        const logger = tootLogger.tempLogger(source, `buildToots`);
        const startedAt = new Date();
        let toots = await this.completeToots(statuses, logger, source);
        toots = await this.removeInvalidToots(toots, logger);
        toots = Toot.dedupeToots(toots, logger);
        // "Best effort" scoring. Note scoreToots() does not sort 'toots' in place but the return value is sorted.
        const tootsSortedByScore = await scorer_1.default.scoreToots(toots, false);
        if (source != enums_1.LoadAction.REFRESH_MUTED_ACCOUNTS) {
            toots = this.removeUsersOwnToots(tootsSortedByScore, logger);
        }
        logger.trace(`${toots.length} toots built in ${(0, time_helpers_1.ageString)(startedAt)}`);
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
    static async completeToots(toots, logger, source) {
        logger = logger.tempLogger(`completeToots(${source || ''})`);
        const isDeepInspect = !source;
        const startedAt = new Date();
        const userData = await api_1.default.instance.getUserData();
        const trendingTags = (await mastodon_server_1.default.fediverseTrendingTags()).topObjs();
        const trendingLinks = isDeepInspect ? (await mastodon_server_1.default.fediverseTrendingLinks()) : []; // Skip trending links
        let completeToots = [];
        let tootsToComplete = toots;
        // If isDeepInspect separate toots that need completing bc it's slow to rely on isComplete() + batching
        if (isDeepInspect) {
            [completeToots, tootsToComplete] = ((0, collection_helpers_1.split)(toots, (t) => t instanceof Toot && t.isComplete()));
        }
        const newCompleteToots = await (0, collection_helpers_1.batchMap)(tootsToComplete, async (tootLike) => {
            const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
            toot.completeProperties(userData, trendingLinks, trendingTags, source);
            return toot;
        }, {
            batchSize: config_1.config.toots.batchCompleteSize,
            logger,
            sleepBetweenMS: isDeepInspect ? config_1.config.toots.batchCompleteSleepBetweenMS : 0
        });
        const msg = `${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`;
        logger.debug(`${msg} (${newCompleteToots.length} completed, ${completeToots.length} skipped)`);
        return newCompleteToots.concat(completeToots);
    }
    /**
     * Remove dupes by uniquifying on the toot's URI.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} [inLogger] - Logger for logging.
     * @returns {Toot[]} Deduped array of toots.
     */
    static dedupeToots(toots, inLogger) {
        inLogger ||= tootLogger;
        const logger = inLogger.tempLogger('dedupeToots()');
        const tootsByURI = (0, collection_helpers_1.groupBy)(toots, toot => toot.realURI);
        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            if (uriToots.length == 1)
                return; // If there's only one toot, nothing to do
            uriToots.sort((a, b) => (b.lastEditedAt < a.lastEditedAt) ? -1 : 1);
            const lastCompleted = uriToots.find(toot => !!(toot.realToot.completedAt));
            const lastScored = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably not 100% correct
            const lastTrendingRank = uriToots.find(toot => !!toot.realToot.trendingRank);
            // Deal with array properties that we want to collate
            const uniqFiltered = this.uniqFlatMap(uriToots, "filtered", (f) => f.filter.id);
            const uniqFollowedTags = this.uniqFlatMap(uriToots, "followedTags", (t) => t.name);
            const uniqTrendingLinks = this.uniqFlatMap(uriToots, "trendingLinks", (t) => t.url);
            const uniqTrendingTags = this.uniqFlatMap(uriToots, "trendingTags", (t) => t.name);
            const uniqSources = this.uniqFlatMap(uriToots, "sources", (source) => source);
            // Collate multiple retooters if they exist
            let reblogsBy = this.uniqFlatMap(uriToots, "reblogsBy", (account) => account.webfingerURI);
            reblogsBy = (0, collection_helpers_1.sortObjsByProps)(reblogsBy, ["displayName"], true, true);
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(toot => toot.accounts);
            // Helper method to collate the isFollowed property for the accounts
            const isFollowed = (uri) => allAccounts.some((a) => a.isFollowed && (a.webfingerURI == uri));
            const isSuspended = (uri) => allAccounts.some((a) => a.suspended && (a.webfingerURI == uri));
            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = PROPS_THAT_CHANGE.reduce((propValues, propName) => {
                propValues[propName] = Math.max(...uriToots.map(t => t.realToot[propName] || 0));
                return propValues;
            }, {});
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
                toot.muted = uriToots.some(toot => toot.muted || toot.realToot.muted); // Liberally set muted on retoots and real toots
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
            const mostRecent = (0, exports.mostRecentToot)(toots);
            // Skip logging this in production
            if (!environment_helpers_1.isProduction && (0, collection_helpers_1.uniquify)(toots.map(t => t.uri)).length > 1) {
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
    static async removeInvalidToots(toots, logger) {
        let blockedDomains = new Set();
        let mutedKeywordsRegex;
        if (api_1.default.instance.userData) {
            blockedDomains = new Set(api_1.default.instance.userData.blockedDomains);
            mutedKeywordsRegex = api_1.default.instance.userData.mutedKeywordsRegex;
        }
        else {
            blockedDomains = new Set(await api_1.default.instance.getBlockedDomains());
            mutedKeywordsRegex = await user_data_1.default.getMutedKeywordsRegex();
        }
        return (0, collection_helpers_1.filterWithLog)(toots, toot => toot.isValidForFeed(mutedKeywordsRegex, blockedDomains), logger, 'invalid', 'Toot');
    }
    /**
     * Get rid of the user's own toots.
     * @param {Toot[]} toots - Array of toots.
     * @param {Logger} logger - Logger for logging.
     * @returns {Toot[]} Array without user's own toots.
     */
    static removeUsersOwnToots(toots, logger) {
        const newToots = toots.filter(toot => !toot.isUsersOwnToot());
        logger.logArrayReduction(toots, newToots, 'Toot', "user's own toots");
        return newToots;
    }
    /**
     * Filter an array of toots down to just the retoots.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of retoots.
     */
    static onlyRetoots(toots) {
        return toots.filter(toot => toot.reblog);
    }
    /**
     * Filter an array of toots down to just the replies.
     * @param {Toot[]} toots - Array of toots.
     * @returns {Toot[]} Array of replies.
     */
    static onlyReplies(toots) {
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
    static uniqFlatMap(toots, property, uniqFxn) {
        const mappedReblogs = toots.flatMap(toot => toot.reblog?.[property] ?? []);
        const mapped = (toots.flatMap(toot => toot[property] ?? [])).concat(mappedReblogs);
        return (0, collection_helpers_1.uniquifyByProp)(mapped, uniqFxn);
    }
}
exports.default = Toot;
__decorate([
    (0, class_transformer_1.Type)(() => account_1.default),
    __metadata("design:type", account_1.default)
], Toot.prototype, "account", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Toot),
    __metadata("design:type", Object)
], Toot.prototype, "reblog", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => account_1.default),
    __metadata("design:type", Array)
], Toot.prototype, "reblogsBy", void 0);
;
/**
 * Get the Date the toot was created.
 * @private
 * @param {TootLike} toot - The toot object.
 * @returns {Date}
 */
const tootedAt = (toot) => new Date(toot.createdAt);
exports.tootedAt = tootedAt;
/**
 * Get the earliest toot from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
const earliestToot = (toots) => sortByCreatedAt(toots)[0];
exports.earliestToot = earliestToot;
/**
 * Get the most recent toot from a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {TootLike | null}
 */
const mostRecentToot = (toots) => sortByCreatedAt(toots).slice(-1)[0];
exports.mostRecentToot = mostRecentToot;
/**
 * Returns array with oldest toot first.
 * @private
 * @template T extends TootLike
 * @param {T} toots - List of toots.
 * @returns {T}
 */
function sortByCreatedAt(toots) {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1);
}
exports.sortByCreatedAt = sortByCreatedAt;
;
/**
 * Get the Date of the earliest toot in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
const earliestTootedAt = (toots) => {
    const earliest = (0, exports.earliestToot)(toots);
    return earliest ? (0, exports.tootedAt)(earliest) : null;
};
exports.earliestTootedAt = earliestTootedAt;
/**
 * Get the Date of the most recent toot in a list.
 * @private
 * @param {TootLike[]} toots - List of toots.
 * @returns {Date | null}
 */
const mostRecentTootedAt = (toots) => {
    const newest = (0, exports.mostRecentToot)(toots);
    return newest ? (0, exports.tootedAt)(newest) : null;
};
exports.mostRecentTootedAt = mostRecentTootedAt;
//# sourceMappingURL=toot.js.map