"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tootedAt = exports.earliestToot = exports.mostRecentTootAt = exports.mostRecentToot = exports.earliestTootAt = exports.sortByCreatedAt = exports.minimumID = void 0;
const Storage_1 = __importDefault(require("../../Storage"));
const helpers_1 = require("../../helpers");
const EARLIEST_TIMESTAMP = new Date("1970-01-01T00:00:00.000Z");
const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const BROKEN_TAG = "<<BROKEN_TAG>>";
const UNKNOWN_APP = "unknown";
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
    reblogBy; // The account that retooted this toot (if any)
    scoreInfo; // Scoring info for weighting/sorting this toot
    trendingRank; // Most trending on a server gets a 10, next is a 9, etc.
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
        this.followedTags = toot.followedTags;
        this.isFollowed = toot.isFollowed;
        this.reblogBy = toot.reblogBy;
        this.scoreInfo = toot.scoreInfo;
        this.trendingRank = toot.trendingRank;
        this.trendingTags = toot.trendingTags;
        this.repairToot();
    }
    containsString(str) {
        str = str.trim().toLowerCase();
        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name.toLowerCase());
        }
        else {
            return this.content.toLowerCase().includes(str);
        }
    }
    describe() {
        let msg = `[${this.createdAt}]: ID: ${this.id}`;
        return `${msg} (${this.describeAccount()}): "${this.content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}..."`;
    }
    describeAccount() {
        return `${this.account.displayName} (${this.account.acct})`;
    }
    popularity() {
        return (this.favouritesCount || 0) + (this.reblogsCount || 0);
    }
    tootedAt() {
        return new Date(this.createdAt);
    }
    ;
    imageAttachments() {
        return this.attachmentsOfType(helpers_1.IMAGE);
    }
    videoAttachments() {
        return this.attachmentsOfType(helpers_1.VIDEO);
    }
    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters) {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }
    // Return false if Toot should be discarded from feed altogether and permanently
    isValidForFeed(user) {
        if (this?.reblog?.muted || this?.muted)
            return false; // Remove muted accounts and toots
        if (this?.reblog?.reblogged)
            return false; // Remove things the user has already retooted
        if (this.account.username == user.username && this.account.id == user.id)
            return false; // Remove user's toots
        // Sometimes there are wonky statuses that are like years in the future so we filter them out.
        if (Date.now() < new Date(this.createdAt).getTime()) {
            console.warn(`Removed toot with future timestamp: `, this);
            return false;
        }
        // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
        if (this.filtered?.length) {
            const filterMatch = this.filtered[0];
            console.debug(`Toot matched server filter (${filterMatch.keywordMatches?.join(' ')}): `, this);
            return false;
        }
        return true;
    }
    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN_APP if missing
    //   - Set toot.language to defaultLanguage if missing
    //   - Add server info to the account string if missing
    //   - Set media type to "image" if unknown and reparable
    //   - Lowercase all tags
    repairToot() {
        this.application ??= { name: UNKNOWN_APP };
        this.application.name ??= UNKNOWN_APP;
        this.language ??= Storage_1.default.getConfig().defaultLanguage;
        this.followedTags ??= [];
        // Inject the @server info to the account string if it's missing
        if (this.account.acct && !this.account.acct.includes("@")) {
            // console.debug(`Injecting @server info to account string '${this.account.acct}' for:`, this);
            this.account.acct = `${this.account.acct}@${this.account.url.split("/")[2]}`;
        }
        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type === "unknown" && (0, helpers_1.isImage)(media.remoteUrl)) {
                console.log(`Repairing broken media attachment in toot:`, this);
                media.type = helpers_1.IMAGE;
            }
            else if (!helpers_1.MEDIA_TYPES.includes(media.type)) {
                console.warn(`Unknown media type: '${media.type}' for toot:`, this);
            }
        });
        // Lowercase and count tags
        this.tags.forEach(tag => {
            tag.name = (tag.name?.length > 0) ? tag.name.toLowerCase() : BROKEN_TAG;
        });
    }
    // Returns a simplified version of the toot for logging
    condensedStatus() {
        // Contents of toot (the text)
        let content = this.reblog?.content || this.content || "";
        if (content.length > MAX_CONTENT_PREVIEW_CHARS)
            content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
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
            content: content,
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
    attachmentsOfType(attachmentType) {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type === attachmentType);
    }
    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots, logLabel) {
        const prefix = logLabel ? `[${logLabel}] ` : '';
        const tootsByURI = (0, helpers_1.groupBy)(toots, (toot) => toot.uri);
        Object.entries(tootsByURI).forEach(([_uri, uriToots]) => {
            if (!uriToots || uriToots.length == 0)
                return;
            const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
            const uniqueTrendingTags = [...new Map(allTrendingTags.map((tag) => [tag.name, tag])).values()];
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo);
            if (firstScoredToot && uriToots.length > 1) {
                console.log(`${prefix}First scored toot in group of ${uriToots.length}:`, firstScoredToot, `\nall toots:`, uriToots);
            }
            uriToots.forEach((toot) => {
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.trendingTags = uniqueTrendingTags || [];
                // Set missing scoreInfo to first scoreInfo we can find (if any)
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
            });
        });
        const deduped = [...new Map(toots.map((toot) => [toot.uri, toot])).values()];
        console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
        return deduped;
    }
    ;
}
exports.default = Toot;
;
// Find the minimum ID in a list of toots
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
const sortByCreatedAt = (toots) => {
    return toots.toSorted((a, b) => {
        return a.createdAt < b.createdAt ? -1 : 1;
    });
};
exports.sortByCreatedAt = sortByCreatedAt;
const earliestTootAt = (toots) => {
    const earliest = (0, exports.earliestToot)(toots);
    return earliest ? (0, exports.tootedAt)(earliest) : null;
};
exports.earliestTootAt = earliestTootAt;
// Find the most recent toot in the feed
const mostRecentToot = (toots) => {
    if (toots.length == 0)
        return null;
    return (0, exports.sortByCreatedAt)(toots).slice(-1)[0];
};
exports.mostRecentToot = mostRecentToot;
const mostRecentTootAt = (toots) => {
    const mostRecent = (0, exports.mostRecentToot)(toots);
    return mostRecent ? (0, exports.tootedAt)(mostRecent) : null;
};
exports.mostRecentTootAt = mostRecentTootAt;
// Find the most recent toot in the feed
const earliestToot = (toots) => {
    if (toots.length == 0)
        return null;
    return (0, exports.sortByCreatedAt)(toots)[0];
};
exports.earliestToot = earliestToot;
const tootedAt = (toot) => {
    return new Date(toot.createdAt);
};
exports.tootedAt = tootedAt;
// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
//# sourceMappingURL=toot.js.map