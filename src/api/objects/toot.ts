/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
import { capitalCase } from "capital-case";
import { mastodon } from "masto";

import Account from "./account";
import Storage from "../../Storage";
import {
    DEFAULT_FONT_SIZE,
    MEDIA_TYPES,
    VIDEO_TYPES,
    groupBy,
    htmlToText,
    isImage,
    isVideo,
    replaceEmojiShortcodesWithImageTags,
    replaceHttpsLinks,
} from "../../helpers";
import { FeedFilterSettings, StatusList, TootScore, TrendingLink, TrendingTag, WeightName } from "../../types";
import { MastoApi } from "../api";
import { MediaCategory } from "../../types";
import { repairTag } from "./tag";
import { TheAlgorithm } from "../..";

// https://docs.joinmastodon.org/entities/Status/#visibility
export enum TootVisibility {
    DIRECT_MSG = "direct",
    PUBLIC = "public",
    PRIVATE = "private",
    UNLISTED = "unlisted",
};

const MAX_CONTENT_PREVIEW_CHARS = 110;
const HUGE_ID = 10 ** 100;
const UNKNOWN = "unknown";

const ATTACHMENT_ICONS: Record<MediaCategory, string> = {
    [MediaCategory.AUDIO]: "audio",
    [MediaCategory.IMAGE]: "pic",
    [MediaCategory.VIDEO]: "vid"
};


// Serialized version of a Toot
export interface SerializableToot extends mastodon.v1.Status {
    followedTags?: mastodon.v1.Tag[];  // Array of tags that the user follows that exist in this toot
    isFollowed?: boolean;              // Whether the user follows the account that posted this toot
    reblog?: SerializableToot | null,  // The toot that was retooted (if any)
    reblogsBy?: mastodon.v1.Account[]; // The accounts that retooted this toot (if any)
    resolveAttempted?: boolean;        // Set to true if an attempt at resolving the toot has occurred
    resolvedToot?: Toot;               // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;             // Scoring info for weighting/sorting this toot
    trendingLinks?: TrendingLink[];    // Links that are trending in this toot
    trendingRank?: number;             // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TrendingTag[];      // Tags that are trending in this toot
};


interface TootObj extends SerializableToot {
    ageInSeconds: () => number;
    ageInHours: () => number;
    containsString: (str: string) => boolean;
    describe: () => string;
    homserverAccountURL: () => string;
    homeserverURL: () => Promise<string>;
    isDM: () => boolean;
    popularity: () => number;
    realURI: () => string;
    resolve: () => Promise<Toot | undefined>;
    tootedAt: () => Date;
    audioAttachments: () => Array<mastodon.v1.MediaAttachment>;
    imageAttachments: () => Array<mastodon.v1.MediaAttachment>;
    videoAttachments: () => Array<mastodon.v1.MediaAttachment>;
};


export default class Toot implements TootObj {
    id: string;
    uri: string;
    createdAt: string;
    editedAt: string | null;
    account: Account;
    content: string;
    visibility: mastodon.v1.StatusVisibility;
    sensitive: boolean;
    spoilerText: string;
    mediaAttachments: mastodon.v1.MediaAttachment[];
    application: mastodon.v1.Application;
    mentions: mastodon.v1.StatusMention[];
    tags: mastodon.v1.Tag[];
    emojis: mastodon.v1.CustomEmoji[];
    reblogsCount: number;
    favouritesCount: number;
    filtered?: mastodon.v1.FilterResult[];
    repliesCount: number;
    url?: string | null;
    inReplyToId?: string | null;
    inReplyToAccountId?: string | null;
    reblog?: Toot | null;
    poll?: mastodon.v1.Poll | null;
    card?: mastodon.v1.PreviewCard | null;
    language?: string | null;
    text?: string | null;
    favourited?: boolean | null;
    reblogged?: boolean | null;
    muted?: boolean | null;
    bookmarked?: boolean | null;
    pinned?: boolean | null;

    // extensions to mastodon.v1.Status
    followedTags: mastodon.v1.Tag[];   // Array of tags that the user follows that exist in this toot
    isFollowed?: boolean;              // Whether the user follows the account that posted this toot
    reblogsBy!: Account[];  // The accounts that retooted this toot
    resolveAttempted?: boolean;        // Set to true if an attempt at resolving the toot has occurred
    resolvedToot?: Toot;               // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;             // Scoring info for weighting/sorting this toot
    trendingRank?: number;             // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks: TrendingLink[];     // Links that are trending in this toot
    trendingTags: TrendingTag[];       // Tags that are trending in this toot

