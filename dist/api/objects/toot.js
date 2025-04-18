"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumID = exports.mostRecentTootedAt = exports.earliestTootedAt = exports.sortByCreatedAt = exports.mostRecentToot = exports.earliestToot = exports.tootedAt = exports.TootVisibility = void 0;
const Storage_1 = __importDefault(require("../../Storage"));
const helpers_1 = require("../../helpers");
const account_1 = require("./account");
const types_1 = require("../../types");
const api_1 = require("../api");
const tag_1 = require("./tag");
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const UNKNOWN = "unknown";
// https://docs.joinmastodon.org/entities/Status/#visibility
var TootVisibility;
(function (TootVisibility) {
    TootVisibility["DIRECT_MSG"] = "direct";
    TootVisibility["PUBLIC"] = "public";
    TootVisibility["PRIVATE"] = "private";
    TootVisibility["UNLISTED"] = "unlisted";
})(TootVisibility || (exports.TootVisibility = TootVisibility = {}));
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
        this.account = toot.account;
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
        this.reblogsBy = (toot.reblogsBy ?? []);
        this.resolveAttempted = toot.resolveAttempted ?? false;
        this.resolvedToot = toot.resolvedToot;
        this.scoreInfo = toot.scoreInfo;
        this.trendingRank = toot.trendingRank;
        this.trendingLinks = (toot.trendingLinks ?? []);
        this.trendingTags = (toot.trendingTags ?? []);
        this.repairToot();
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
    describeAccount() {
        return (0, account_1.describeAccount)(this.account);
    }
    popularity() {
        return (this.favouritesCount || 0) + (this.reblogsCount || 0);
    }
    realURI() {
        return this.reblog?.uri || this.uri;
    }
    // Default to this.uri if this.url is empty
    realURL() {
        return this.reblog?.url || this.url || this.realURI();
    }
    async resolve() {
        if (this.resolveAttempted)
            return this.resolvedToot;
        try {
            this.resolvedToot = await api_1.MastoApi.instance.resolveToot(this);
        }
        catch (error) {
            console.warn(`Error resolving toot:`, error);
            console.warn(`Failed to resolve toot:`, this);
        }
        this.resolveAttempted = true;
        return this.resolvedToot;
    }
    // TODO: account.acct should have the "@" injected at repair time
    homserverAccountURL() {
        return `https://${api_1.MastoApi.instance.homeDomain}/@${this.account.acct}`;
    }
    // Convert remote mastodon server URLs to local ones, e.g.
    //     transform this: https://fosstodon.org/@kate/114360290341300577
    //            to this: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL() {
        const resolved = await this.resolve();
        if (!resolved)
            return this.realURL();
        const homeURL = `${this.homserverAccountURL()}/${resolved.id}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }
    tootedAt() {
        return new Date(this.createdAt);
    }
    audioAttachments() {
        return this.attachmentsOfType(helpers_1.AUDIO);
    }
    imageAttachments() {
        return this.attachmentsOfType(helpers_1.IMAGE);
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
        if (Date.now() < new Date(this.createdAt).getTime()) {
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
    contentShortened() {
        let content = this.reblog?.content || this.content || "";
        content = content.replace(/<\/p>/gi, "\n").trim();
        content = content.replace(/<[^>]+>/g, "").replace(/\n/g, " ").replace(/\s+/g, " ");
        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            if (this.videoAttachments().length > 0) {
                content = "VIDEO";
            }
            else if (this.audioAttachments().length > 0) {
                content = "AUDIO";
            }
            else if (this.imageAttachments().length > 0) {
                content = "IMAGE";
            }
            content = content.length > 0 ? `[${content}_ONLY]` : "[EMPTY_TOOT]";
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
            accountLabel += ` ｟⬆️⬆️RETOOT of ${this.reblog.describeAccount()}⬆️⬆️｠`;
        // Attachment info
        let mediaAttachments = this.mediaAttachments.map(attachment => attachment.type);
        if (mediaAttachments.length == 0)
            mediaAttachments = [];
        const tootObj = {
            FROM: `${accountLabel} [${this.createdAt}]`,
            URL: this.url,
            content: this.contentShortened(),
            retootOf: this.reblog ? `${this.reblog.describeAccount()} (${this.reblog.createdAt})` : null,
            inReplyToId: this.inReplyToId,
            mediaAttachments: mediaAttachments,
            raw: this,
            scoreInfo: this.scoreInfo,
            properties: {
                favouritesCount: this.favouritesCount,
                reblogsCount: this.reblogsCount,
                repliesCount: this.repliesCount,
                tags: (this.tags || this.reblog?.tags || []).map(t => `#${t.name}`).join(" "),
            },
        };
        return Object.keys(tootObj)
            .filter((k) => tootObj[k] != null)
            .reduce((obj, k) => ({ ...obj, [k]: tootObj[k] }), {});
    }
    // Returns an array of account strings for all accounts that reblogged this toot
    reblogsByAccts() {
        return this.reblogsBy.map((account) => account.acct);
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
        (0, account_1.repairAccount)(this.account);
        this.mentions.forEach(account_1.repairAccount);
        if (this.reblog) {
            this.trendingRank ||= this.reblog.trendingRank;
            if (!this.reblogsByAccts().includes(this.account.acct)) {
                this.reblog.reblogsBy.push(this.account);
            }
            // TODO: we still need to de-dupe because a few dupes sneak through
            this.reblogsBy = [...new Map(this.reblogsBy.map((acct) => [acct.acct, acct])).values()];
        }
        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                if ((0, helpers_1.isImage)(media.remoteUrl)) {
                    console.log(`Repairing broken image attachment in toot:`, this);
                    media.type = helpers_1.IMAGE;
                }
                else if ((0, helpers_1.isVideo)(media.remoteUrl)) {
                    console.log(`Repairing broken video attachment in toot:`, this);
                    media.type = helpers_1.VIDEO;
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
        return mediaAttachments.filter(attachment => attachment.type === attachmentType);
    }
    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots, logLabel) {
        const prefix = logLabel ? `[${logLabel}] ` : '';
        const tootsByURI = (0, helpers_1.groupBy)(toots, toot => toot.realURI());
        Object.values(tootsByURI).forEach((uriToots) => {
            const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
            const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()];
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo);
            const firstRankedToot = uriToots.find(toot => !!toot.trendingRank);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblogsBy ?? []);
            reblogsBy = [...new Map(reblogsBy.map((account) => [account.acct, account])).values()];
            // TODO: properly handle merging ScoreInfo when retooted by multiple accounts
            uriToots.forEach((toot) => {
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.trendingTags = uniqueTrendingTags || [];
                // Set missing scoreInfo to first scoreInfo we can find (if any)
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
                toot.trendingRank ??= firstRankedToot?.trendingRank;
                if (toot.reblog)
                    toot.reblog.trendingRank ??= firstRankedToot?.trendingRank;
                // Set reblogsBy
                toot.reblogsBy = reblogsBy;
            });
            // TODO: this warning is just so we can see if there are any toots with multiple reblogs
            if (reblogsBy.length > 1) {
                console.warn(`${prefix}Found ${reblogsBy.length} reblogs for toot:`, uriToots[0]);
            }
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