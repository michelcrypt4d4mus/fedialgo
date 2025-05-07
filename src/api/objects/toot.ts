/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
import { capitalCase } from "change-case";
import { mastodon } from "masto";
import { Type } from 'class-transformer';
const escape = require('regexp.escape');

import Account from "./account";
import MastoApi from "../api";
import MastodonServer from "../mastodon_server";
import Scorer from "../../scorer/scorer";
import UserData from "../user_data";
import { ageInSeconds, ageString, toISOFormat } from "../../helpers/time_helpers";
import { batchMap, groupBy, sumArray, uniquify, uniquifyByProp } from "../../helpers/collection_helpers";
import { Config } from "../../config";
import { logTootRemoval, traceLog } from '../../helpers/log_helpers';
import { repairTag } from "./tag";
import {
    DEFAULT_FONT_SIZE,
    MEDIA_TYPES,
    VIDEO_TYPES,
    extractDomain,
    htmlToText,
    isImage,
    isVideo,
    replaceEmojiShortcodesWithImageTags,
    replaceHttpsLinks
} from "../../helpers/string_helpers";
import {
    FeedFilterSettings,
    MastodonTag,
    MediaCategory,
    StatusList,
    TootLike,
    TootScore,
    TrendingLink,
    TrendingTag,
    WeightName
} from "../../types";

// https://docs.joinmastodon.org/entities/Status/#visibility
enum TootVisibility {
    DIRECT_MSG = "direct",
    PUBLIC = "public",
    PRIVATE = "private",
    UNLISTED = "unlisted",
};

const MAX_ID_IDX = 2;
const MAX_CONTENT_PREVIEW_CHARS = 110;
const UNKNOWN = "unknown";


// Serialized version of a Toot
export interface SerializableToot extends mastodon.v1.Status {
    followedTags?: MastodonTag[];      // Array of tags that the user follows that exist in this toot
    isFollowed?: boolean;              // Whether the user follows the account that posted this toot
    reblog?: SerializableToot | null,  // The toot that was retooted (if any)
    reblogsBy?: mastodon.v1.Account[]; // The accounts that retooted this toot (if any)
    resolvedToot?: Toot;               // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;             // Scoring info for weighting/sorting this toot
    sources?: string[];                   // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];    // Links that are trending in this toot
    trendingRank?: number;             // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TrendingTag[];      // Tags that are trending in this toot
    audioAttachments?: mastodon.v1.MediaAttachment[];
    imageAttachments?: mastodon.v1.MediaAttachment[];
    videoAttachments?: mastodon.v1.MediaAttachment[];
};


