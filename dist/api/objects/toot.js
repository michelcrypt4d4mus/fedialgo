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
exports.mostRecentTootedAtStr = exports.earliestTootedAtStr = exports.mostRecentTootedAt = exports.earliestTootedAt = exports.sortByCreatedAt = exports.mostRecentToot = exports.earliestToot = exports.tootedAt = void 0;
/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
const change_case_1 = require("change-case");
const class_transformer_1 = require("class-transformer");
const escape = require('regexp.escape');
const account_1 = __importDefault(require("./account"));
const api_1 = __importDefault(require("../api"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const scorer_1 = __importDefault(require("../../scorer/scorer"));
const time_helpers_1 = require("../../helpers/time_helpers");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const config_1 = require("../../config");
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
const MAX_ID_IDX = 2;
const MAX_CONTENT_PREVIEW_CHARS = 110;
const UNKNOWN = "unknown";
const PROPS_THAT_CHANGE = [
    "favouritesCount",
    "repliesCount",
    "reblogsCount"
];
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
        return (0, time_helpers_1.ageInSeconds)(this.tootedAt()) / 3600;
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
    // True if toot contains 'str' in the content, the link preview card, or (if it starts with '#') the tags
    containsString(str) {
        str = str.trim().toLowerCase();
        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name);
        }
        const regex = new RegExp(`\\b${escape(str)}\\b`);
        const contentStr = `${this.content} ${this.card?.description || ""} ${this.card?.title || ""}`;
        return regex.test(contentStr.trim().toLowerCase());
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
    containsTag(tag) {
        const tagName = typeof tag == "string" ? tag : tag.name;
        return this.tags.some((tag) => tag.name == tagName);
    }
    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention() {
        return this.mentions.some((mention) => mention.acct == api_1.default.instance.user.webfingerURI);
    }
    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars) {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = (0, string_helpers_1.htmlToText)(this.reblog?.content || this.content || "");
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
    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(this.content, emojis, fontSize);
    }
    // String that describes the toot in not so many characters
    describe() {
        let msg = `${this.account.describe()} [${(0, time_helpers_1.toISOFormat)(this.createdAt)}, ID=${this.id}]`;
        return `${msg}: "${this.contentShortened()}"`;
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
    // Returns true if this toot is from a followed account or contains a followed tag
    isFollowed() {
        return !!(this.account.isFollowed || this.reblog?.account.isFollowed || this.realToot().followedTags?.length);
    }
    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters) {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }
    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending() {
        return !!(this.scoreInfo?.rawScores[types_1.WeightName.TRENDING_TOOTS]
            || this.trendingLinks?.length
            || this.trendingTags?.length);
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
        this.language ??= config_1.Config.defaultLanguage;
        this.tags.forEach(tag_1.repairTag); // Repair Tags
        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);
            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                this.reblog.reblogsBy.push(this.account);
            }
        }
        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                if ((0, string_helpers_1.isImage)(media.remoteUrl)) {
                    console.info(`Repairing broken image attachment in toot:`, this);
                    media.type = types_1.MediaCategory.IMAGE;
                }
                else if ((0, string_helpers_1.isVideo)(media.remoteUrl)) {
                    console.info(`Repairing broken video attachment in toot:`, this);
                    media.type = types_1.MediaCategory.VIDEO;
                }
                else {
                    console.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            }
            else if (!string_helpers_1.MEDIA_TYPES.includes(media.type)) {
                console.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }
        });
        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += `@${(0, string_helpers_1.extractDomain)(mention.url)}`;
            }
        });
    }
    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    completeProperties(userData, trendingLinks, trendingTags, isDeepInspect) {
        if (!this.shouldComplete())
            return;
        this.muted ||= (this.realAccount().webfingerURI in userData.mutedAccounts);
        const wasFollowed = this.account.isFollowed;
        this.account.isFollowed ||= (this.account.webfingerURI in userData.followedAccounts);
        if (this.account.isFollowed && !wasFollowed) {
            if (['stevensaus@faithcollapsing.com', "@strandjunker@mstdn.social", '@radicalgraffiti@todon.eu', '@ai6yr@m.ai6yr.org', '@luckytran@med-mastodon.com'].includes(this.account.webfingerURI)) {
                console.error(`completeProperties() ${this.account.describe()} is followed according to these followedAccounts:`, userData.followedAccounts);
            }
            else {
                console.debug(`completeProperties() ${this.account.describe()} is followed according to this webfingerURI: "${this.account.webfingerURI}"`);
            }
        }
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
        if (isDeepInspect) {
            toot.followedTags = allFollowedTags.filter(tag => toot.containsString(tag.name));
            toot.trendingTags = trendingTags.filter(tag => toot.containsString(tag.name));
            toot.trendingLinks = trendingLinks.filter(link => toot.containsString(link.url));
        }
        else {
            // Use containsTag() instead of containsString() for speed
            toot.followedTags = allFollowedTags.filter(tag => toot.containsTag(tag.name));
            toot.trendingTags = trendingTags.filter(tag => toot.containsTag(tag.name));
            toot.trendingLinks = []; // Very slow to calculate so skip it unless isDeepInspect is true
        }
        if (isDeepInspect) {
            this.completedAt = toot.completedAt = new Date().toISOString(); // Multiple assignmnet!
        }
    }
    // Returns true if the toot should be re-completed
    shouldComplete() {
        return !this.completedAt || ((0, time_helpers_1.ageInSeconds)(this.completedAt) > (config_1.Config.staleDataTrendingSeconds || 3600));
    }
    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////
    // Build array of new Toot objects from an array of Status objects.
    // Toots returned by this method should have all their properties set correctly.
    // TODO: Toots are sorted by popularity so callers can truncate unpopular toots but seems wrong place for it
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
        toots = toots.sort((a, b) => b.popularity() - a.popularity());
        console.debug(`${logPrefix} ${toots.length} toots built in ${(0, time_helpers_1.ageString)(startedAt)}`);
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
        const batchSleepMS = isDeepInspect ? config_1.Config.sleepBetweenCompletionMS : 0;
        const newCompleteToots = await (0, collection_helpers_1.batchMap)(tootsToComplete, (t) => complete(t), "completeToots", 50, batchSleepMS);
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
            const firstCompleted = uriToots.find(toot => !!toot.realToot().completedAt);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably wrong
            const firstTrendingLinks = uriToots.find(toot => !!toot.realToot().trendingLinks);
            const firstTrendingRankToot = uriToots.find(toot => !!toot.realToot().trendingRank); // TODO: should probably be Math.max()
            // Deal with tag arrays
            const allTrendingTags = uriToots.flatMap(toot => toot.realToot().trendingTags || []);
            const uniqueTrendingTags = (0, collection_helpers_1.uniquifyByProp)(allTrendingTags, (tag) => tag.name);
            const allFollowedTags = uriToots.flatMap(toot => toot.realToot().followedTags || []);
            const uniqueFollowedTags = (0, collection_helpers_1.uniquifyByProp)(allFollowedTags, (tag) => tag.name);
            // Collate accounts - reblogs and realToot accounts
            const accounts = uriToots.flatMap(t => [t.account].concat(t.reblog ? t.reblog.account : []));
            const sources = uriToots.flatMap(t => (t.sources || []).concat(t.reblog?.sources || []));
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);
            reblogsBy = (0, collection_helpers_1.uniquifyByProp)(reblogsBy, (account) => account.webfingerURI);
            const propsThatChange = PROPS_THAT_CHANGE.reduce((props, propName) => {
                props[propName] = Math.max(...uriToots.map(t => t.realToot()[propName] || 0));
                return props;
            }, {});
            uriToots.forEach((toot) => {
                // Counts may increase over time w/repeated fetches
                toot.realToot().favouritesCount = propsThatChange.favouritesCount;
                toot.realToot().reblogsCount = propsThatChange.reblogsCount;
                toot.realToot().repliesCount = propsThatChange.repliesCount;
                toot.account.isFollowed = accounts.some(a => (a.webfingerURI == toot.account.webfingerURI) && a.isFollowed);
                if (toot.account.isFollowed) {
                    if (toot.account.webfingerURI == "@Strandjunker@mstdn.social".toLowerCase()) {
                        console.error(`${logPrefix} ${toot.account.describe()} is followed according to these toots:`, uriToots);
                    }
                    else {
                        console.debug(`${logPrefix} ${toot.account.describe()} is followed according to these toots:`, uriToots);
                    }
                }
                // booleans can be ORed
                toot.muted = uriToots.some(toot => toot.muted);
                toot.sources = (0, collection_helpers_1.uniquify)(sources);
                // Set various properties to the first toot that has them
                toot.realToot().completedAt ??= firstCompleted?.completedAt;
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.realToot().trendingTags = uniqueTrendingTags;
                toot.realToot().followedTags = uniqueFollowedTags;
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
                toot.realToot().trendingLinks ??= firstTrendingLinks?.trendingLinks;
                toot.realToot().trendingRank ??= firstTrendingRankToot?.trendingRank;
                if (toot.reblog) {
                    toot.reblog.completedAt ??= firstCompleted?.completedAt;
                    toot.reblog.account.isFollowed ||= accounts.some(a => (a.webfingerURI == toot.reblog?.account.webfingerURI) && a.isFollowed);
                    toot.reblog.trendingRank ??= firstTrendingRankToot?.trendingRank;
                    toot.reblog.reblogsBy = reblogsBy;
                }
            });
        });
        const deduped = Object.values(tootsByURI).map(toots => toots[0]);
        (0, log_helpers_1.logTootRemoval)(logPrefix, "duplicate", toots.length - deduped.length, deduped.length);
        // console.info(`${logPrefix} deduped ${toots.length} toots to ${deduped.length} ${ageString(startedAt)}`);
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
const earliestTootedAtStr = (toots) => {
    const earliest = (0, exports.earliestTootedAt)(toots);
    return earliest ? (0, time_helpers_1.toISOFormat)(earliest) : null;
};
exports.earliestTootedAtStr = earliestTootedAtStr;
const mostRecentTootedAtStr = (toots) => {
    const newest = (0, exports.mostRecentTootedAt)(toots);
    return newest ? (0, time_helpers_1.toISOFormat)(newest) : null;
};
exports.mostRecentTootedAtStr = mostRecentTootedAtStr;
//# sourceMappingURL=toot.js.map