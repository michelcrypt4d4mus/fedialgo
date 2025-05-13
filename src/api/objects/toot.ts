/*
 * Ideally this would be a formal class but for now it's just some helper functions
 * for dealing with Toot objects.
 */
const escape = require('regexp.escape');
import { capitalCase } from "change-case";
import { mastodon } from "masto";
import { Type } from 'class-transformer';

import Account from "./account";
import MastoApi from "../api";
import MastodonServer from "../mastodon_server";
import Scorer from "../../scorer/scorer";
import UserData from "../user_data";
import { ageInHours, ageInSeconds, ageString, timelineCutoffAt, toISOFormat } from "../../helpers/time_helpers";
import { batchMap, groupBy, sortObjsByProps, sumArray, uniquify, uniquifyByProp } from "../../helpers/collection_helpers";
import { Config } from "../../config";
import { FOREIGN_SCRIPTS, LANGUAGE_CODES, detectLangInfo } from "../../helpers/language_helper";
import { logTootRemoval, traceLog } from '../../helpers/log_helpers';
import { repairTag } from "./tag";
import {
    DEFAULT_FONT_SIZE,
    MEDIA_TYPES,
    VIDEO_TYPES,
    bracketed,
    collapseWhitespace,
    extractDomain,
    htmlToText,
    isImage,
    isVideo,
    removeEmojis,
    removeLinks,
    removeMentions,
    removeTags,
    replaceEmojiShortcodesWithImageTags,
    replaceHttpsLinks
} from "../../helpers/string_helpers";
import {
    FeedFilterSettings,
    MastodonTag,
    MediaCategory,
    StatusList,
    StringNumberDict,
    TagWithUsageCounts,
    TootLike,
    TootScore,
    TrendingLink,
    WeightName
} from "../../types";


// https://docs.joinmastodon.org/entities/Status/#visibility
enum TootVisibility {
    DIRECT_MSG = "direct",
    PUBLIC = "public",
    PRIVATE = "private",
    UNLISTED = "unlisted",
};

const MAX_CONTENT_PREVIEW_CHARS = 110;
const MAX_ID_IDX = 2;
const MIN_CHARS_FOR_LANG_DETECT = 8;
const UNKNOWN = "unknown";
const BLUESKY_BRIDGY = 'bsky.brid.gy';
const REPAIR_TOOT = bracketed("repairToot");

const PROPS_THAT_CHANGE: (keyof Toot)[] = [
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
}, {} as Record<string, boolean>);


// Extension of mastodon.v1.Status data object with additional properties used by fedialgo
export interface SerializableToot extends mastodon.v1.Status {
    completedAt?: string;              // Timestamp a full deep inspection of the toot was completed
    followedTags?: MastodonTag[];      // Array of tags that the user follows that exist in this toot
    reblog?: SerializableToot | null,  // The toot that was retooted (if any)
    reblogsBy?: mastodon.v1.Account[]; // The accounts that retooted this toot (if any)
    resolvedToot?: Toot;               // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;             // Scoring info for weighting/sorting this toot
    sources?: string[];                // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];    // Links that are trending in this toot
    trendingRank?: number;             // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TagWithUsageCounts[];      // Tags that are trending in this toot
    audioAttachments?: mastodon.v1.MediaAttachment[];
    imageAttachments?: mastodon.v1.MediaAttachment[];
    videoAttachments?: mastodon.v1.MediaAttachment[];
};


interface TootObj extends SerializableToot {
    ageInHours: () => number;
    attachmentType: () => MediaCategory | undefined;
    containsString: (str: string) => boolean;
    containsTag: (tag: string | MastodonTag, fullScan?: boolean) => boolean;
    contentString: () => string;
    contentShortened: (maxChars?: number) => string;
    contentWithEmojis: (fontSize?: number) => string;
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

