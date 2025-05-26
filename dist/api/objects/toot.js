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
/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
const escape = require('regexp.escape');
const change_case_1 = require("change-case");
const class_transformer_1 = require("class-transformer");
const account_1 = __importDefault(require("./account"));
const api_1 = __importDefault(require("../api"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const scorer_1 = __importDefault(require("../../scorer/scorer"));
const time_helpers_1 = require("../../helpers/time_helpers");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const config_1 = require("../../config");
const numeric_filter_1 = require("../../filters/numeric_filter");
const language_helper_1 = require("../../helpers/language_helper");
const log_helpers_1 = require("../../helpers/log_helpers");
const tag_1 = require("./tag");
const boolean_filter_1 = require("../../filters/boolean_filter");
const string_helpers_1 = require("../../helpers/string_helpers");
const types_1 = require("../../types");
// https://docs.joinmastodon.org/entities/Status/#visibility
var TootVisibility;
(function (TootVisibility) {
    TootVisibility["DIRECT_MSG"] = "direct";
    TootVisibility["PUBLIC"] = "public";
    TootVisibility["PRIVATE"] = "private";
    TootVisibility["UNLISTED"] = "unlisted";
})(TootVisibility || (TootVisibility = {}));
;
const MAX_CONTENT_PREVIEW_CHARS = 110;
const MAX_ID_IDX = 2;
const MIN_CHARS_FOR_LANG_DETECT = 8;
const UNKNOWN = "unknown";
const BLUESKY_BRIDGY = 'bsky.brid.gy';
const REPAIR_TOOT = (0, string_helpers_1.bracketed)("repairToot");
const HASHTAG_LINK_REGEX = /<a href="https:\/\/[\w.]+\/tags\/[\w]+" class="[-\w_ ]*hashtag[-\w_ ]*" rel="[a-z ]+"( target="_blank")?>#<span>[\w]+<\/span><\/a>/i;
const HASHTAG_PARAGRAPH_REGEX = new RegExp(`^<p>(${HASHTAG_LINK_REGEX.source} ?)+</p>`, "i");
// We always use containsTag() instead of containsString() for these
const TAG_ONLY_STRINGS = new Set([
    "in",
    "it",
    "ja",
    "press",
    "tv",
    "un",
    "us",
]);
;
;
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
    inReplyToId;
    inReplyToAccountId;
    muted;
    pinned;
    poll;
    reblog;
    reblogged;
    text;
    url;
    // extensions to mastodon.v1.Status. Most of these are set in completeProperties()
    numTimesShown;
    completedAt;
    followedTags; // Array of tags that the user follows that exist in this toot
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
    // Alternate constructor because class-transformer doesn't work with constructor arguments
    static build(toot) {
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
        tootObj.inReplyToId = toot.inReplyToId;
        tootObj.inReplyToAccountId = toot.inReplyToAccountId;
        tootObj.language = toot.language;
        tootObj.mediaAttachments = toot.mediaAttachments;
        tootObj.mentions = toot.mentions;
        tootObj.muted = toot.muted;
        tootObj.pinned = toot.pinned;
        tootObj.poll = toot.poll;
        tootObj.reblogsCount = toot.reblogsCount;
        tootObj.reblogged = toot.reblogged;
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
        tootObj.audioAttachments = tootObj.attachmentsOfType(types_1.MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(types_1.MediaCategory.IMAGE);
        tootObj.videoAttachments = string_helpers_1.VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));
        if (tootObj.account.suspended) {
            console.warn(`Toot from suspended account:`, tootObj);
        }
        else if (tootObj.account.limited) {
            (0, log_helpers_1.traceLog)(`Toot from limited account:`, tootObj);
        }
        return tootObj;
    }
    // Time since this toot was sent in hours
    ageInHours() {
        return (0, time_helpers_1.ageInHours)(this.tootedAt());
    }
    // Return 'video' if toot contains a video, 'image' if there's an image, undefined if no attachments
    // TODO: can one toot have video and imagess? If so, we should return both (or something)
    attachmentType() {
        if (this.imageAttachments.length > 0) {
            return types_1.MediaCategory.IMAGE;
        }
        else if (this.videoAttachments.length > 0) {
            return types_1.MediaCategory.VIDEO;
        }
        else if (this.audioAttachments.length > 0) {
            return types_1.MediaCategory.AUDIO;
        }
    }
    // True if toot contains 'str' in the tags, the content, or the link preview card description
    containsString(str) {
        return (0, string_helpers_1.wordRegex)(str).test(this.contentWithCard());
    }
    // Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search
    containsTag(tag, fullScan) {
        if (fullScan && (tag.name.length > 1) && !(TAG_ONLY_STRINGS.has(tag.name))) {
            if (!tag.regex) {
                console.warn(`containsTag() called on tag without regex:`, tag);
                tag.regex = (0, string_helpers_1.wordRegex)(tag.name);
            }
            return tag.regex.test(this.contentWithCard());
        }
        else {
            return this.tags.some((t) => t.name == tag.name);
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsMsg() {
        let msgs = [
            this.containsTagsOfTypeMsg(boolean_filter_1.TypeFilterName.FOLLOWED_HASHTAGS),
            this.containsTagsOfTypeMsg(boolean_filter_1.TypeFilterName.TRENDING_HASHTAGS),
            this.containsTagsOfTypeMsg(boolean_filter_1.TypeFilterName.PARTICIPATED_HASHTAGS),
        ];
        msgs = msgs.filter((msg) => msg);
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }
    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention() {
        return this.mentions.some((mention) => mention.acct == api_1.default.instance.user.webfingerURI);
    }
    // Return all but the last paragraph if that last paragraph is just hashtag links
    contentNonTagsParagraphs(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const paragraphs = this.contentParagraphs(fontSize);
        if (this.contentTagsParagraph())
            paragraphs.pop(); // Remove the last paragraph if it's just hashtags
        return paragraphs.join("\n");
    }
    // Break up the content into paragraphs and add <img> tags for custom emojis
    contentParagraphs(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.htmlToParagraphs)(this.contentWithEmojis(fontSize));
    }
    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars) {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = this.contentString();
        content = (0, string_helpers_1.replaceHttpsLinks)(content);
        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            let mediaType = this.attachmentType() ? `${this.attachmentType()}` : "empty";
            content = `<${(0, change_case_1.capitalCase)(mediaType)} post by ${this.realAccount().describe()}>`;
        }
        else if (content.length > MAX_CONTENT_PREVIEW_CHARS) {
            content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
        }
        return content;
    }
    // If the final <p> paragraph of the content is just hashtags, return it
    contentTagsParagraph() {
        const finalParagraph = this.contentParagraphs().slice(-1)[0];
        if (HASHTAG_PARAGRAPH_REGEX.test(finalParagraph)) {
            return finalParagraph;
        }
    }
    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return this.addEmojiHtmlTags(this.content, fontSize);
    }
    // String that describes the toot in not so many characters
    describe() {
        let msg = `${this.account.describe()} [${(0, time_helpers_1.toISOFormat)(this.createdAt)}, ID="${this.id}"]`;
        return `${msg}: "${this.contentShortened()}"`;
    }
    // Mastodon calls this a "context" but it's really a conversation
    async getConversation() {
        const logPrefix = (0, string_helpers_1.bracketed)('getConversation()');
        console.log(`${logPrefix} Fetching conversation for toot:`, this.describe());
        const startTime = new Date();
        const context = await api_1.default.instance.api.v1.statuses.$select(await this.resolveID()).context.fetch();
        const toots = await Toot.buildToots([...context.ancestors, this, ...context.descendants], logPrefix, true);
        (0, log_helpers_1.traceLog)(`${logPrefix} Fetched ${toots.length} toots ${(0, time_helpers_1.ageString)(startTime)}`, toots.map(t => t.describe()));
        return toots;
    }
    getIndividualScore(scoreType, name) {
        if (this.scoreInfo?.scores) {
            return this.scoreInfo.scores[name][scoreType];
        }
        else {
            console.warn(`getIndividualScore() called on toot but no scoreInfo.scores:`, this);
            return 0;
        }
    }
    getScore() {
        return this.scoreInfo?.score || 0;
    }
    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL() {
        const homeURL = `${this.account.homserverURL()}/${await this.resolveID()}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }
    // Return true if it's a direct message
    isDM() {
        return this.visibility === TootVisibility.DIRECT_MSG;
    }
    // Returns true if this toot is from a followed account or contains a followed tag
    isFollowed() {
        return !!(this.account.isFollowed || this.reblog?.account.isFollowed || this.realToot().followedTags?.length);
    }
    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters) {
        let isOK = Object.values(filters.booleanFilters).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }
    // Return true if it's for followers only
    isPrivate() {
        return this.visibility === TootVisibility.PRIVATE;
    }
    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending() {
        return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length);
    }
    // Return false if Toot should be discarded from feed altogether and permanently
    // Note that this is very different from being temporarily filtered out of the visible feed
    isValidForFeed(serverSideFilters) {
        if (this.isUsersOwnToot()) {
            (0, log_helpers_1.traceLog)(`Removing fedialgo user's own toot: ${this.describe()}`);
            return false;
        }
        else if (this.reblog?.muted || this.muted) {
            (0, log_helpers_1.traceLog)(`Removing toot from muted account (${this.realAccount().describe()}):`, this);
            return false;
        }
        else if (Date.now() < this.tootedAt().getTime()) {
            // Sometimes there are wonky statuses that are like years in the future so we filter them out.
            console.warn(`Removing toot with future timestamp:`, this);
            return false;
        }
        else if (this.filtered?.length || this.reblog?.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatches = (this.filtered || []).concat(this.reblog?.filtered || []);
            const filterMatchStr = filterMatches[0].keywordMatches?.join(' ');
            (0, log_helpers_1.traceLog)(`Removing toot matching server filter (${filterMatchStr}): ${this.describe()}`);
            return false;
        }
        else if (this.tootedAt() < (0, time_helpers_1.timelineCutoffAt)()) {
            (0, log_helpers_1.traceLog)(`Removing toot older than ${(0, time_helpers_1.timelineCutoffAt)()}:`, this.tootedAt());
            return false;
        }
        // Return false if toot matches any server side filters
        return !serverSideFilters.some((filter) => (filter.keywords.some((keyword) => {
            if (this.realToot().containsString(keyword.keyword)) {
                (0, log_helpers_1.traceLog)(`Removing toot matching manual server side filter (${this.describe()}):`, filter);
                return true;
            }
        })));
    }
    // Sum of the trendingRank, numReblogs, replies, and local server favourites
    popularity() {
        return (0, collection_helpers_1.sumArray)([this.favouritesCount, this.reblogsCount, this.repliesCount, this.trendingRank]);
    }
    // Return the account that posted this toot, not the account that reblogged it
    realAccount() {
        return this.realToot().account;
    }
    // Return the toot that was reblogged if it's a reblog, otherwise return this toot
    realToot() {
        return this.reblog ?? this;
    }
    // URI for the toot
    realURI() {
        return this.realToot().uri;
    }
    // Default to this.realURI() if url property is empty
    realURL() {
        return this.realToot().url || this.realURI();
    }
    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolve() {
        try {
            return await api_1.default.instance.resolveToot(this);
        }
        catch (error) {
            console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            return this;
        }
    }
    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolveID() {
        if (!this.resolvedID) {
            try {
                this.resolvedID = (await api_1.default.instance.resolveToot(this)).id;
            }
            catch (error) {
                console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
                return this.id;
            }
        }
        return this.resolvedID;
    }
    // TODO: this maybe needs to take into consideration reblogsBy??
    tootedAt() {
        return new Date(this.createdAt);
    }
    //////////////////////////////
    //     Private methods      //
    //////////////////////////////
    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags in a string
    addEmojiHtmlTags(str, fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(str, emojis, fontSize);
    }
    // return MediaAttachmentType objects with type == attachmentType
    attachmentsOfType(attachmentType) {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }
    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    completeProperties(userData, trendingLinks, trendingTags, isDeepInspect) {
        // TODO: We handle muted and followed before checking if complete so we can refresh mutes & follows
        this.muted ||= (this.realAccount().webfingerURI in userData.mutedAccounts);
        this.account.isFollowed ||= (this.account.webfingerURI in userData.followedAccounts);
        if (this.reblog) {
            this.reblog.account.isFollowed ||= (this.reblog.account.webfingerURI in userData.followedAccounts);
        }
        if (this.isComplete())
            return;
        // Retoots never have their own tags, etc.
        const toot = this.realToot();
        const allFollowedTags = Object.values(userData.followedTags);
        // containsString() matched way too many toots so we use containsTag() for participated tags
        toot.participatedTags = Object.values(userData.participatedHashtags).filter(t => toot.containsTag(t));
        // With all the containsString() calls it takes ~1.1 seconds to build 40 toots
        // Without them it's ~0.1 seconds. In particular the trendingLinks are slow! maybe 90% of that time.
        toot.followedTags = allFollowedTags.filter(tag => toot.containsTag(tag, isDeepInspect));
        toot.trendingTags = trendingTags.filter(tag => toot.containsTag(tag, isDeepInspect));
        // Only set the completedAt field if isDeepInspect is true
        if (isDeepInspect) {
            toot.trendingLinks = trendingLinks.filter(link => link.regex.test(this.contentWithCard()));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Multiple assignmnet!
        }
        else {
            toot.trendingLinks ||= []; // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsOfTypeMsg(tagType) {
        let tags = [];
        if (tagType == boolean_filter_1.TypeFilterName.FOLLOWED_HASHTAGS) {
            tags = this.followedTags || [];
        }
        else if (tagType == boolean_filter_1.TypeFilterName.PARTICIPATED_HASHTAGS) {
            tags = this.participatedTags || [];
        }
        else if (tagType == boolean_filter_1.TypeFilterName.TRENDING_HASHTAGS) {
            tags = this.trendingTags || [];
        }
        else {
            console.warn(`Toot.containsTagsMsg() called with invalid tagType: ${tagType}`);
            return;
        }
        if (!tags.length)
            return;
        const tagTypeStr = (0, change_case_1.capitalCase)(tagType).replace(/ Tag/, " Hashtag");
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }
    // Return the toot's 'content' field stripped of HTML tags and emojis
    contentString() {
        return (0, string_helpers_1.htmlToText)(this.realToot().contentWithEmojis());
    }
    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    contentStripped() {
        return (0, string_helpers_1.collapseWhitespace)((0, string_helpers_1.removeMentions)((0, string_helpers_1.removeEmojis)((0, string_helpers_1.removeTags)((0, string_helpers_1.removeLinks)(this.contentWithCard())))));
    }
    // Return the content with the card title and description added in parentheses
    contentWithCard() {
        const cardContent = [this.card?.title || "", this.card?.description || ""].join(" ").trim();
        return (this.contentString() + (cardContent.length ? ` (${(0, string_helpers_1.htmlToText)(cardContent)})` : "")).trim();
    }
    // Figure out an appropriate language for the toot based on the content.
    determineLanguage() {
        const text = this.contentStripped();
        if (text.length < MIN_CHARS_FOR_LANG_DETECT) {
            this.language ??= config_1.config.locale.defaultLanguage;
            return;
        }
        const langDetectInfo = (0, language_helper_1.detectLanguage)(text);
        const { chosenLanguage, langDetector, tinyLD } = langDetectInfo;
        const langLogObj = { ...langDetectInfo, text, toot: this, tootLanguage: this.language };
        const logTrace = (msg) => (0, log_helpers_1.traceLog)(`${REPAIR_TOOT} ${msg} for "${text}"`, langLogObj);
        // If there's nothing detected log a warning (if text is long enough) and set language to default
        if ((tinyLD.languageAccuracies.length + langDetector.languageAccuracies.length) == 0) {
            if (text.length > (MIN_CHARS_FOR_LANG_DETECT * 2)) {
                console.warn(`${REPAIR_TOOT} no language detected`, langLogObj);
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
        if (!tinyLD.isAccurate && langDetector.isAccurate && langDetector.chosenLang == language_helper_1.LANGUAGE_CODES.english) {
            logTrace(`Accepting "en" from langDetector.detectedLang`);
            this.language = language_helper_1.LANGUAGE_CODES.english;
            return;
        }
        if (this.language) {
            if (text.length > (2 * MIN_CHARS_FOR_LANG_DETECT)) {
                logTrace(`No guess good enough to override language "${this.language}" for "${text}"`);
            }
        }
        else {
            logTrace(`Defaulting language prop to "en"`);
            this.language ??= config_1.config.locale.defaultLanguage;
        }
    }
    // Returns true if the toot should be re-completed
    isComplete() {
        if (!this.completedAt)
            return false; // If we haven't completed it yet, do it now
        // If we have completed it, check if we need to re-evaluate for newer trending tags, links, etc.
        return (
        // Check if toot was completed long enough ago that we might want to re-evaluate it
        (0, time_helpers_1.ageInMinutes)(this.completedAt) < config_1.config.minTrendingMinutesUntilStale()
            // But not tooted so long ago that there's little chance of new data
            || (0, time_helpers_1.ageInMinutes)(this.createdAt) > config_1.config.toots.completeAfterMinutes);
    }
    // Returns true if this toot is by the fedialgo user
    isUsersOwnToot() {
        const fedialgoUserWebfingerURI = api_1.default.instance.user.webfingerURI;
        if (this.account.webfingerURI == fedialgoUserWebfingerURI)
            return true;
        if (this.reblog && this.reblog.account.webfingerURI == fedialgoUserWebfingerURI)
            return true;
        return false;
    }
    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Call determineLanguage() to set the language
    //   - Lowercase all tags
    //   - Repair mediaAttachment types if reparable based on URL file extension
    //   - Repair StatusMention objects for users on home server
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
                if ((0, string_helpers_1.isImage)(media.remoteUrl)) {
                    console.debug(`${REPAIR_TOOT} Repairing broken image attachment in toot:`, this);
                    media.type = types_1.MediaCategory.IMAGE;
                }
                else if ((0, string_helpers_1.isVideo)(media.remoteUrl)) {
                    console.debug(`${REPAIR_TOOT} Repairing broken video attachment in toot:`, this);
                    media.type = types_1.MediaCategory.VIDEO;
                }
                else if (this.uri?.includes(BLUESKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    console.debug(`${REPAIR_TOOT} Repairing broken bluesky bridge image attachment in toot:`, this);
                    media.type = types_1.MediaCategory.IMAGE;
                }
                else {
                    console.warn(`${REPAIR_TOOT} Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            }
            else if (!string_helpers_1.MEDIA_TYPES.includes(media.type)) {
                console.warn(`${REPAIR_TOOT} Unknown media of type: '${media.type}' for toot:`, this);
            }
        });
        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += `@${(0, string_helpers_1.extractDomain)(mention.url)}`;
            }
        });
    }
    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////
    // Build array of new Toot objects from an array of Status objects (or Toots).
    // Toots returned by this method should have most of their properties set correctly.
    static async buildToots(statuses, source, skipSort) {
        if (statuses.length == 0)
            return []; // Avoid the data fetching if we don't to build anything
        const logPrefix = `${(0, string_helpers_1.bracketed)(source)} buildToots()`;
        const startedAt = new Date();
        // NOTE: this calls completeToots() with isDeepInspect = false. You must later call it with true
        // to get the full set of properties set on the Toots.
        let toots = await this.completeToots(statuses, logPrefix, false);
        toots = await this.removeInvalidToots(toots, logPrefix);
        toots.forEach((toot) => toot.sources = [source]);
        toots = Toot.dedupeToots(toots, logPrefix);
        // Make a first pass at scoring with whatever scorers are ready to score
        await scorer_1.default.scoreToots(toots, false);
        // TODO: Toots are sorted by early score so callers can truncate unpopular toots but seems wrong place for it
        if (!skipSort)
            toots.sort((a, b) => b.getScore() - a.getScore());
        (0, log_helpers_1.traceLog)(`${logPrefix} ${toots.length} toots built in ${(0, time_helpers_1.ageString)(startedAt)}`);
        return toots;
    }
    // Fetch all the data we need to set dependent properties and set them on the toots.
    static async completeToots(toots, logPrefix, isDeepInspect) {
        let startedAt = new Date();
        const userData = await api_1.default.instance.getUserData();
        const trendingTags = await mastodon_server_1.default.fediverseTrendingTags();
        const trendingLinks = isDeepInspect ? (await mastodon_server_1.default.fediverseTrendingLinks()) : []; // Skip trending links
        startedAt = new Date();
        let tootsToComplete = toots;
        let completeToots = [];
        // If isDeepInspect separate toots that need completing bc it's slow to rely on shouldComplete() + batching
        if (isDeepInspect) {
            [completeToots, tootsToComplete] = ((0, collection_helpers_1.split)(toots, (t) => t instanceof Toot && t.isComplete()));
        }
        const newCompleteToots = await (0, collection_helpers_1.batchMap)(tootsToComplete, async (tootLike) => {
            const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
            toot.completeProperties(userData, trendingLinks, trendingTags, isDeepInspect);
            return toot;
        }, "completeToots", config_1.config.toots.batchCompleteSize, isDeepInspect ? config_1.config.toots.batchCompleteSleepBetweenMS : 0);
        let msg = `${logPrefix} completeToots(isDeepInspect=${isDeepInspect}) ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)}`;
        console.debug(`${msg} (${newCompleteToots.length} completed, ${completeToots.length} skipped)`);
        return newCompleteToots.concat(completeToots);
    }
    // Remove dupes by uniquifying on the toot's URI. This is quite fast, no need for telemtry
    static dedupeToots(toots, logPrefix) {
        logPrefix = `${(0, string_helpers_1.bracketed)(logPrefix || "dedupeToots")} dedupeToots()`;
        const tootsByURI = (0, collection_helpers_1.groupBy)(toots, toot => toot.realURI());
        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            if (uriToots.length == 1)
                return; // If there's only one toot, nothing to do
            const firstCompleted = uriToots.find(toot => !!toot.realToot().completedAt);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably wrong
            const firstTrendingLinks = uriToots.find(toot => !!toot.realToot().trendingLinks);
            const firstTrendingRankToot = uriToots.find(toot => !!toot.realToot().trendingRank); // TODO: should probably use most recent toot
            // Deal with tag and filter arrays
            const uniqFiltered = this.uniqFlatMap(uriToots, "filtered", (f) => f.filter.id);
            const uniqFollowedTags = this.uniqFlatMap(uriToots, "followedTags", (t) => t.name);
            const uniqTrendingTags = this.uniqFlatMap(uriToots, "trendingTags", (t) => t.name);
            const uniqSources = this.uniqFlatMap(uriToots, "sources", (source) => source);
            // Collate multiple retooters if they exist
            let reblogsBy = this.uniqFlatMap(uriToots, "reblogsBy", (account) => account.webfingerURI);
            reblogsBy = (0, collection_helpers_1.sortObjsByProps)(reblogsBy, ["displayName"], true, true);
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(t => [t.account].concat(t.reblog ? [t.reblog.account] : []));
            // Helper method to collate the isFollowed property for the accounts
            const isFollowed = (uri) => allAccounts.some((a) => a.isFollowed && (a.webfingerURI == uri));
            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = numeric_filter_1.FILTERABLE_SCORES.reduce((propValues, propName) => {
                propValues[propName] = Math.max(...uriToots.map(t => t.realToot()[propName] || 0));
                return propValues;
            }, {});
            uriToots.forEach((toot) => {
                // propsThatChange are only set on the realToot
                toot.realToot().favouritesCount = propsThatChange.favouritesCount;
                toot.realToot().reblogsCount = propsThatChange.reblogsCount;
                toot.realToot().repliesCount = propsThatChange.repliesCount;
                // Props set on first found
                toot.realToot().completedAt ??= firstCompleted?.completedAt; // DON'T automatically copy to base toot - some fields may need setting later
                toot.realToot().trendingLinks ??= firstTrendingLinks?.trendingLinks;
                toot.realToot().trendingRank ??= firstTrendingRankToot?.trendingRank;
                toot.scoreInfo ??= firstScoredToot?.scoreInfo; // TODO: this is probably wrong... retoot scores could differ but should be corrected
                // Tags + sources + server side filter matches
                toot.realToot().followedTags = uniqFollowedTags;
                toot.realToot().trendingTags = uniqTrendingTags;
                toot.filtered = uniqFiltered;
                toot.sources = uniqSources;
                // Booleans usually only set on the realToot
                toot.realToot().bookmarked = uriToots.some(toot => toot.realToot().bookmarked);
                toot.realToot().favourited = uriToots.some(toot => toot.realToot().favourited);
                toot.realToot().reblogged = uriToots.some(toot => toot.realToot().reblogged);
                toot.account.isFollowed ||= isFollowed(toot.account.webfingerURI);
                toot.muted = uriToots.some(toot => toot.muted); // Liberally set muted on retoots and real toots
                toot.realToot().numTimesShown = Math.max(...uriToots.map(t => t.realToot().numTimesShown || 0));
                // Reblog props
                if (toot.reblog) {
                    toot.reblog.account.isFollowed ||= isFollowed(toot.reblog.account.webfingerURI);
                    toot.reblog.completedAt ??= firstCompleted?.completedAt;
                    toot.reblog.filtered = uniqFiltered;
                    toot.reblog.reblogsBy = reblogsBy;
                    toot.reblog.sources = uniqSources;
                }
            });
        });
        // Choose the most recent retoot from the group of toots with the same realURI() value
        const deduped = Object.values(tootsByURI).map((toots) => {
            const mostRecent = (0, exports.mostRecentToot)(toots);
            // Log when we are collating retoots and toots with the same realURI()
            if ((0, collection_helpers_1.uniquify)(toots.map(t => t.uri)).length > 1) {
                (0, log_helpers_1.traceLog)(`${logPrefix} deduped ${toots.length} toots to ${mostRecent.describe()}:`, toots);
            }
            return mostRecent;
        });
        (0, log_helpers_1.logTootRemoval)(logPrefix, "duplicate", toots.length - deduped.length, deduped.length);
        return deduped;
    }
    // Extract a minimum ID from a set of toots that will be appropriate to use as the maxId param
    // for a call to the mastodon API to get the next page of toots.
    // Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
    // or future so we use the MAX_ID_IDX toot when sorted by createdAt to get the min ID.
    static findMinIdForMaxIdParam(toots) {
        if (toots.length == 0)
            return null;
        const idx = Math.min(toots.length - 1, MAX_ID_IDX);
        return sortByCreatedAt(toots)[idx].id;
    }
    static async removeInvalidToots(toots, logPrefix) {
        const serverSideFilters = (await api_1.default.instance.getServerSideFilters()) || [];
        return (0, collection_helpers_1.filterWithLog)(toots, t => t.isValidForFeed(serverSideFilters), logPrefix, 'invalid', 'Toot');
    }
    // Return a new array of a toot property collected and uniquified from an array of toots
    // e.g. with two toots having {sources: ["a", "b"]} and {sources: ["b", "c"]} we get ["a", "b", "c"]
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
// Methods for dealing with toot timestamps
const tootedAt = (toot) => new Date(toot.createdAt);
exports.tootedAt = tootedAt;
const earliestToot = (toots) => sortByCreatedAt(toots)[0];
exports.earliestToot = earliestToot;
const mostRecentToot = (toots) => sortByCreatedAt(toots).slice(-1)[0];
exports.mostRecentToot = mostRecentToot;
// Returns array with oldest toot first
function sortByCreatedAt(toots) {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1);
}
exports.sortByCreatedAt = sortByCreatedAt;
;
const earliestTootedAt = (toots) => {
    const earliest = (0, exports.earliestToot)(toots);
    return earliest ? (0, exports.tootedAt)(earliest) : null;
};
exports.earliestTootedAt = earliestTootedAt;
const mostRecentTootedAt = (toots) => {
    const newest = (0, exports.mostRecentToot)(toots);
    return newest ? (0, exports.tootedAt)(newest) : null;
};
exports.mostRecentTootedAt = mostRecentTootedAt;
//# sourceMappingURL=toot.js.map