    constructor(toot: SerializableToot) {
        // TODO is there a less dumb way to do this other than manually copying all the properties?
        this.id = toot.id;
        this.uri = toot.uri;
        this.createdAt = toot.createdAt;
        this.editedAt = toot.editedAt;
        this.account = new Account(toot.account);
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
        this.followedTags = (toot.followedTags ?? []) as mastodon.v1.Tag[];
        this.isFollowed = toot.isFollowed;
        this.reblogsBy = (toot.reblogsBy ?? []).map(account => new Account(account));
        this.resolveAttempted = toot.resolveAttempted ?? false;
        this.resolvedToot = toot.resolvedToot;
        this.scoreInfo = toot.scoreInfo;
        this.trendingRank = toot.trendingRank;
        this.trendingLinks = (toot.trendingLinks ?? []) as TrendingLink[];
        this.trendingTags = (toot.trendingTags ?? []) as TrendingTag[];
        this.repairToot();
    }

    // Time since this toot was sent in seconds
    ageInSeconds(): number {
        return Math.floor((new Date().getTime() - this.tootedAt().getTime()) / 1000);
    }

    // Time since this toot was sent in hours
    ageInHours(): number {
        return this.ageInSeconds() / 3600;
    }

    // Returns true if the toot contains the given string in the content or (if it starts with '#') tags
    containsString(str: string): boolean {
        str = str.trim().toLowerCase();

        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name);
        } else {
            return this.content.toLowerCase().includes(str);
        }
    }

    // String that describes the toot in not so many characters
    describe(): string {
        let msg = `[${this.createdAt}]: ID: ${this.id}`;
        return `${msg} (${this.describeAccount()}): "${this.content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}..."`;
    }

    // String representation of the account that sent this toot
    describeAccount(): string {
        return this.account.describe();
    }

    // Describe the original account that posted this toot if it's a reblog falling back to this.describeAccount()
    describeRealAccount(): string {
        return this.reblog ? this.reblog.account.describe() : this.describeAccount();
    }

    // Sum of the reblogs, replies, and local server favourites
    popularity(): number {
        return (this.favouritesCount || 0) + (this.reblogsCount || 0) + (this.repliesCount || 0);
    }

    // URI for the toot
    realURI(): string {
        return this.reblog?.uri || this.uri;
    }

    // Default to this.realURI() if url property is empty
    realURL(): string {
        return this.reblog?.url || this.url || this.realURI();
    }

    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolve(): Promise<Toot | undefined> {
        if (this.resolveAttempted) return this.resolvedToot;

        try {
            this.resolvedToot = await MastoApi.instance.resolveToot(this);
        } catch (error) {
            console.error(`Error resolving toot:`, error);
            console.error(`Failed to resolve toot:`, this);
            this.resolvedToot = this;
        }

        this.resolveAttempted = true;
        return this.resolvedToot;
    }

    // URL for the account that posted this toot on the home server isntead of on the poster's server
    // TODO: account.acct should have the "@" injected at repair time?
    homserverAccountURL(): string {
        return `https://${MastoApi.instance.homeDomain}/@${this.account.acct}`;
    }

    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL(): Promise<string> {
        const resolved = await this.resolve();
        if (!resolved) return this.realURL();
        const homeURL = `${this.homserverAccountURL()}/${resolved.id}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }

    // Returns a string like '[PIC]' or '[VID]' depending on the type of attachment
    attachmentPrefix(): string {
        const attachmentType = this.attachmentType();
        return attachmentType ? ATTACHMENT_ICONS[attachmentType] : "";
    }

    // Return 'video' if toot contains a video, 'image' if there's an image, undefined if no attachments
    // TODO: can one toot have video and imagess? If so, we should return both (or something)
    attachmentType(): MediaCategory | undefined {
        if (this.audioAttachments().length > 0) {
            return MediaCategory.AUDIO;
        } else if (this.imageAttachments().length > 0) {
            return MediaCategory.IMAGE;
        } else if (this.videoAttachments().length > 0) {
            return MediaCategory.VIDEO;
        }
    }

    audioAttachments(): Array<mastodon.v1.MediaAttachment> {
        return this.attachmentsOfType(MediaCategory.AUDIO);
    }

    imageAttachments(): Array<mastodon.v1.MediaAttachment> {
        return this.attachmentsOfType(MediaCategory.IMAGE);
    }

    videoAttachments(): Array<mastodon.v1.MediaAttachment> {
        return VIDEO_TYPES.flatMap((videoType) => this.attachmentsOfType(videoType));
    }

    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters: FeedFilterSettings): boolean {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }

    // Return false if Toot should be discarded from feed altogether and permanently
    isValidForFeed(algo: TheAlgorithm): boolean {
        const { user, mutedAccounts } = algo;
        if (this?.reblog?.muted || this?.muted) return false;  // Remove muted accounts and toots
        if (this?.reblog?.reblogged) return false; // Remove things the user has already retooted

        if (this.account.username == user.username && this.account.id == user.id) {
            return false;  // Remove user's own toots
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
    contentWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return replaceEmojiShortcodesWithImageTags(this.content, emojis, fontSize);
    }

    // Return true if it's a direct message
    isDM(): boolean {
        return this.visibility === TootVisibility.DIRECT_MSG;
    }

    // Return true if it's a trending toot
    isTrending(): boolean {
        return !!(
               this.scoreInfo?.rawScores[WeightName.TRENDING_TOOTS]
            || this.trendingLinks?.length
            || this.trendingTags?.length
        );
    }

    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars?: number): string {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = htmlToText(this.reblog?.content || this.content || "");
        content = replaceHttpsLinks(content);

        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            let mediaType = this.attachmentType() ? `${this.attachmentType()}` : "empty";
            content = `<${capitalCase(mediaType)} post by ${this.describeRealAccount()}>`;
        } else if (content.length > MAX_CONTENT_PREVIEW_CHARS) {
            content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
        }

        return content;
    }

    // Returns a simplified version of the toot for logging
    condensedStatus(): object {
        // Account info for the person who tooted it
        let accountLabel = this.describeAccount();
        if (this.reblog) accountLabel += ` (⬆ retooting ${this.reblog.describeAccount()} ⬆)`;
        // Attachment info
        let mediaAttachments = this.mediaAttachments.map(attachment => attachment.type);
        if (mediaAttachments.length == 0) mediaAttachments = [];

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
            .filter((k) => infoObj[k as keyof typeof infoObj] != null)
            .reduce((obj, k) => ({ ...obj, [k]: infoObj[k as keyof typeof infoObj] }), {});
    }

    // Returns an array of account strings for all accounts that reblogged this toot
    reblogsByAccts(): string[] {
        return this.reblogsBy.map((account) => account.acct);
    }

     // Remove fxns so toots can be serialized to browser storage
    serialize(): SerializableToot {
        const toot = {...this} as SerializableToot;
        toot.account = this.account.serialize();
        toot.reblogsBy = this.reblogsBy.map((account) => account.serialize());
        return toot;
    }

    tootedAt(): Date {
        return new Date(this.createdAt);
    }

    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Set toot.language to defaultLanguage if missing
    //   - Set media type to "image" if unknown and reparable
    //   - Add server info to the account string and mentions for home server accounts
    //   - Lowercase all tags
    private repairToot(): void {
        this.application ??= {name: UNKNOWN};
        this.application.name ??= UNKNOWN;
        this.language ??= Storage.getConfig().defaultLanguage;
        // Repair Tags
        this.tags.forEach(repairTag);
        // Repair Accounts
        // TODO: mentions are probably broken
        // this.mentions.forEach(repairAccount);

        if (this.reblog){
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
                if (isImage(media.remoteUrl)) {
                    console.debug(`Repairing broken image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else if (isVideo(media.remoteUrl)) {
                    console.debug(`Repairing broken video attachment in toot:`, this);
                    media.type = MediaCategory.VIDEO;

                } else {
                    console.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            } else if (!MEDIA_TYPES.includes(media.type)) {
                console.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }
        });
    }

    private attachmentsOfType(attachmentType: mastodon.v1.MediaAttachmentType): Array<mastodon.v1.MediaAttachment> {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }

    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots: Toot[], logLabel?: string): Toot[] {
        const prefix = logLabel ? `[${logLabel}] ` : '';
        const tootsByURI = groupBy<Toot>(toots, toot => toot.realURI());

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

        const deduped: Toot[] = Object.values(tootsByURI).map(toots => toots[0]);
        console.log(`${prefix}Removed ${toots.length - deduped.length} duplicate toots leaving ${deduped.length}:`, deduped);
        return deduped;
    };
};


