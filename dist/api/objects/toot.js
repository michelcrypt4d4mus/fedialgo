"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumID = exports.mostRecentTootedAt = exports.earliestTootedAt = exports.sortByCreatedAt = exports.mostRecentToot = exports.earliestToot = exports.tootedAt = void 0;
/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
const change_case_1 = require("change-case");
const escape = require('regexp.escape');
const account_1 = __importDefault(require("./account"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const Storage_1 = __importDefault(require("../../Storage"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = require("../api");
const tag_1 = require("./tag");
const time_helpers_1 = require("../../helpers/time_helpers");
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
const HUGE_ID = 10 ** 100;
const UNKNOWN = "unknown";
;
;
class Toot {
    id;
    uri;
    application;
    account;
    content;
    createdAt;
    editedAt;
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
    // extensions to mastodon.v1.Status. Most of these are set in setDependentProperties()
    followedTags; // Array of tags that the user follows that exist in this toot
    isFollowed; // Whether the user follows the account that posted this toot
    reblogsBy; // The accounts that retooted this toot
    resolvedToot; // This Toot with URLs resolved to homeserver versions
    scoreInfo; // Scoring info for weighting/sorting this toot
    trendingRank; // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks; // Links that are trending in this toot
    trendingTags; // Tags that are trending that appear in this toot
    audioAttachments;
    imageAttachments;
    videoAttachments;
    constructor(toot) {
        // TODO is there a less dumb way to do this other than manually copying all the properties?
        this.id = toot.id;
        this.uri = toot.uri;
        this.account = new account_1.default(toot.account);
        this.application = toot.application;
        this.bookmarked = toot.bookmarked;
        this.card = toot.card;
        this.content = toot.content;
        this.createdAt = toot.createdAt;
        this.editedAt = toot.editedAt;
        this.emojis = toot.emojis;
        this.favourited = toot.favourited;
        this.favouritesCount = toot.favouritesCount;
        this.filtered = toot.filtered;
        this.inReplyToId = toot.inReplyToId;
        this.inReplyToAccountId = toot.inReplyToAccountId;
        this.language = toot.language;
        this.mediaAttachments = toot.mediaAttachments;
        this.mentions = toot.mentions;
        this.muted = toot.muted;
        this.pinned = toot.pinned;
        this.poll = toot.poll;
        this.reblogsCount = toot.reblogsCount;
        this.reblogged = toot.reblogged;
        this.repliesCount = toot.repliesCount;
        this.sensitive = toot.sensitive;
        this.spoilerText = toot.spoilerText;
        this.tags = toot.tags;
        this.text = toot.text;
        this.url = toot.url;
        this.visibility = toot.visibility;
        // Unique to fedialgo
        this.reblog = toot.reblog ? new Toot(toot.reblog) : undefined;
        this.followedTags = toot.followedTags;
        this.isFollowed = toot.isFollowed;
        this.reblogsBy = (toot.reblogsBy ?? []).map(account => new account_1.default(account));
        this.resolvedToot = toot.resolvedToot;
        this.scoreInfo = toot.scoreInfo;
        this.trendingRank = toot.trendingRank;
        this.trendingLinks = toot.trendingLinks;
        this.trendingTags = toot.trendingTags;
        this.repair();
        // These must be set after repair() has a chance to fix any broken media types
        this.audioAttachments = this.attachmentsOfType(types_1.MediaCategory.AUDIO);
        this.imageAttachments = this.attachmentsOfType(types_1.MediaCategory.IMAGE);
        this.videoAttachments = string_helpers_1.VIDEO_TYPES.flatMap((videoType) => this.attachmentsOfType(videoType));
    }
    // Time since this toot was sent in seconds
    ageInSeconds() {
        return Math.floor((new Date().getTime() - this.tootedAt().getTime()) / 1000);
    }
    // Time since this toot was sent in hours
    ageInHours() {
        return this.ageInSeconds() / 3600;
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
    // Returns true if the toot contains the given string in the content or (if it starts with '#') tags
    containsString(str) {
        str = str.trim().toLowerCase();
        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name);
        }
        else {
            const regex = new RegExp(`\\b${escape(str)}\\b`);
            return regex.test(this.content.toLowerCase());
        }
    }
    // Generate a string describing the followed and trending tags in the toot
    containsTagsMsg() {
        const followedTagsMsg = this.containsTagsOfTypeMsg(types_1.WeightName.FOLLOWED_TAGS);
        const trendingTagsMsg = this.containsTagsOfTypeMsg(types_1.WeightName.TRENDING_TAGS);
        if (followedTagsMsg && trendingTagsMsg) {
            return [followedTagsMsg, trendingTagsMsg].join("; ");
        }
        else if (followedTagsMsg) {
            return followedTagsMsg;
        }
        else if (trendingTagsMsg) {
            return trendingTagsMsg;
        }
    }
    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention() {
        return this.mentions.some((mention) => mention.acct == api_1.MastoApi.instance.user.webfingerURI);
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
    isValidForFeed() {
        // Remove user's own toots
        if (this.isUsersOwnToot()) {
            console.debug(`Removing fedialgo user's own toot:`, this);
            return false;
        }
        // Remove muted accounts and toots
        if (this.reblog?.muted || this.muted) {
            console.debug(`Removing toot from muted account (${this.realAccount().describe()}):`, this);
            return false;
        }
        // Sometimes there are wonky statuses that are like years in the future so we filter them out.
        if (Date.now() < this.tootedAt().getTime()) {
            console.warn(`Removed toot with future timestamp:`, this);
            return false;
        }
        // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
        if (this.filtered?.length) {
            const filterMatchStr = this.filtered[0].keywordMatches?.join(' ');
            // console.debug(`Removed toot matching server filter (${filterMatchStr}): ${this.describe()}`);
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
            this.resolvedToot = await api_1.MastoApi.instance.resolveToot(this);
        }
        catch (error) {
            console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            this.resolvedToot = this;
        }
        return this.resolvedToot;
    }
    // Remove fxns so toots can be serialized to browser storage
    serialize() {
        const serializableToot = { ...this };
        serializableToot.account = this.account.serialize();
        serializableToot.reblogsBy = this.reblogsBy.map((account) => account.serialize());
        return serializableToot;
    }
    // Some properties cannot be repaired and/or set until info about the user is available
    setDependentProperties(userData, trendingLinks, trendingTags) {
        this.isFollowed = this.account.webfingerURI in userData.followedAccounts;
        if (this.reblog)
            this.reblog.isFollowed ||= this.reblog.account.webfingerURI in userData.followedAccounts;
        const toot = this.realToot();
        // Set trendingLinks property
        toot.trendingLinks ??= trendingLinks.filter(link => toot.containsString(link.url));
        // Set trendingTags and followedTags properties
        // TODO: this has an unfortunate side effect that the filters don't work
        // correctly on toots that contain the name of a hashtag without actually
        // containing that hashtag. TootMatcher was updated to make it work while we try this out.
        if (!toot.trendingTags || !toot.followedTags) {
            toot.followedTags = userData.followedTags.filter(tag => toot.containsString(tag.name));
            toot.trendingTags = trendingTags.filter(tag => toot.containsString(tag.name));
        }
        // Set mutes for toots by muted users that came from a source besides our server timeline
        if (!toot.muted && this.realAccount().webfingerURI in userData.mutedAccounts) {
            console.debug(`Muting toot from (${this.realAccount().describe()}):`, this);
            toot.muted = true;
        }
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
        if (tagType == types_1.WeightName.FOLLOWED_TAGS) {
            tags = this.followedTags || [];
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
        return `Contains ${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }
    // Returns true if this toot is by the fedialgo user
    isUsersOwnToot() {
        const algoUser = api_1.MastoApi.instance.user;
        if (this.account.webfingerURI == algoUser.webfingerURI)
            return true;
        if (this.reblog && this.reblog.account.webfingerURI == algoUser.webfingerURI)
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
        this.language ??= Storage_1.default.getConfig().defaultLanguage;
        this.tags.forEach(tag_1.repairTag); // Repair Tags
        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);
            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                if (this.reblogsBy.length > 0) {
                    console.log(`Didn't find '${this.account.webfingerURI}' in reblogsByAccts (${JSON.stringify(reblogsByAccts)}). this.reblogsBy raw:\n${JSON.stringify(this.reblogsBy)}`);
                }
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
    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////
    // Build array of new Toot objects from an array of Status objects.
    // Toots returned by this method should have all their properties set correctly.
    static async buildToots(toots) {
        return await this.setDependentProps(toots.map(t => new Toot(t)));
    }
    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots, logLabel) {
        const tootsByURI = (0, collection_helpers_1.groupBy)(toots, toot => toot.realURI());
        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
            const uniqueTrendingTags = (0, collection_helpers_1.uniquifyByProp)(allTrendingTags, (tag) => tag.name);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo);
            const firstRankedToot = uriToots.find(toot => !!toot.trendingRank);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);
            uriToots.forEach((toot) => {
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.trendingTags = uniqueTrendingTags || [];
                // Set missing scoreInfo to first scoreInfo we can find (if any)
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
                toot.trendingLinks ??= firstScoredToot?.trendingLinks;
                toot.trendingRank ??= firstRankedToot?.trendingRank;
                if (toot.reblog) {
                    toot.reblog.trendingRank ??= firstRankedToot?.trendingRank;
                    toot.reblog.reblogsBy = (0, collection_helpers_1.uniquifyByProp)(reblogsBy, (account) => account.webfingerURI);
                }
            });
        });
        const deduped = Object.values(tootsByURI).map(toots => toots[0]);
        (0, string_helpers_1.logTootRemoval)(logLabel || `dedupeToots`, "duplicate", toots.length - deduped.length, deduped.length);
        return deduped;
    }
    ;
    // Set the dependent properties for all of a list of Toot objects
    static async setDependentProps(toots) {
        const userData = await api_1.MastoApi.instance.getUserData();
        const trendingLinks = await mastodon_server_1.default.fediverseTrendingLinks();
        const trendingTags = await mastodon_server_1.default.fediverseTrendingTags();
        await (0, collection_helpers_1.batchPromises)(toots, async (t) => t.setDependentProperties(userData, trendingLinks, trendingTags), "Toot.setDependentProperties()");
        return toots; // TODO: this return is unecessary; objects are mutated in place
    }
}
exports.default = Toot;
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
// Find the minimum ID in a list of toots.
// Unused because sorting by ID only works when all toots came from the same server.
const minimumID = (toots) => {
    const minId = toots.reduce((min, toot) => {
        const numericalID = parseInt(toot.id); // IDs are not guaranteed to be numerical
        if (isNaN(numericalID)) {
            console.warn(`toot.id is not a number: ${toot.id}`);
            return min;
        }
        return numericalID < min ? numericalID : min;
    }, HUGE_ID);
    return minId == HUGE_ID ? null : minId;
};
exports.minimumID = minimumID;
// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
//# sourceMappingURL=toot.js.map