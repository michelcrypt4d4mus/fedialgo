"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumID = exports.mostRecentTootedAt = exports.earliestTootedAt = exports.sortByCreatedAt = exports.mostRecentToot = exports.earliestToot = exports.tootedAt = exports.TootVisibility = void 0;
/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
const capital_case_1 = require("capital-case");
const account_1 = __importDefault(require("./account"));
const Storage_1 = __importDefault(require("../../Storage"));
const helpers_1 = require("../../helpers");
const types_1 = require("../../types");
const api_1 = require("../api");
const types_2 = require("../../types");
const tag_1 = require("./tag");
// https://docs.joinmastodon.org/entities/Status/#visibility
var TootVisibility;
(function (TootVisibility) {
    TootVisibility["DIRECT_MSG"] = "direct";
    TootVisibility["PUBLIC"] = "public";
    TootVisibility["PRIVATE"] = "private";
    TootVisibility["UNLISTED"] = "unlisted";
})(TootVisibility || (exports.TootVisibility = TootVisibility = {}));
;
const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const UNKNOWN = "unknown";
const ATTACHMENT_ICONS = {
    [types_2.MediaCategory.AUDIO]: "audio",
    [types_2.MediaCategory.IMAGE]: "pic",
    [types_2.MediaCategory.VIDEO]: "vid"
};
;
;
class Toot {
    id;
    uri;
    createdAt;
    editedAt;
    account;
    content;
    visibility;
    sensitive;
    spoilerText;
    mediaAttachments;
    application;
    mentions;
    tags;
    emojis;
    reblogsCount;
    favouritesCount;
    filtered;
    repliesCount;
    url;
    inReplyToId;
    inReplyToAccountId;
    reblog;
    poll;
    card;
    language;
    text;
    favourited;
    reblogged;
    muted;
    bookmarked;
    pinned;
    // extensions to mastodon.v1.Status
    followedTags; // Array of tags that the user follows that exist in this toot
    isFollowed; // Whether the user follows the account that posted this toot
    reblogsBy; // The accounts that retooted this toot
    resolveAttempted; // Set to true if an attempt at resolving the toot has occurred
    resolvedToot; // This Toot with URLs resolved to homeserver versions
    scoreInfo; // Scoring info for weighting/sorting this toot
    trendingRank; // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks; // Links that are trending in this toot
    trendingTags; // Tags that are trending in this toot
    constructor(toot) {
        // TODO is there a less dumb way to do this other than manually copying all the properties?
        this.id = toot.id;
        this.uri = toot.uri;
        this.createdAt = toot.createdAt;
        this.editedAt = toot.editedAt;
        this.account = new account_1.default(toot.account);
        this.content = toot.content;
        this.visibility = toot.visibility;
        this.sensitive = toot.sensitive;
        this.spoilerText = toot.spoilerText;
        this.mediaAttachments = toot.mediaAttachments;
        this.application = toot.application;
        this.mentions = toot.mentions;
        this.tags = toot.tags;
        this.emojis = toot.emojis;
        this.reblogsCount = toot.reblogsCount;
        this.favouritesCount = toot.favouritesCount;
        this.filtered = toot.filtered;
        this.repliesCount = toot.repliesCount;
        this.url = toot.url;
        this.inReplyToId = toot.inReplyToId;
        this.inReplyToAccountId = toot.inReplyToAccountId;
        this.poll = toot.poll;
        this.card = toot.card;
        this.language = toot.language;
        this.text = toot.text;
        this.favourited = toot.favourited;
        this.reblogged = toot.reblogged;
        this.muted = toot.muted;
        this.bookmarked = toot.bookmarked;
        this.pinned = toot.pinned;
        // Unique to fedialgo
        this.reblog = toot.reblog ? new Toot(toot.reblog) : undefined;
        this.followedTags = (toot.followedTags ?? []);
        this.isFollowed = toot.isFollowed;
        this.reblogsBy = (toot.reblogsBy ?? []).map(account => new account_1.default(account));
        this.resolveAttempted = toot.resolveAttempted ?? false;
        this.resolvedToot = toot.resolvedToot;
        this.scoreInfo = toot.scoreInfo;
        this.trendingRank = toot.trendingRank;
        this.trendingLinks = (toot.trendingLinks ?? []);
        this.trendingTags = (toot.trendingTags ?? []);
        this.repairToot();
    }
    // Time since this toot was sent in seconds
    ageInSeconds() {
        return Math.floor((new Date().getTime() - this.tootedAt().getTime()) / 1000);
    }
    // Time since this toot was sent in hours
    ageInHours() {
        return this.ageInSeconds() / 3600;
    }
    // Returns true if the toot contains the given string in the content or (if it starts with '#') tags
    containsString(str) {
        str = str.trim().toLowerCase();
        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name);
        }
        else {
            return this.content.toLowerCase().includes(str);
        }
    }
    // String that describes the toot in not so many characters
    describe() {
        let msg = `[${this.createdAt}]: ID: ${this.id}`;
        return `${msg} (${this.describeAccount()}): "${this.content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}..."`;
    }
    // String representation of the account that sent this toot
    describeAccount() {
        return this.account.describe();
    }
    // Describe the original account that posted this toot if it's a reblog falling back to this.describeAccount()
    describeRealAccount() {
        return this.reblog ? this.reblog.account.describe() : this.describeAccount();
    }
    // Sum of the reblogs, replies, and local server favourites
    popularity() {
        return (this.favouritesCount || 0) + (this.reblogsCount || 0) + (this.repliesCount || 0);
    }
    // URI for the toot
    realURI() {
        return this.reblog?.uri || this.uri;
    }
    // Default to this.realURI() if url property is empty
    realURL() {
        return this.reblog?.url || this.url || this.realURI();
    }
    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolve() {
        if (this.resolveAttempted)
            return this.resolvedToot;
        try {
            this.resolvedToot = await api_1.MastoApi.instance.resolveToot(this);
        }
        catch (error) {
            console.error(`Error resolving toot:`, error);
            console.error(`Failed to resolve toot:`, this);
            this.resolvedToot = this;
        }
        this.resolveAttempted = true;
        return this.resolvedToot;
    }
    // URL for the account that posted this toot on the home server isntead of on the poster's server
    // TODO: account.acct should have the "@" injected at repair time?
    homserverAccountURL() {
        return `https://${api_1.MastoApi.instance.homeDomain}/@${this.account.acct}`;
    }
    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL() {
        const resolved = await this.resolve();
        if (!resolved)
            return this.realURL();
        const homeURL = `${this.homserverAccountURL()}/${resolved.id}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }
    // Returns a string like '[PIC]' or '[VID]' depending on the type of attachment
    attachmentPrefix() {
        const attachmentType = this.attachmentType();
        return attachmentType ? ATTACHMENT_ICONS[attachmentType] : "";
    }
    // Return 'video' if toot contains a video, 'image' if there's an image, undefined if no attachments
    // TODO: can one toot have video and imagess? If so, we should return both (or something)
    attachmentType() {
        if (this.audioAttachments().length > 0) {
            return types_2.MediaCategory.AUDIO;
        }
        else if (this.imageAttachments().length > 0) {
            return types_2.MediaCategory.IMAGE;
        }
        else if (this.videoAttachments().length > 0) {
            return types_2.MediaCategory.VIDEO;
        }
    }
    audioAttachments() {
        return this.attachmentsOfType(types_2.MediaCategory.AUDIO);
    }
    imageAttachments() {
        return this.attachmentsOfType(types_2.MediaCategory.IMAGE);
    }
    videoAttachments() {
        return helpers_1.VIDEO_TYPES.flatMap((videoType) => this.attachmentsOfType(videoType));
    }
    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters) {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }
    // Return false if Toot should be discarded from feed altogether and permanently
    isValidForFeed(algo) {
        const { user, mutedAccounts } = algo;
        if (this?.reblog?.muted || this?.muted)
            return false; // Remove muted accounts and toots
        if (this?.reblog?.reblogged)
            return false; // Remove things the user has already retooted
        if (this.account.username == user.username && this.account.id == user.id) {
            return false; // Remove user's own toots
        }
        if (this.account.acct in mutedAccounts) {
            console.debug(`Removing toot from muted account (${this.describeAccount()}):`, this);
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
            console.debug(`Removed toot matching server filter (${filterMatchStr}):`, this);
            return false;
        }
        return true;
    }
    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize = helpers_1.DEFAULT_FONT_SIZE) {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return (0, helpers_1.replaceEmojiShortcodesWithImageTags)(this.content, emojis, fontSize);
    }
    // Return true if it's a direct message
    isDM() {
        return this.visibility === TootVisibility.DIRECT_MSG;
    }
    // Return true if it's a trending toot
    isTrending() {
        return !!(this.scoreInfo?.rawScores[types_1.WeightName.TRENDING_TOOTS]
            || this.trendingLinks?.length
            || this.trendingTags?.length);
    }
    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars) {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = (0, helpers_1.htmlToText)(this.reblog?.content || this.content || "");
        content = (0, helpers_1.replaceHttpsLinks)(content);
        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            let mediaType = this.attachmentType() ? `${this.attachmentType()}` : "empty";
            content = `<${(0, capital_case_1.capitalCase)(mediaType)} post by ${this.describeRealAccount()}>`;
        }
        else if (content.length > MAX_CONTENT_PREVIEW_CHARS) {
            content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
        }
        return content;
    }
    // Returns a simplified version of the toot for logging
    condensedStatus() {
        // Account info for the person who tooted it
        let accountLabel = this.describeAccount();
        if (this.reblog)
            accountLabel += ` (⬆ retooting ${this.reblog.describeAccount()} ⬆)`;
        // Attachment info
        let mediaAttachments = this.mediaAttachments.map(attachment => attachment.type);
        if (mediaAttachments.length == 0)
            mediaAttachments = [];
        const infoObj = {
            content: this.contentShortened(),
            from: `${accountLabel} [${this.createdAt}]`,
            inReplyToId: this.inReplyToId,
            mediaAttachments: mediaAttachments,
            raw: this,
            retootOf: this.reblog ? `${this.reblog.describeAccount()} (${this.reblog.createdAt})` : null,
            scoreInfo: this.scoreInfo,
            url: this.url,
            properties: {
                favouritesCount: this.favouritesCount,
                reblogsCount: this.reblogsCount,
                repliesCount: this.repliesCount,
                tags: (this.tags || this.reblog?.tags || []).map(t => `#${t.name}`).join(" "),
            },
        };
        return Object.keys(infoObj)
            .filter((k) => infoObj[k] != null)
            .reduce((obj, k) => ({ ...obj, [k]: infoObj[k] }), {});
    }
    // Returns an array of account strings for all accounts that reblogged this toot
    reblogsByAccts() {
        return this.reblogsBy.map((account) => account.acct);
    }
    // Remove fxns so toots can be serialized to browser storage
    serialize() {
        const toot = { ...this };
        toot.account = this.account.serialize();
        toot.reblogsBy = this.reblogsBy.map((account) => account.serialize());
        return toot;
    }
    tootedAt() {
        return new Date(this.createdAt);
    }
    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Set toot.language to defaultLanguage if missing
    //   - Set media type to "image" if unknown and reparable
    //   - Add server info to the account string and mentions for home server accounts
    //   - Lowercase all tags
    repairToot() {
        this.application ??= { name: UNKNOWN };
        this.application.name ??= UNKNOWN;
        this.language ??= Storage_1.default.getConfig().defaultLanguage;
        // Repair Tags
        this.tags.forEach(tag_1.repairTag);
        // Repair Accounts
        // TODO: mentions are probably broken
        // this.mentions.forEach(repairAccount);
        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            if (!this.reblogsByAccts().includes(this.account.acct)) {
                if (this.reblogsBy.length > 0) {
                    console.log(`Didn't find '${this.account.acct}' in reblogsByAccts (${JSON.stringify(this.reblogsByAccts())}). this.reblogsBy raw:\n${JSON.stringify(this.reblogsBy)}`);
                }
                this.reblog.reblogsBy.push(this.account);
            }
            // TODO: we still need to de-dupe because a few dupes sneak through
            this.reblog.reblogsBy = [...new Map(this.reblog.reblogsBy.map((acct) => [acct.acct, acct])).values()];
        }
        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                if ((0, helpers_1.isImage)(media.remoteUrl)) {
                    console.debug(`Repairing broken image attachment in toot:`, this);
                    media.type = types_2.MediaCategory.IMAGE;
                }
                else if ((0, helpers_1.isVideo)(media.remoteUrl)) {
                    console.debug(`Repairing broken video attachment in toot:`, this);
                    media.type = types_2.MediaCategory.VIDEO;
                }
                else {
                    console.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            }
            else if (!helpers_1.MEDIA_TYPES.includes(media.type)) {
                console.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }
        });
    }
    attachmentsOfType(attachmentType) {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }
    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots, logLabel) {
        const prefix = logLabel ? `[${logLabel}] ` : '';
        const tootsByURI = (0, helpers_1.groupBy)(toots, toot => toot.realURI());
        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
            const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()];
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo);
            const firstRankedToot = uriToots.find(toot => !!toot.trendingRank);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);
            reblogsBy = [...new Map(reblogsBy.map((account) => [account.acct, account])).values()];
            // TODO: this warning is just so we can see if there are any toots with multiple reblogs
            if (reblogsBy.length > 1) {
                console.debug(`${prefix}Found ${reblogsBy.length} reblogs for toot:`, uriToots[0]);
            }
            // TODO: properly handle merging ScoreInfo when retooted by multiple accounts
            uriToots.forEach((toot) => {
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.trendingTags = uniqueTrendingTags || [];
                // Set missing scoreInfo to first scoreInfo we can find (if any)
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
                toot.trendingRank ??= firstRankedToot?.trendingRank;
                if (toot.reblog) {
                    toot.reblog.trendingRank ??= firstRankedToot?.trendingRank;
                    toot.reblog.reblogsBy = reblogsBy;
                }
            });
        });
        const deduped = Object.values(tootsByURI).map(toots => toots[0]);
        console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
        return deduped;
    }
    ;
}
exports.default = Toot;
;
const tootedAt = (toot) => new Date(toot.createdAt);
exports.tootedAt = tootedAt;
const earliestToot = (toots) => (0, exports.sortByCreatedAt)(toots)[0];
exports.earliestToot = earliestToot;
const mostRecentToot = (toots) => (0, exports.sortByCreatedAt)(toots).slice(-1)[0];
exports.mostRecentToot = mostRecentToot;
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