    // extensions to mastodon.v1.Status. Most of these are set in completeProperties()
    completedAt?: string;
    followedTags?: mastodon.v1.Tag[];            // Array of tags that the user follows that exist in this toot
    participatedTags?: TagWithUsageCounts[];            // Array of tags that the user has participated in that exist in this toot
    @Type(() => Account) reblogsBy!: Account[];  // The accounts that retooted this toot
    @Type(() => Toot) resolvedToot?: Toot;       // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                       // Scoring info for weighting/sorting this toot
    sources?: string[];                          // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingRank?: number;                       // Most trending on a server gets a 10, next is a 9, etc.
    trendingLinks?: TrendingLink[];              // Links that are trending in this toot
    trendingTags?: TagWithUsageCounts[];                // Tags that are trending that appear in this toot
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
        tootObj.completedAt = toot.completedAt;
        tootObj.followedTags = toot.followedTags;
        tootObj.reblog = toot.reblog ? Toot.build(toot.reblog) : undefined;
        // TODO: the reblogsBy don't have the isFollowed flag set correctly
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
        return ageInHours(this.tootedAt());
    }

    // Experimental alternative format for the scoreInfo property used in demo app
    alternateScoreInfo(): ReturnType<typeof Scorer.alternateScoreInfo> {
        return Scorer.alternateScoreInfo(this);
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
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }

    // Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search
    containsTag(tag: string | MastodonTag, fullScan?: boolean): boolean {
        let tagName = (typeof tag == "string" ? tag : tag.name).trim().toLowerCase();
        if (tagName.startsWith("#")) tagName = tagName.slice(1);

        if (fullScan && (tagName.length > 1) && !(tagName in TAG_ONLY_STRING_LOOKUP)) {
            return this.containsString(tagName);
        } else {
            return this.tags.some((tag) => tag.name == tagName);
        }
    }

    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention(): boolean {
        return this.mentions.some((mention) => mention.acct == MastoApi.instance.user.webfingerURI);
    }

    // Shortened string of content property stripped of HTML tags
    contentShortened(maxChars?: number): string {
        maxChars ||= MAX_CONTENT_PREVIEW_CHARS;
        let content = this.contentString();
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

     // Return the toot's 'content' field stripped of HTML tags
    contentString(): string {
        return htmlToText(this.realToot().content || "");
    }

    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    contentStripped(): string {
        const contentWithCard = `${this.contentString()} (${this.card?.description ? htmlToText(this.card.description) : ""})`;
        let txt = removeMentions(removeEmojis(removeTags(removeLinks(contentWithCard))));
        return collapseWhitespace(txt);
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

    getScore(): number {
        return this.scoreInfo?.score || 0;
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

    // Returns true if this toot is from a followed account or contains a followed tag
    isFollowed(): boolean {
        return !!(this.account.isFollowed || this.reblog?.account.isFollowed || this.realToot().followedTags?.length);
    }

    // Return true if the toot has not been filtered out of the feed
    isInTimeline(filters: FeedFilterSettings): boolean {
        let isOK = Object.values(filters.filterSections).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }

    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending(): boolean {
        return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length);
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
        } else if (Date.now() < this.tootedAt().getTime()) {
            // Sometimes there are wonky statuses that are like years in the future so we filter them out.
            console.warn(`Removing toot with future timestamp:`, this);
            return false;
        } else if (this.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatchStr = this.filtered[0].keywordMatches?.join(' ');
            traceLog(`Removing toot matching server filter (${filterMatchStr}): ${this.describe()}`);
            return false;
        } else if (this.tootedAt() < timelineCutoffAt()) {
            traceLog(`Removing toot older than ${timelineCutoffAt()}:`, this.tootedAt());
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

    // TODO: this maybe needs to take into consideration reblogsBy??
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

    // Some properties cannot be repaired and/or set until info about the user is available.
    // Also some properties are very slow - in particular all the tag and trendingLink calcs.
    // isDeepInspect argument is used to determine if we should do the slow calculations or quick ones.
    private completeProperties(
        userData: UserData,
        trendingLinks: TrendingLink[],
        trendingTags: TagWithUsageCounts[],
        isDeepInspect?: boolean
    ): void {
        if (!this.shouldComplete()) return;
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

        if (isDeepInspect) {
            toot.trendingLinks = trendingLinks.filter(link => toot.containsString(link.url));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Multiple assignmnet!
        } else {
            toot.trendingLinks ||= [];  // Very slow to calculate so skip it unless isDeepInspect is true
        }
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
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
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
        this.tags.forEach(repairTag);  // Repair Tags
        this.determineLanguage();      // Repair language

        if (this.reblog){
            this.trendingRank ||= this.reblog.trendingRank;
            const reblogsByAccts = this.reblogsBy.map((account) => account.webfingerURI);

            if (!reblogsByAccts.includes(this.account.webfingerURI)) {
                this.reblog.reblogsBy.push(this.account);
                this.reblog.reblogsBy = sortObjsByProps(this.reblog.reblogsBy, ["displayName"], true, true);
            }
        }

        // Check for weird media types
        this.mediaAttachments.forEach((media) => {
            if (media.type == UNKNOWN) {
                if (isImage(media.remoteUrl)) {
                    console.info(`${REPAIR_TOOT} Repairing broken image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else if (isVideo(media.remoteUrl)) {
                    console.info(`${REPAIR_TOOT} Repairing broken video attachment in toot:`, this);
                    media.type = MediaCategory.VIDEO;
                } else if (this.uri?.includes(BLUESKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    console.info(`${REPAIR_TOOT} Repairing broken bluesky bridge image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else {
                    console.warn(`${REPAIR_TOOT} Unknown media type for URL: '${media.remoteUrl}' for toot:`, this);
                }
            } else if (!MEDIA_TYPES.includes(media.type)) {
                console.warn(`${REPAIR_TOOT} Unknown media of type: '${media.type}' for toot:`, this);
            }
        });

        // Repair StatusMention.acct field for users on the home server by appending @serverDomain
        this.mentions.forEach((mention) => {
            if (mention.acct && !mention.acct.includes("@")) {
                mention.acct += `@${extractDomain(mention.url)}`;
            }
        })
    }

    // Figure out an appropriate language for the toot based on the content.
    private determineLanguage(): void {
        let text = this.contentStripped();

        if (text.length < MIN_CHARS_FOR_LANG_DETECT) {
            this.language ??= Config.defaultLanguage;
            return;
        }

        const langDetectInfo = detectLangInfo(text);
        const { chosenLanguage, langDetector, tinyLD } = langDetectInfo;
        const summary = `toot.language="${this.language}", ${langDetectInfo.summary}`;
        const langLogObj = {...langDetectInfo, summary, text, toot: this};
        const logTrace = (msg: string) => traceLog(`${REPAIR_TOOT} ${msg} for "${text}"`, langLogObj);

        // If there's nothing detected log a warning (if text is long enough) and set language to default
        if ((tinyLD.allDetectResults.length + langDetector.allDetectResults.length) == 0) {
            if (text.length > (MIN_CHARS_FOR_LANG_DETECT * 2)) {
                console.warn(`${REPAIR_TOOT} no language detected`, langLogObj);
            }

            this.language ??= Config.defaultLanguage;
            return;
        }

        // If either language detection matches this.language return
        if (this.language && (tinyLD.detectedLang == this.language || langDetector.detectedLang == this.language)) {
            return;
        }

        // Or if we have successfully detected a language assign it to this.language and return
        if (chosenLanguage) {
            // Don't overwrite "zh-TW" with "zh"
            if (this.language?.startsWith(chosenLanguage)) {
                return;
            } else if (this.language && this.language != UNKNOWN) {
                logTrace(`Using chosenLanguage "${chosenLanguage}" to replace "${this.language}"`);
            }

            this.language = chosenLanguage;
            return;
        }

        if (tinyLD.detectedLang && FOREIGN_SCRIPTS.includes(tinyLD.detectedLang) && this.language?.startsWith(tinyLD.detectedLang)) {
            logTrace(`Using existing foreign lang "${this.language}" even with low accuracy`);
            return;
        }

        // Prioritize English in edge cases with low tinyLD accuracy but "en" either in toot or in LangDetector result
        if (!tinyLD.isAccurate && langDetector.isAccurate && langDetector.detectedLang == LANGUAGE_CODES.english) {
            logTrace(`Accepting "en" from langDetector.detectedLang"`);
            this.language = LANGUAGE_CODES.english;
            return;
        }

        if (this.language) {
            logTrace(`No guess good enough to override language "${this.language}" for "${text}"`);
        } else {
            logTrace(`Defaulting language prop to "en"`);
            this.language ??= Config.defaultLanguage;
        }
    }

    // Returns true if the toot should be re-completed
    private shouldComplete(): boolean {
        return !this.completedAt || (ageInSeconds(this.completedAt) > (Config.staleDataTrendingSeconds || 3600));
    }

    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////

    // Build array of new Toot objects from an array of Status objects.
    // Toots returned by this method should have all their properties set correctly.
    static async buildToots(
        statuses: TootLike[],
        source: string,  // Where did these toots come from?
        logPrefix?: string
    ): Promise<Toot[]> {
        if (statuses.length == 0) return [];  // Avoid the data fetching if we don't to build anything
        logPrefix ||= source;
        logPrefix = `${bracketed(logPrefix)} buildToots()`;
        const startedAt = new Date();

        // NOTE: this calls completeToots() with isDeepInspect = false. You must later call it with true
        // to get the full set of properties set on the Toots.
        let toots = await this.completeToots(statuses, logPrefix, false);
        toots.forEach((toot) => toot.sources = [source]);
        toots = Toot.dedupeToots(toots, logPrefix);
        // Make a first pass at scoring with whatever scorers are ready to score
        await Scorer.scoreToots(toots, false);
        // TODO: Toots are sorted by early score so callers can truncate unpopular toots but seems wrong place for it
        toots.sort((a, b) => b.getScore() - a.getScore());
        console.debug(`${logPrefix} ${toots.length} toots built in ${ageString(startedAt)}`);
        return toots;
    }

    // Fetch all the data we need to set dependent properties and set them on the toots.
    static async completeToots(toots: TootLike[], logPrefix: string, isDeepInspect: boolean): Promise<Toot[]> {
        let startedAt = new Date();
        const userData = await MastoApi.instance.getUserData();
        const trendingTags = await MastodonServer.fediverseTrendingTags();
        const trendingLinks = isDeepInspect ? (await MastodonServer.fediverseTrendingLinks()) : []; // Skip trending links
        const fetchAgeStr = ageString(startedAt);
        startedAt = new Date();

        // TODO: remove this at some point, just here for logging info about instanceof usage
        const tootObjs = toots.filter(toot => toot instanceof Toot) as Toot[];
        const numCompletedToots = tootObjs.filter(t => t.completedAt).length;
        const numRecompletingToots = tootObjs.filter(t => t.shouldComplete()).length;

        const complete = async (tootLike: TootLike) => {
            const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
            toot.completeProperties(userData, trendingLinks, trendingTags, isDeepInspect);
            return toot as Toot;
        }

        const completeToots = toots.filter(toot => toot instanceof Toot ? !toot.shouldComplete() : false);
        const tootsToComplete = toots.filter(toot => toot instanceof Toot ? toot.shouldComplete() : true);

        const newCompleteToots = await batchMap(
            tootsToComplete,
            (t) => complete(t),
            "completeToots",
            Config.batchCompleteTootsSize,
            isDeepInspect ? Config.batchCompleteTootsSleepBetweenMS : 0
        );

        toots = completeToots.concat(newCompleteToots);
        let msg = `${logPrefix} completeToots(isDeepInspect=${isDeepInspect}) on ${toots.length} toots`;
        msg += ` ${ageString(startedAt)} (data fetched ${fetchAgeStr}, ${tootObjs.length} were already toots,`;
        console.info(`${msg} ${numCompletedToots} were already completed, ${numRecompletingToots} need recompleting)`);
        return toots as Toot[];
    }

    // Remove dupes by uniquifying on the toot's URI. This is quite fast, no need for telemtry
    static dedupeToots(toots: Toot[], logPrefix?: string): Toot[] {
        logPrefix = `${bracketed(logPrefix || "dedupeToots")} dedupeToots()`;
        const tootsByURI = groupBy<Toot>(toots, toot => toot.realURI());
        // If there's the same # of URIs as toots there's nothing to dedupe
        // THIS COULD BE UNSAFE BECAUSE OF RETOOTS
        // if (Object.keys(tootsByURI).length == toots.length) return toots;

        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            // if (uriToots.length == 1) return;  // TODO: turn on this optimization

            const firstCompleted = uriToots.find(toot => !!toot.realToot().completedAt);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably wrong
            const firstTrendingLinks = uriToots.find(toot => !!toot.realToot().trendingLinks);
            const firstTrendingRankToot = uriToots.find(toot => !!toot.realToot().trendingRank); // TODO: should probably be Math.max()
            // Deal with tag arrays
            const allTrendingTags = uriToots.flatMap(toot => toot.realToot().trendingTags || []);
            const uniqueTrendingTags = uniquifyByProp(allTrendingTags, (tag) => tag.name);
            const allFollowedTags = uriToots.flatMap(toot => toot.realToot().followedTags || []);
            const uniqueFollowedTags = uniquifyByProp(allFollowedTags, (tag) => tag.name);
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(t => [t.account].concat(t.reblog ? [t.reblog.account] : []));
            const sources = uriToots.flatMap(t => (t.sources || []).concat(t.reblog?.sources || []));
            const uniqueSources = uniquify(sources);
            // Collate multiple retooters if they exist
            let reblogsBy = uriToots.flatMap(toot => toot.reblog?.reblogsBy ?? []);
            reblogsBy = uniquifyByProp(reblogsBy, (account) => account.webfingerURI);
            reblogsBy = sortObjsByProps(reblogsBy, ["displayName"], true, true);

            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = PROPS_THAT_CHANGE.reduce((props, propName) => {
                props[propName as string] = Math.max(...uriToots.map(t => (t.realToot()[propName] as number) || 0));
                return props;
            }, {} as StringNumberDict);

            const isFollowed = (webfingerURI: string) => {
                return allAccounts.some((a) => a.isFollowed && (a.webfingerURI == webfingerURI));
            }

            uriToots.forEach((toot) => {
                // Props that are only set on the realToot
                toot.realToot().favouritesCount = propsThatChange.favouritesCount;
                toot.realToot().reblogsCount = propsThatChange.reblogsCount;
                toot.realToot().repliesCount = propsThatChange.repliesCount;
                // Props set on first found
                toot.realToot().completedAt ??= firstCompleted?.completedAt;  // DON'T automatically copy to base toot - some fields may need setting later
                toot.realToot().trendingLinks ??= firstTrendingLinks?.trendingLinks;
                toot.realToot().trendingRank ??= firstTrendingRankToot?.trendingRank;
                toot.scoreInfo ??= firstScoredToot?.scoreInfo; // TODO: this is probably wrong... retoot scores could differ but should be corrected
                // Tags
                toot.realToot().trendingTags = uniqueTrendingTags;
                toot.realToot().followedTags = uniqueFollowedTags;
                // Booleans etc
                toot.account.isFollowed ||= isFollowed(toot.account.webfingerURI);
                toot.muted = uriToots.some(toot => toot.muted);
                toot.sources = uniqueSources;

                // Reblog props
                if (toot.reblog) {
                    toot.reblog.account.isFollowed ||= isFollowed(toot.reblog.account.webfingerURI);
                    toot.reblog.completedAt ??= firstCompleted?.completedAt;
                    toot.reblog.reblogsBy = reblogsBy;
                    toot.reblog.sources = uniqueSources;
                }
            });
        });

        const deduped = Object.values(tootsByURI).map((toots) => {
            const mostRecent = mostRecentToot(toots)! as Toot;

            if (uniquify(toots.map(t => t.uri))!.length > 1) {
                console.debug(`${logPrefix} deduped ${toots.length} toots to ${mostRecent.describe()}:`, toots);
            }

            return mostRecent;
        });

        logTootRemoval(logPrefix, "duplicate", toots.length - deduped.length, deduped.length);
        // console.info(`${logPrefix} deduped ${toots.length} toots to ${deduped.length} ${ageString(startedAt)}`);
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
