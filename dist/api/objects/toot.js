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
const language_helper_1 = require("../../helpers/language_helper");
const log_helpers_1 = require("../../helpers/log_helpers");
const tag_1 = require("./tag");
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
const PROPS_THAT_CHANGE = [
    "favouritesCount",
    "repliesCount",
    "reblogsCount"
];
// We always use containsTag() instead of containsString() for these
const TAG_ONLY_STRINGS = [
    "in",
    "it",
    "ja",
    "press",
    "tv",
    "un",
    "us",
];
const TAG_ONLY_STRING_LOOKUP = TAG_ONLY_STRINGS.reduce((acc, str) => {
    acc[str] = true;
    return acc;
}, {});
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
    completedAt;
    followedTags; // Array of tags that the user follows that exist in this toot
    participatedTags; // Array of tags that the user has participated in that exist in this toot
    reblogsBy; // The accounts that retooted this toot
    resolvedToot; // This Toot with URLs resolved to homeserver versions
    scoreInfo; // Scoring info for weighting/sorting this toot
    sources; // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingRank; // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks; // Links that are trending in this toot
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
        tootObj.completedAt = toot.completedAt;
        tootObj.followedTags = toot.followedTags;
        tootObj.reblog = toot.reblog ? Toot.build(toot.reblog) : undefined;
        // TODO: the reblogsBy don't have the isFollowed flag set correctly
        tootObj.reblogsBy = (toot.reblogsBy ?? []).map(account => account_1.default.build(account));
        tootObj.resolvedToot = toot.resolvedToot;
        tootObj.scoreInfo = toot.scoreInfo;
        tootObj.sources = toot.sources;
        tootObj.trendingRank = toot.trendingRank;
        tootObj.trendingLinks = toot.trendingLinks;
        tootObj.trendingTags = toot.trendingTags;
        tootObj.repair();
        // These must be set after repair() has a chance to fix any broken media types
        tootObj.audioAttachments = tootObj.attachmentsOfType(types_1.MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(types_1.MediaCategory.IMAGE);
        tootObj.videoAttachments = string_helpers_1.VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));
        return tootObj;
    }
    // Time since this toot was sent in hours
    ageInHours() {
        return (0, time_helpers_1.ageInHours)(this.tootedAt());
    }
    // Experimental alternative format for the scoreInfo property used in demo app
    alternateScoreInfo() {
        return scorer_1.default.alternateScoreInfo(this);
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
        str = str.trim().toLowerCase();
        const contentStr = `${this.contentString()} ${this.card?.description || ""} ${this.card?.title || ""}`;
        const regex = new RegExp(`\\b${escape(str)}\\b`);
        return this.containsTag(str) || regex.test(contentStr.trim().toLowerCase());
    }
    // Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search
    containsTag(tag, fullScan) {
        let tagName = (typeof tag == "string" ? tag : tag.name).trim().toLowerCase();
        if (tagName.startsWith("#"))
            tagName = tagName.slice(1);
        if (fullScan && (tagName.length > 1) && !(tagName in TAG_ONLY_STRING_LOOKUP)) {
            return this.containsString(tagName);
        }
        else {
            return this.tags.some((tag) => tag.name == tagName);
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsMsg() {
        let msgs = [
            this.containsTagsOfTypeMsg(types_1.WeightName.FOLLOWED_TAGS),
            this.containsTagsOfTypeMsg(types_1.WeightName.TRENDING_TAGS),
            this.containsTagsOfTypeMsg(types_1.WeightName.PARTICIPATED_TAGS),
        ];
        msgs = msgs.filter((msg) => msg);
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }
    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention() {
        return this.mentions.some((mention) => mention.acct == api_1.default.instance.user.webfingerURI);
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
    // Return the toot's 'content' field stripped of HTML tags
    contentString() {
        return (0, string_helpers_1.htmlToText)(this.realToot().content || "");
    }
    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    contentStripped() {
        const contentWithCard = `${this.contentString()} (${this.card?.description ? (0, string_helpers_1.htmlToText)(this.card.description) : ""})`;
        let txt = (0, string_helpers_1.removeMentions)((0, string_helpers_1.removeEmojis)((0, string_helpers_1.removeTags)((0, string_helpers_1.removeLinks)(contentWithCard))));
        return (0, string_helpers_1.collapseWhitespace)(txt);
    }
    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(this.content, emojis, fontSize);
    }
    // String that describes the toot in not so many characters
    describe() {
        let msg = `${this.account.describe()} [${(0, time_helpers_1.toISOFormat)(this.createdAt)}, ID="${this.id}"]`;
        return `${msg}: "${this.contentShortened()}"`;
    }
    getScore() {
        return this.scoreInfo?.score || 0;
    }
    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL() {
        const resolved = await this.resolve();
        if (!resolved)
            return this.realURL();
        const homeURL = `${this.account.homserverURL()}/${resolved.id}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }
    // Return true if it's a direct message
    isDM() {
        return this.visibility === TootVisibility.DIRECT_MSG;
    }
    // Return true if it's for followers only
    isPrivate() {
        return this.visibility === TootVisibility.PRIVATE;
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
    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending() {
        return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length);
    }
    // Return false if Toot should be discarded from feed altogether and permanently
    // Note that this is very different from being temporarily filtered out of the visible feed
    isValidForFeed() {
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
        else if (this.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatchStr = this.filtered[0].keywordMatches?.join(' ');
            (0, log_helpers_1.traceLog)(`Removing toot matching server filter (${filterMatchStr}): ${this.describe()}`);
            return false;
        }
        else if (this.tootedAt() < (0, time_helpers_1.timelineCutoffAt)()) {
            (0, log_helpers_1.traceLog)(`Removing toot older than ${(0, time_helpers_1.timelineCutoffAt)()}:`, this.tootedAt());
            return false;
        }
        return true;
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
        if (this.resolvedToot)
            return this.resolvedToot;
        try {
            this.resolvedToot = await api_1.default.instance.resolveToot(this);
        }
        catch (error) {
            console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            this.resolvedToot = this;
        }
        return this.resolvedToot;
    }
    // TODO: this maybe needs to take into consideration reblogsBy??
    tootedAt() {
        return new Date(this.createdAt);
    }
    //////////////////////////////
    //     Private methods      //
    //////////////////////////////
    // return MediaAttachmentType objects with type == attachmentType
    attachmentsOfType(attachmentType) {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }
    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    completeProperties(userData, trendingLinks, trendingTags, isDeepInspect) {
        if (!this.shouldComplete())
            return;
        this.muted ||= (this.realAccount().webfingerURI in userData.mutedAccounts);
        this.account.isFollowed ||= (this.account.webfingerURI in userData.followedAccounts);
        if (this.reblog) {
            this.reblog.account.isFollowed ||= (this.reblog.account.webfingerURI in userData.followedAccounts);
        }
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
            toot.trendingLinks = trendingLinks.filter(link => toot.containsString(link.url));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Multiple assignmnet!
        }
        else {
            toot.trendingLinks ||= []; // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsOfTypeMsg(tagType) {
        let tags = [];
        // TODO: The tagType argument should probably be a TypeFilterName type...
        if (tagType == types_1.WeightName.FOLLOWED_TAGS) {
            tags = this.followedTags || [];
        }
        else if (tagType == types_1.WeightName.PARTICIPATED_TAGS) {
            tags = this.participatedTags || [];
        }
        else if (tagType == types_1.WeightName.TRENDING_TAGS) {
            tags = this.trendingTags || [];
        }
        else {
            console.warn(`Toot.containsTagsMsg() called with invalid tagType: ${tagType}`);
        }
        if (!tags.length)
            return;
        const tagTypeStr = (0, change_case_1.capitalCase)(tagType).replace(/ Tag/, " Hashtag");
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }
    // Returns true if this toot is by the fedialgo user
    isUsersOwnToot() {
        const algoUserWebfingerURI = api_1.default.instance.user.webfingerURI;
        if (this.account.webfingerURI == algoUserWebfingerURI)
            return true;
        if (this.reblog && this.reblog.account.webfingerURI == algoUserWebfingerURI)
            return true;
        return false;
    }
    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Set toot.language to defaultLanguage if missing
    //   - Lowercase all tags
    //   - Repair mediaAttachment types if reparable based on URL file extension
    //   - Repair StatusMention objects for users on home server
    repair() {
        this.application ??= { name: UNKNOWN };
        this.application.name ??= UNKNOWN;
        this.tags.forEach(tag_1.repairTag); // Repair Tags
        this.determineLanguage(); // Repair language
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
                    console.info(`${REPAIR_TOOT} Repairing broken image attachment in toot:`, this);
                    media.type = types_1.MediaCategory.IMAGE;
                }
                else if ((0, string_helpers_1.isVideo)(media.remoteUrl)) {
                    console.info(`${REPAIR_TOOT} Repairing broken video attachment in toot:`, this);
                    media.type = types_1.MediaCategory.VIDEO;
                }
                else if (this.uri?.includes(BLUESKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    console.info(`${REPAIR_TOOT} Repairing broken bluesky bridge image attachment in toot:`, this);
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
    // Figure out an appropriate language for the toot based on the content.
    determineLanguage() {
        let text = this.contentStripped();
        if (text.length < MIN_CHARS_FOR_LANG_DETECT) {
            this.language ??= config_1.Config.defaultLanguage;
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
            this.language ??= config_1.Config.defaultLanguage;
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
        if (tinyLD.chosenLang && language_helper_1.FOREIGN_SCRIPTS.includes(tinyLD.chosenLang) && this.language?.startsWith(tinyLD.chosenLang)) {
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
            this.language ??= config_1.Config.defaultLanguage;
        }
    }
    // Returns true if the toot should be re-completed
    shouldComplete() {
        return !this.completedAt || ((0, time_helpers_1.ageInMinutes)(this.completedAt) > config_1.Config.staleDataTrendingMinutes);
    }
    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////
    // Build array of new Toot objects from an array of Status objects.
    // Toots returned by this method should have all their properties set correctly.
    static async buildToots(statuses, source, // Where did these toots come from?
    logPrefix) {
        if (statuses.length == 0)
            return []; // Avoid the data fetching if we don't to build anything
        logPrefix ||= source;
        logPrefix = `${(0, string_helpers_1.bracketed)(logPrefix)} buildToots()`;
        const startedAt = new Date();
        // NOTE: this calls completeToots() with isDeepInspect = false. You must later call it with true
        // to get the full set of properties set on the Toots.
        let toots = await this.completeToots(statuses, logPrefix, false);
        toots.forEach((toot) => toot.sources = [source]);
        toots = Toot.dedupeToots(toots, logPrefix);
        // Make a first pass at scoring with whatever scorers are ready to score
        await scorer_1.default.scoreToots(toots, false);
        // TODO: Toots are sorted by early score so callers can truncate unpopular toots but seems wrong place for it
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
        const fetchAgeStr = (0, time_helpers_1.ageString)(startedAt);
        startedAt = new Date();
        // TODO: remove this at some point, just here for logging info about instanceof usage
        const tootObjs = toots.filter(toot => toot instanceof Toot);
        const numCompletedToots = tootObjs.filter(t => t.completedAt).length;
        const numRecompletingToots = tootObjs.filter(t => t.shouldComplete()).length;
        const complete = async (tootLike) => {
            const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
            toot.completeProperties(userData, trendingLinks, trendingTags, isDeepInspect);
            return toot;
        };
        const completeToots = toots.filter(toot => toot instanceof Toot ? !toot.shouldComplete() : false);
        const tootsToComplete = toots.filter(toot => toot instanceof Toot ? toot.shouldComplete() : true);
        const newCompleteToots = await (0, collection_helpers_1.batchMap)(tootsToComplete, (t) => complete(t), "completeToots", config_1.Config.batchCompleteTootsSize, isDeepInspect ? config_1.Config.batchCompleteTootsSleepBetweenMS : 0);
        toots = completeToots.concat(newCompleteToots);
        let msg = `${logPrefix} completeToots(isDeepInspect=${isDeepInspect}) on ${toots.length} toots`;
        msg += ` ${(0, time_helpers_1.ageString)(startedAt)} (data fetched ${fetchAgeStr}, ${tootObjs.length} were already toots,`;
        console.info(`${msg} ${numCompletedToots} were already completed, ${numRecompletingToots} need recompleting)`);
        return toots;
    }
    // Remove dupes by uniquifying on the toot's URI. This is quite fast, no need for telemtry
    static dedupeToots(toots, logPrefix) {
        logPrefix = `${(0, string_helpers_1.bracketed)(logPrefix || "dedupeToots")} dedupeToots()`;
        const tootsByURI = (0, collection_helpers_1.groupBy)(toots, toot => toot.realURI());
        // If there's the same # of URIs as toots there's nothing to dedupe
        // THIS COULD BE UNSAFE BECAUSE OF RETOOTS
        // if (Object.keys(tootsByURI).length == toots.length) return toots;
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
            const allTrendingTags = uriToots.flatMap(toot => toot.realToot().trendingTags || []);
            const uniqueTrendingTags = (0, collection_helpers_1.uniquifyByProp)(allTrendingTags, (tag) => tag.name);
            const allFollowedTags = uriToots.flatMap(toot => toot.realToot().followedTags || []);
            const uniqueFollowedTags = (0, collection_helpers_1.uniquifyByProp)(allFollowedTags, (tag) => tag.name);
            const allFilterMatches = uriToots.flatMap(toot => toot.realToot().filtered || []);
            const uniqueFilterMatches = (0, collection_helpers_1.uniquifyByProp)(allFilterMatches, (filter) => filter.filter.id);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);
            reblogsBy = (0, collection_helpers_1.uniquifyByProp)(reblogsBy, (account) => account.webfingerURI);
            reblogsBy = (0, collection_helpers_1.sortObjsByProps)(reblogsBy, ["displayName"], true, true);
            const sources = uriToots.flatMap(t => (t.sources || []).concat(t.reblog?.sources || []));
            const uniqueSources = (0, collection_helpers_1.uniquify)(sources);
            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = PROPS_THAT_CHANGE.reduce((props, propName) => {
                props[propName] = Math.max(...uriToots.map(t => t.realToot()[propName] || 0));
                return props;
            }, {});
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(t => [t.account].concat(t.reblog ? [t.reblog.account] : []));
            // Helper method to collate the isFollowed property
            const isFollowed = (webfingerURI) => {
                return allAccounts.some((a) => a.isFollowed && (a.webfingerURI == webfingerURI));
            };
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
                toot.realToot().trendingTags = uniqueTrendingTags;
                toot.realToot().followedTags = uniqueFollowedTags;
                toot.filtered = uniqueFilterMatches;
                toot.sources = uniqueSources;
                // Booleans usually only set on the realToot
                toot.realToot().bookmarked = uriToots.some(toot => toot.realToot().bookmarked);
                toot.realToot().favourited = uriToots.some(toot => toot.realToot().favourited);
                toot.realToot().reblogged = uriToots.some(toot => toot.realToot().reblogged);
                toot.muted = uriToots.some(toot => toot.muted); // Liberally set muted on retoots and real toots
                toot.account.isFollowed ||= isFollowed(toot.account.webfingerURI);
                // Reblog props
                if (toot.reblog) {
                    toot.reblog.account.isFollowed ||= isFollowed(toot.reblog.account.webfingerURI);
                    toot.reblog.completedAt ??= firstCompleted?.completedAt;
                    toot.reblog.reblogsBy = reblogsBy;
                    toot.reblog.sources = uniqueSources;
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
    ;
    // Extract a minimum ID from a set of toots that will be appropriate to use as the maxId param
    // for a call to the mastodon API to get the next page of toots.
    // Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
    // or future so we use the MAX_ID_IDX toot when sorted by createdAt to get the min ID.
    static findMinIdForMaxIdParam(toots) {
        if (toots.length == 0)
            return null;
        const idx = Math.min(toots.length - 1, MAX_ID_IDX);
        return (0, exports.sortByCreatedAt)(toots)[idx].id;
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
__decorate([
    (0, class_transformer_1.Type)(() => Toot),
    __metadata("design:type", Toot)
], Toot.prototype, "resolvedToot", void 0);
;
// Methods for dealing with toot timestamps
const tootedAt = (toot) => new Date(toot.createdAt);
exports.tootedAt = tootedAt;
const earliestToot = (toots) => (0, exports.sortByCreatedAt)(toots)[0];
exports.earliestToot = earliestToot;
const mostRecentToot = (toots) => (0, exports.sortByCreatedAt)(toots).slice(-1)[0];
exports.mostRecentToot = mostRecentToot;
// Returns array with oldest toot first
const sortByCreatedAt = (toots) => {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1);
};
exports.sortByCreatedAt = sortByCreatedAt;
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