export const tootedAt = (toot: mastodon.v1.Status): Date => new Date(toot.createdAt);
export const earliestToot = (toots: StatusList): mastodon.v1.Status | null => sortByCreatedAt(toots)[0];
export const mostRecentToot = (toots: StatusList): mastodon.v1.Status | null => sortByCreatedAt(toots).slice(-1)[0];

export const sortByCreatedAt = (toots: StatusList): StatusList => {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1);
};

export const earliestTootedAt = (toots: StatusList): Date | null => {
    const earliest = earliestToot(toots);
    return earliest ? tootedAt(earliest) : null;
};

export const mostRecentTootedAt = (toots: StatusList): Date | null => {
    const newest = mostRecentToot(toots);
    return newest ? tootedAt(newest) : null;
};


// Find the minimum ID in a list of toots.
// Unused because sorting by ID only works when all toots came from the same server.
export const minimumID = (toots: Toot[]): number | null => {
    const minId =  toots.reduce((min, toot) => {
        const numericalID = parseInt(toot.id);  // IDs are not guaranteed to be numerical

        if (isNaN(numericalID)) {
            console.warn(`toot.id is not a number: ${toot.id}`);
            return min;
        }

        return numericalID < min ? numericalID : min;
    }, HUGE_ID);

    return minId == HUGE_ID ? null : minId;
};


// export const tootSize = (toot: Toot): number => {
//     return JSON.stringify(toot).length;
//     // TODO: Buffer requires more setup: https://stackoverflow.com/questions/68707553/uncaught-referenceerror-buffer-is-not-defined
//     // return Buffer.byteLength(JSON.stringify(toot));
// };// Build a string that contains the display name, account name, etc. for a given post.