interface TootObj extends SerializableToot {
    ageInHours: () => number;
    containsString: (str: string) => boolean;
    containsTag: (tag: string | MastodonTag) => boolean;
    describe: () => string;
    homeserverURL: () => Promise<string>;
    isDM: () => boolean;
    popularity: () => number;
    realAccount: () => Account;
    realToot: () => Toot;
    realURI: () => string;
    resolve: () => Promise<Toot>;
    tootedAt: () => Date;
};


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
    tags!: mastodon.v1.Tag[];
    visibility!: mastodon.v1.StatusVisibility;
    // Optional fields
    bookmarked?: boolean | null;
    card?: mastodon.v1.PreviewCard | null;
    favourited?: boolean | null;
    filtered?: mastodon.v1.FilterResult[];
    language?: string | null;
    inReplyToId?: string | null;
    inReplyToAccountId?: string | null;
    muted?: boolean | null;
    pinned?: boolean | null;
    poll?: mastodon.v1.Poll | null;
    @Type(() => Toot) reblog?: Toot | null;
    reblogged?: boolean | null;
    text?: string | null;
    url?: string | null;

    // extensions to mastodon.v1.Status. Most of these are set in setDependentProperties()
    followedTags?: mastodon.v1.Tag[];            // Array of tags that the user follows that exist in this toot
    isFollowed?: boolean;                        // Whether the user follows the account that posted this toot
    participatedTags?: TrendingTag[];            // Array of tags that the user has participated in that exist in this toot
    @Type(() => Account) reblogsBy!: Account[];  // The accounts that retooted this toot
    @Type(() => Toot) resolvedToot?: Toot;       // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                       // Scoring info for weighting/sorting this toot
    sources?: string[];                          // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingRank?: number;                       // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks?: TrendingLink[];              // Links that are trending in this toot
    trendingTags?: TrendingTag[];                // Tags that are trending that appear in this toot
    audioAttachments!: mastodon.v1.MediaAttachment[];
    imageAttachments!: mastodon.v1.MediaAttachment[];
    videoAttachments!: mastodon.v1.MediaAttachment[];

    // Alternate constructor because class-transformer doesn't work with constructor arguments
    static build(toot: SerializableToot): Toot {
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
        tootObj.reblog = toot.reblog ? Toot.build(toot.reblog) : undefined;
        tootObj.followedTags = toot.followedTags;
        tootObj.isFollowed = toot.isFollowed;
        tootObj.reblogsBy = (toot.reblogsBy ?? []).map(account => Account.build(account));
        tootObj.resolvedToot = toot.resolvedToot;
        tootObj.scoreInfo = toot.scoreInfo;
        tootObj.sources = toot.sources;
        tootObj.trendingRank = toot.trendingRank;
        tootObj.trendingLinks = toot.trendingLinks;
        tootObj.trendingTags = toot.trendingTags;

        tootObj.repair();
        // These must be set after repair() has a chance to fix any broken media types
        tootObj.audioAttachments = tootObj.attachmentsOfType(MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(MediaCategory.IMAGE);
        tootObj.videoAttachments = VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));
        return tootObj;
    }

    // Time since this toot was sent in hours
    ageInHours(): number {
        return ageInSeconds(this.tootedAt()) / 3600;
    }

    // Return 'video' if toot contains a video, 'image' if there's an image, undefined if no attachments
    // TODO: can one toot have video and imagess? If so, we should return both (or something)
    attachmentType(): MediaCategory | undefined {
        if (this.imageAttachments.length > 0) {
            return MediaCategory.IMAGE;
        } else if (this.videoAttachments.length > 0) {
            return MediaCategory.VIDEO;
        } else if (this.audioAttachments.length > 0) {
            return MediaCategory.AUDIO;
        }
    }

    // True if toot contains 'str' in the content, the link preview card, or (if it starts with '#') the tags
    containsString(str: string): boolean {
        str = str.trim().toLowerCase();

        if (str.startsWith("#")) {
            return this.tags.some((tag) => str.slice(1) == tag.name);
        }

        const regex = new RegExp(`\\b${escape(str)}\\b`);
        const contentStr = `${this.content} ${this.card?.description || ""} ${this.card?.title || ""}`;
        return regex.test(contentStr.trim().toLowerCase());
    }

    // Generate a string describing the followed and trending tags in the toot
    containsTagsMsg(): string | undefined {
        let msgs = [
            this.containsTagsOfTypeMsg(WeightName.FOLLOWED_TAGS),
            this.containsTagsOfTypeMsg(WeightName.TRENDING_TAGS),
            this.containsTagsOfTypeMsg(WeightName.PARTICIPATED_TAGS),
        ];

        msgs = msgs.filter((msg) => msg);
        return msgs.length ? msgs.join("; ") : undefined;
    }

    containsTag(tag: string | MastodonTag): boolean {
        const tagName = typeof tag == "string" ? tag : tag.name;
        return this.tags.some((tag) => tag.name == tagName);
    }

    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention(): boolean {
        return this.mentions.some((mention) => mention.acct == MastoApi.instance.user.webfingerURI);
    }

    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars?: number): string {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = htmlToText(this.reblog?.content || this.content || "");
        content = replaceHttpsLinks(content);

        // Fill in placeholders if content string is empty, truncate it if it's too long
        if (content.length == 0) {
            let mediaType = this.attachmentType() ? `${this.attachmentType()}` : "empty";
            content = `<${capitalCase(mediaType)} post by ${this.realAccount().describe()}>`;
        } else if (content.length > MAX_CONTENT_PREVIEW_CHARS) {
            content = `${content.slice(0, MAX_CONTENT_PREVIEW_CHARS)}...`;
        }

        return content;
    }

    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return replaceEmojiShortcodesWithImageTags(this.content, emojis, fontSize);
    }

    // String that describes the toot in not so many characters
    describe(): string {
        let msg = `${this.account.describe()} [${toISOFormat(this.createdAt)}, ID=${this.id}]`;
        return `${msg}: "${this.contentShortened()}"`;
    }

    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL(): Promise<string> {
        const resolved = await this.resolve();
        if (!resolved) return this.realURL();
        const homeURL = `${this.account.homserverURL()}/${resolved.id}`;
        console.debug(`homeserverURL() converted '${this.realURL()}' to '${homeURL}'`);
        return homeURL;
    }

    // Return true if it's a direct message
    isDM(): boolean {
        return this.visibility === TootVisibility.DIRECT_MSG;
    }

    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters: FeedFilterSettings): boolean {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }

    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending(): boolean {
        return !!(
               this.scoreInfo?.rawScores[WeightName.TRENDING_TOOTS]
            || this.trendingLinks?.length
            || this.trendingTags?.length
        );
    }

    // Return false if Toot should be discarded from feed altogether and permanently
    // Note that this is very different from being temporarily filtered out of the visible feed
    isValidForFeed(): boolean {
        if (this.isUsersOwnToot()) {
            traceLog(`Removing fedialgo user's own toot: ${this.describe()}`);
            return false;
        } else if (this.reblog?.muted || this.muted) {
            traceLog(`Removing toot from muted account (${this.realAccount().describe()}):`, this);
            return false;
        } if (Date.now() < this.tootedAt().getTime()) {
            // Sometimes there are wonky statuses that are like years in the future so we filter them out.
            console.warn(`Removing toot with future timestamp:`, this);
            return false;
        } if (this.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatchStr = this.filtered[0].keywordMatches?.join(' ');
            traceLog(`Removing toot matching server filter (${filterMatchStr}): ${this.describe()}`);
            return false;
        }

        return true;
    }

    // Sum of the trendingRank, numReblogs, replies, and local server favourites
    popularity(): number {
        return sumArray([this.favouritesCount, this.reblogsCount, this.repliesCount, this.trendingRank]);
    }

    // Return the account that posted this toot, not the account that reblogged it
    realAccount(): Account {
        return this.realToot().account;
    }

    // Return the toot that was reblogged if it's a reblog, otherwise return this toot
    realToot(): Toot {
        return this.reblog ?? this;
    }

    // URI for the toot
    realURI(): string {
        return this.realToot().uri;
    }

    // Default to this.realURI() if url property is empty
    realURL(): string {
        return this.realToot().url || this.realURI();
    }

    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolve(): Promise<Toot> {
        if (this.resolvedToot) return this.resolvedToot as Toot;

        try {
            this.resolvedToot = await MastoApi.instance.resolveToot(this);
        } catch (error) {
            console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            this.resolvedToot = this;
        }

        return this.resolvedToot;
    }

     // Remove fxns so toots can be serialized to browser storage
    serialize(): SerializableToot {
        const serializableToot = {...this} as SerializableToot;
        serializableToot.account = this.account.serialize();
        serializableToot.reblogsBy = this.reblogsBy.map((account) => account.serialize());
        return serializableToot;
    }

    alternateScoreInfo(): ReturnType<typeof Scorer.alternateScoreInfo> {
        return Scorer.alternateScoreInfo(this);
    }

    tootedAt(): Date {
        return new Date(this.createdAt);
    }

    //////////////////////////////
    //     Private methods      //
    //////////////////////////////

    // return MediaAttachmentType objects with type == attachmentType
    private attachmentsOfType(attachmentType: mastodon.v1.MediaAttachmentType): mastodon.v1.MediaAttachment[] {
        const mediaAttachments = this.reblog?.mediaAttachments ?? this.mediaAttachments;
        return mediaAttachments.filter(attachment => attachment.type == attachmentType);
    }

    // Generate a string describing the followed and trending tags in the toot
    private containsTagsOfTypeMsg(tagType: WeightName): string | undefined {
        let tags: MastodonTag[] = [];

        // TODO: The tagType argument should probably be a TypeFilterName type...
        if (tagType == WeightName.FOLLOWED_TAGS) {
            tags = this.followedTags || [];
        } else if (tagType == WeightName.PARTICIPATED_TAGS) {
            tags = this.participatedTags || [];
        } else if (tagType == WeightName.TRENDING_TAGS) {
            tags = this.trendingTags || [];
        } else {
            console.warn(`Toot.containsTagsMsg() called with invalid tagType: ${tagType}`);
        }

        if (!tags.length) return;
        const tagTypeStr = capitalCase(tagType).replace(/ Tag/, " Hashtag");
        return `Contains ${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }

    // Returns true if this toot is by the fedialgo user
    private isUsersOwnToot(): boolean {
        const algoUserWebfingerURI = MastoApi.instance.user.webfingerURI;
        if (this.account.webfingerURI == algoUserWebfingerURI) return true;
        if (this.reblog && this.reblog.account.webfingerURI == algoUserWebfingerURI) return true;
        return false;
    }

    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Set toot.language to defaultLanguage if missing
    //   - Lowercase all tags
    //   - Repair mediaAttachment types if reparable based on URL file extension
    //   - Repair StatusMention objects for users on home server
    private repair(): void {
        this.application ??= {name: UNKNOWN};
        this.application.name ??= UNKNOWN;
        this.language ??= Config.defaultLanguage;
        this.tags.forEach(repairTag);  // Repair Tags

        if (this.reblog){
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);

            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                this.reblog.reblogsBy.push(this.account);
            }
        }

        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                if (isImage(media.remoteUrl)) {
                    console.info(`Repairing broken image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else if (isVideo(media.remoteUrl)) {
                    console.info(`Repairing broken video attachment in toot:`, this);
                    media.type = MediaCategory.VIDEO;
                } else {
                    console.warn(`Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            } else if (!MEDIA_TYPES.includes(media.type)) {
                console.warn(`Unknown media of type: '${media.type}' for toot:`, this);
            }
        });

        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += `@${extractDomain(mention.url)}`;
            }
        })
    }

    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    private setDependentProperties(
        userData: UserData,
        trendingLinks: TrendingLink[],
        trendingTags: TrendingTag[],
        isDeepInspect?: boolean
    ): void {
        const followedTags = Object.values(userData.followedTags);
        this.isFollowed ||= this.account.webfingerURI in userData.followedAccounts;
        this.muted ||= this.realAccount().webfingerURI in userData.mutedAccounts;
        if (this.reblog) this.reblog.isFollowed ||= this.reblog.account.webfingerURI in userData.followedAccounts;
        const toot = this.realToot();

        // Note use of containsTag() instead of containsString() like the other tag arrays.
        // containsString() matched way too many toots (~80% in my case) and was too slow.
        toot.participatedTags = Object.values(userData.participatedHashtags).filter(tag => toot.containsTag(tag));

        // With all the containsString() calls it takes ~1.1 seconds to build 40 toots
        // Without them it's ~0.1 seconds. In particular the trendingLinks are slow! maybe 90% of that time.
        if (isDeepInspect) {
            toot.followedTags = followedTags.filter(tag => toot.containsString(tag.name));
            toot.trendingTags = trendingTags.filter(tag => toot.containsString(tag.name));
            toot.trendingLinks = trendingLinks.filter(link => toot.containsString(link.url));
        } else {
            // Use containsTag() instead of containsString() for speed
            toot.followedTags = followedTags.filter(tag => toot.containsTag(tag.name));
            toot.trendingTags = trendingTags.filter(tag => toot.containsTag(tag.name));
            toot.trendingLinks = [];  // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }

    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////

    // Build array of new Toot objects from an array of Status objects.
    // Toots returned by this method should have all their properties set correctly.
    // TODO: Toots are sorted by popularity so callers can truncate unpopular toots but seems wrong place for it
    static async buildToots(
        statuses: TootLike[],
        source: string,  // Where did these toots come from?
        logPrefix?: string
    ): Promise<Toot[]> {
        if (statuses.length == 0) return [];  // Avoid the data fetching if we don't to build anything
        logPrefix ||= source;
        logPrefix = `[${logPrefix} buildToots()]`;
        const startedAt = new Date();

        // NOTE: this calls completeToots() with isDeepInspect = false. You must later call it with true
        // to get the full set of properties set on the Toots.
        let toots = await this.completeToots(statuses, logPrefix, false);
        toots.forEach((toot) => toot.sources = [source]);
        toots = Toot.dedupeToots(toots, logPrefix);
        toots = toots.sort((a, b) => b.popularity() - a.popularity());
        console.info(`${logPrefix} ${toots.length} toots built in ${ageString(startedAt)}`);
        return toots;
    }

    // Fetch all the data we need to set dependent properties and set them on the toots.
    static async completeToots(toots: TootLike[], logPrefix: string, isDeepInspect: boolean): Promise<Toot[]> {
        let startedAt = new Date();
        // TODO: remove this at some point, just here for logging info about instanceof usage
        const tootObjs = toots.filter(toot => toot instanceof Toot);
        const userData = await MastoApi.instance.getUserData();
        const trendingTags = await MastodonServer.fediverseTrendingTags();
        const trendingLinks = isDeepInspect ? (await MastodonServer.fediverseTrendingLinks()) : []; // Skip trending links
        const fetchAgeStr = ageString(startedAt);
        startedAt = new Date();

        toots = toots.map((tootLike): Toot => {
            const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
            toot.setDependentProperties(userData, trendingLinks, trendingTags, isDeepInspect);
            return toot as Toot;
        });

        const msg = `${logPrefix} setDependentProps() isDeepInspect=${isDeepInspect} on ${toots.length} toots`;
        console.info(`${msg} ${ageString(startedAt)} (data fetched ${fetchAgeStr}, ${tootObjs.length} were already toots)`);
        return toots as Toot[];
    }

    // Remove dupes by uniquifying on the toot's URI
    static dedupeToots(toots: Toot[], logLabel?: string): Toot[] {
        const startedAt = new Date();
        const tootsByURI = groupBy<Toot>(toots, toot => toot.realURI());

        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            // If there's only one too there's no need to collate anything
            // if (uriToots.length == 1) {
            //     if (uriToots[0].reblog && uriToots[0].reblog.reblogsBy?.length) {
            //         uriToots[0].reblog.reblogsBy = uniquifyByProp(uriToots[0].reblogsBy, (acct) => acct.webfingerURI);
            //     }

            //     return;
            // }

            const isMuted = uriToots.some(toot => toot.muted);
            const isFollowed = uriToots.some(toot => toot.isFollowed);
            const firstRankedToot = uriToots.find(toot => !!toot.trendingRank);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo);
            const firstResolvedToot = uriToots.find(toot => !!toot.resolvedToot);
            const firstFollowedTags = uriToots.find(toot => !!toot.followedTags);
            const firstTrendingLinks = uriToots.find(toot => !!toot.trendingLinks);
            const allTrendingTags = uriToots.flatMap(toot => toot.trendingTags || []);
            const uniqueTrendingTags = uniquifyByProp(allTrendingTags, (tag) => tag.name);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);

            uriToots.forEach((toot) => {
                // Set all toots to have all trending tags so when we uniquify we catch everything
                toot.trendingTags = uniqueTrendingTags || [];
                // Set missing scoreInfo to first scoreInfo we can find (if any)
                toot.scoreInfo ??= firstScoredToot?.scoreInfo;
                toot.trendingLinks ??= firstScoredToot?.trendingLinks;
                toot.trendingRank ??= firstRankedToot?.trendingRank;
                toot.resolvedToot ??= firstResolvedToot?.resolvedToot;
                toot.followedTags ??= firstFollowedTags?.followedTags;
                toot.trendingLinks ??= firstTrendingLinks?.trendingLinks;
                toot.isFollowed = isFollowed;
                toot.muted = isMuted;
                toot.sources = uniquify(uriToots.map(toot => toot.sources || []).flat());

                if (toot.reblog) {
                    toot.reblog.trendingRank ??= firstRankedToot?.trendingRank;
                    toot.reblog.reblogsBy = uniquifyByProp(reblogsBy, (account) => account.webfingerURI);
                }
            });
        });

        const deduped = Object.values(tootsByURI).map(toots => toots[0]);
        logTootRemoval(logLabel || `dedupeToots`, "duplicate", toots.length - deduped.length, deduped.length);
        console.info(`${logLabel} deduped ${toots.length} toots to ${deduped.length} ${ageString(startedAt)}`);
        return deduped;
    };

    // Extract a minimum ID from a set of toots that will be appropriate to use as the maxId param
    // for a call to the mastodon API to get the next page of toots.
    // Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
    // or future so we use the MAX_ID_IDX toot when sorted by createdAt to get the min ID.
    static findMinIdForMaxIdParam(toots: Toot[]): string | null {
        if (toots.length == 0) return null;
        const idx = Math.min(toots.length - 1, MAX_ID_IDX);
        return sortByCreatedAt(toots)[idx].id;
    }
};


// Methods for dealing with toot timestamps
export const tootedAt = (toot: TootLike): Date => new Date(toot.createdAt);
export const earliestToot = (toots: StatusList): TootLike | null => sortByCreatedAt(toots)[0];
export const mostRecentToot = (toots: StatusList): TootLike | null => sortByCreatedAt(toots).slice(-1)[0];

// Returns array with oldest toot first
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

export const earliestTootedAtStr = (toots: StatusList): string | null => {
    const earliest = earliestTootedAt(toots);
    return earliest ? toISOFormat(earliest) : null;
};

export const mostRecentTootedAtStr = (toots: StatusList): string | null => {
    const newest = mostRecentTootedAt(toots);
    return newest ? toISOFormat(newest) : null;
};
