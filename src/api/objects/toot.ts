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
import { ageInHours, ageInMinutes, ageString, timelineCutoffAt, toISOFormat } from "../../helpers/time_helpers";
import { batchMap, filterWithLog, groupBy, sortObjsByProps, split, sumArray, uniquify, uniquifyByProp } from "../../helpers/collection_helpers";
import { config } from "../../config";
import { FILTERABLE_SCORES } from "../../filters/numeric_filter";
import { FOREIGN_SCRIPTS, LANGUAGE_CODES, detectLanguage } from "../../helpers/language_helper";
import { logTootRemoval, traceLog } from '../../helpers/log_helpers';
import { repairTag } from "./tag";
import { TypeFilterName } from "../../filters/boolean_filter";
import {
    DEFAULT_FONT_SIZE,
    MEDIA_TYPES,
    VIDEO_TYPES,
    bracketed,
    collapseWhitespace,
    extractDomain,
    htmlToParagraphs,
    htmlToText,
    isImage,
    isVideo,
    removeEmojis,
    removeLinks,
    removeMentions,
    removeTags,
    replaceEmojiShortcodesWithImageTags,
    replaceHttpsLinks,
    wordRegex,
} from "../../helpers/string_helpers";
import {
    AccountLike,
    FeedFilterSettings,
    KeysOfValueType,
    MastodonTag,
    MediaCategory,
    ScoreName,
    StatusList,
    TagWithUsageCounts,
    TootLike,
    TootScore,
    TrendingLink,
    WeightedScore,
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


// Extension of mastodon.v1.Status data object with additional properties used by fedialgo
export interface SerializableToot extends mastodon.v1.Status {
    completedAt?: string;                    // Timestamp a full deep inspection of the toot was completed
    followedTags?: MastodonTag[];            // Array of tags that the user follows that exist in this toot
    numTimesShown?: number;                  // Managed in client app. # of times the Toot has been shown to the user.
    participatedTags?: TagWithUsageCounts[]; // Tags that the user has participated in that exist in this toot
    reblog?: SerializableToot | null,        // The toot that was retooted (if any)
    reblogsBy?: AccountLike[];               // The accounts that retooted this toot (if any)
    resolvedID?: string;                     // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                   // Scoring info for weighting/sorting this toot
    sources?: string[];                      // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];          // Links that are trending in this toot
    trendingRank?: number;                   // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TagWithUsageCounts[];     // Tags that are trending in this toot
    audioAttachments?: mastodon.v1.MediaAttachment[];
    imageAttachments?: mastodon.v1.MediaAttachment[];
    videoAttachments?: mastodon.v1.MediaAttachment[];
};

interface TootObj extends SerializableToot {
    ageInHours: () => number;
    attachmentType: () => MediaCategory | undefined;
    containsString: (str: string) => boolean;
    containsTag: (tag: TagWithUsageCounts, fullScan?: boolean) => boolean;
    containsTagsMsg: () => string | undefined;
    contentNonTagsParagraphs: (fontSize?: number) => string;
    contentParagraphs: (fontSize?: number) => string[];
    contentShortened: (maxChars?: number) => string;
    contentTagsParagraph: () => string | undefined;
    contentWithEmojis: (fontSize?: number) => string;
    describe: () => string;
    getScore: () => number;
    homeserverURL: () => Promise<string>;
    isDM: () => boolean;
    isFollowed: () => boolean;
    isInTimeline: (filters: FeedFilterSettings) => boolean;
    isPrivate: () => boolean;
    isTrending: () => boolean;
    isValidForFeed: (serverSideFilters: mastodon.v2.Filter[]) => boolean;
    popularity: () => number;
    realAccount: () => Account;
    realToot: () => Toot;
    realURI: () => string;
    resolve: () => Promise<Toot>;
    resolveID: () => Promise<string>;
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
    numTimesShown?: number;
    completedAt?: string;
    followedTags?: mastodon.v1.Tag[];            // Array of tags that the user follows that exist in this toot
    participatedTags?: TagWithUsageCounts[];     // Array of tags that the user has participated in that exist in this toot
    @Type(() => Account) reblogsBy!: Account[];  // The accounts that retooted this toot
    resolvedID?: string;                         // This Toot with URLs resolved to homeserver versions
    scoreInfo?: TootScore;                       // Scoring info for weighting/sorting this toot
    sources?: string[];                          // Source of the toot (e.g. trending tag toots, home timeline, etc.)
    trendingLinks?: TrendingLink[];              // Links that are trending in this toot
    trendingRank?: number;                       // Most trending on a server gets a 10, next is a 9, etc.
    trendingTags?: TagWithUsageCounts[];         // Tags that are trending that appear in this toot
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
        tootObj.numTimesShown = toot.numTimesShown || 0;
        tootObj.completedAt = toot.completedAt;
        tootObj.followedTags = toot.followedTags;
        tootObj.reblog = toot.reblog ? Toot.build(toot.reblog) : undefined;
        // TODO: the reblogsBy don't necessarily have the isFollowed flag set correctly
        tootObj.reblogsBy = (toot.reblogsBy ?? []).map(account => Account.build(account));
        tootObj.resolvedID = toot.resolvedID;
        tootObj.scoreInfo = toot.scoreInfo;
        tootObj.sources = toot.sources;
        tootObj.trendingLinks = toot.trendingLinks;
        tootObj.trendingRank = toot.trendingRank;
        tootObj.trendingTags = toot.trendingTags;

        tootObj.repair();
        // These must be set after repair() has a chance to fix any broken media types
        tootObj.audioAttachments = tootObj.attachmentsOfType(MediaCategory.AUDIO);
        tootObj.imageAttachments = tootObj.attachmentsOfType(MediaCategory.IMAGE);
        tootObj.videoAttachments = VIDEO_TYPES.flatMap((videoType) => tootObj.attachmentsOfType(videoType));

        if (tootObj.account.suspended) {
            console.warn(`Toot from suspended account:`, tootObj);
        } else if (tootObj.account.limited) {
            traceLog(`Toot from limited account:`, tootObj);
        }

        return tootObj;
    }

    // Time since this toot was sent in hours
    ageInHours(): number {
        return ageInHours(this.tootedAt());
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

    // True if toot contains 'str' in the tags, the content, or the link preview card description
    containsString(str: string): boolean {
        return wordRegex(str).test(this.contentWithCard());
    }

    // Return true if the toot contains the tag or hashtag. If fullScan is true uses containsString() to search
    containsTag(tag: TagWithUsageCounts, fullScan?: boolean): boolean {
        if (fullScan && (tag.name.length > 1) && !(TAG_ONLY_STRINGS.has(tag.name))) {
            if (!tag.regex) {
                console.warn(`containsTag() called on tag without regex:`, tag);
                tag.regex = wordRegex(tag.name);
            }

            return tag.regex.test(this.contentWithCard());
        } else {
            return this.tags.some((t) => t.name == tag.name);
        }
    }

    // Generate a string describing the followed and trending tags in the toot
    containsTagsMsg(): string | undefined {
        let msgs = [
            this.containsTagsOfTypeMsg(TypeFilterName.FOLLOWED_HASHTAGS),
            this.containsTagsOfTypeMsg(TypeFilterName.TRENDING_HASHTAGS),
            this.containsTagsOfTypeMsg(TypeFilterName.PARTICIPATED_HASHTAGS),
        ];

        msgs = msgs.filter((msg) => msg);
        return msgs.length ? `Contains ${msgs.join("; ")}` : undefined;
    }

    // Returns true if the fedialgo user is mentioned in the toot
    containsUserMention(): boolean {
        return this.mentions.some((mention) => mention.acct == MastoApi.instance.user.webfingerURI);
    }

    // Return all but the last paragraph if that last paragraph is just hashtag links
    contentNonTagsParagraphs(fontSize: number = DEFAULT_FONT_SIZE): string {
        const paragraphs = this.contentParagraphs(fontSize);
        if (this.contentTagsParagraph()) paragraphs.pop();  // Remove the last paragraph if it's just hashtags
        return paragraphs.join("\n");
    }

    // Break up the content into paragraphs and add <img> tags for custom emojis
    contentParagraphs(fontSize: number = DEFAULT_FONT_SIZE): string[] {
        return htmlToParagraphs(this.contentWithEmojis(fontSize));
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

    // If the final <p> paragraph of the content is just hashtags, return it
    contentTagsParagraph(): string | undefined {
        const finalParagraph = this.contentParagraphs().slice(-1)[0];

        if (HASHTAG_PARAGRAPH_REGEX.test(finalParagraph)) {
            return finalParagraph;
        }
    }

    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags
    contentWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        return this.addEmojiHtmlTags(this.content, fontSize);
    }

    // String that describes the toot in not so many characters
    describe(): string {
        let msg = `${this.account.describe()} [${toISOFormat(this.createdAt)}, ID="${this.id}"]`;
        return `${msg}: "${this.contentShortened()}"`;
    }

   // Mastodon calls this a "context" but it's really a conversation
    async getConversation(): Promise<Toot[]> {
        const logPrefix = bracketed('getConversation()');
        console.log(`${logPrefix} Fetching conversation for toot:`, this.describe());
        const startTime = new Date();
        const context = await MastoApi.instance.api.v1.statuses.$select(await this.resolveID()).context.fetch();
        const toots = await Toot.buildToots([...context.ancestors, this, ...context.descendants], logPrefix, true);
        traceLog(`${logPrefix} Fetched ${toots.length} toots ${ageString(startTime)}`, toots.map(t => t.describe()));
        return toots;
    }

    getIndividualScore(scoreType: keyof WeightedScore, name: ScoreName): number {
        if (this.scoreInfo?.scores) {
            return this.scoreInfo.scores[name][scoreType];
        } else {
            console.warn(`getIndividualScore() called on toot but no scoreInfo.scores:`, this);
            return 0;
        }
    }

    getScore(): number {
        return this.scoreInfo?.score || 0;
    }

    // Make an API call to get this toot's URL on the home server instead of on the toot's original server, e.g.
    //          this: https://fosstodon.org/@kate/114360290341300577
    //       becomes: https://universeodon.com/@kate@fosstodon.org/114360290578867339
    async homeserverURL(): Promise<string> {
        const homeURL = `${this.account.homserverURL()}/${await this.resolveID()}`;
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
        let isOK = Object.values(filters.booleanFilters).every((section) => section.isAllowed(this));
        return isOK && Object.values(filters.numericFilters).every((filter) => filter.isAllowed(this));
    }

    // Return true if it's for followers only
    isPrivate(): boolean {
        return this.visibility === TootVisibility.PRIVATE;
    }

    // Return true if it's a trending toot or contains any trending hashtags or links
    isTrending(): boolean {
        return !!(this.trendingRank || this.trendingLinks?.length || this.trendingTags?.length);
    }

    // Return false if Toot should be discarded from feed altogether and permanently
    // Note that this is very different from being temporarily filtered out of the visible feed
    isValidForFeed(serverSideFilters: mastodon.v2.Filter[]): boolean {
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
        } else if (this.filtered?.length || this.reblog?.filtered?.length) {
            // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
            const filterMatches = (this.filtered || []).concat(this.reblog?.filtered || []);
            const filterMatchStr = filterMatches[0].keywordMatches?.join(' ');
            traceLog(`Removing toot matching server filter (${filterMatchStr}): ${this.describe()}`);
            return false;
        } else if (this.tootedAt() < timelineCutoffAt()) {
            traceLog(`Removing toot older than ${timelineCutoffAt()}:`, this.tootedAt());
            return false;
        }

        // Return false if toot matches any server side filters
        return !serverSideFilters.some((filter) => (
            filter.keywords.some((keyword) => {
                if (this.realToot().containsString(keyword.keyword)) {
                    traceLog(`Removing toot matching manual server side filter (${this.describe()}):`, filter);
                    return true;
                }
            })
        ));
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
        try {
            return await MastoApi.instance.resolveToot(this);
        } catch (error) {
            console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
            return this;
        }
    }

    // Get Status obj for toot from user's home server so the property URLs point to the home sever.
    async resolveID(): Promise<string> {
        if (!this.resolvedID) {
            try {
                this.resolvedID = (await MastoApi.instance.resolveToot(this)).id;
            } catch (error) {
                console.warn(`Error resolving a toot:`, error, `\nThis was the toot:`, this);
                return this.id;
            }
        }

        return this.resolvedID;
    }


    // TODO: this maybe needs to take into consideration reblogsBy??
    tootedAt(): Date {
        return new Date(this.createdAt);
    }

    //////////////////////////////
    //     Private methods      //
    //////////////////////////////

    // Replace custome emoji shortcodes (e.g. ":myemoji:") with image tags in a string
    private addEmojiHtmlTags(str: string, fontSize: number = DEFAULT_FONT_SIZE): string {
        const emojis = (this.emojis || []).concat(this.account.emojis || []);
        return replaceEmojiShortcodesWithImageTags(str, emojis, fontSize);
    }

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
        // TODO: We handle muted and followed before checking if complete so we can refresh mutes & follows
        this.muted ||= (this.realAccount().webfingerURI in userData.mutedAccounts);
        this.account.isFollowed ||= (this.account.webfingerURI in userData.followedAccounts);

        if (this.reblog) {
            this.reblog.account.isFollowed ||= (this.reblog.account.webfingerURI in userData.followedAccounts);
        }

        if (this.isComplete()) return;
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
            toot.trendingLinks = trendingLinks.filter(link => link.regex!.test(this.contentWithCard()));
            this.completedAt = toot.completedAt = new Date().toISOString(); // Multiple assignmnet!
        } else {
            toot.trendingLinks ||= [];  // Very slow to calculate so skip it unless isDeepInspect is true
        }
    }

    // Generate a string describing the followed and trending tags in the toot
    private containsTagsOfTypeMsg(tagType: TypeFilterName): string | undefined {
        let tags: MastodonTag[] = [];

        if (tagType == TypeFilterName.FOLLOWED_HASHTAGS) {
            tags = this.followedTags || [];
        } else if (tagType == TypeFilterName.PARTICIPATED_HASHTAGS) {
            tags = this.participatedTags || [];
        } else if (tagType == TypeFilterName.TRENDING_HASHTAGS) {
            tags = this.trendingTags || [];
        } else {
            console.warn(`Toot.containsTagsMsg() called with invalid tagType: ${tagType}`);
            return;
        }

        if (!tags.length) return;
        const tagTypeStr = capitalCase(tagType).replace(/ Tag/, " Hashtag");
        return `${tagTypeStr}: ${tags.map(t => `#${t.name}`).join(", ")}`;
    }

     // Return the toot's 'content' field stripped of HTML tags and emojis
    private contentString(): string {
        return htmlToText(this.realToot().contentWithEmojis());
    }

    // Return the toot's content + link description stripped of everything (links, mentions, tags, etc.)
    private contentStripped(): string {
        return collapseWhitespace(removeMentions(removeEmojis(removeTags(removeLinks(this.contentWithCard())))));
    }

    // Return the content with the card title and description added in parentheses
    private contentWithCard(): string {
        const cardContent = [this.card?.title || "", this.card?.description || ""].join(" ").trim();
        return (this.contentString() + (cardContent.length ? ` (${htmlToText(cardContent)})` : "")).trim();
    }

    // Figure out an appropriate language for the toot based on the content.
    private determineLanguage(): void {
        const text = this.contentStripped();

        if (text.length < MIN_CHARS_FOR_LANG_DETECT) {
            this.language ??= config.locale.defaultLanguage;
            return;
        }

        const langDetectInfo = detectLanguage(text);
        const { chosenLanguage, langDetector, tinyLD } = langDetectInfo;
        const langLogObj = {...langDetectInfo, text, toot: this, tootLanguage: this.language};
        const logTrace = (msg: string) => traceLog(`${REPAIR_TOOT} ${msg} for "${text}"`, langLogObj);

        // If there's nothing detected log a warning (if text is long enough) and set language to default
        if ((tinyLD.languageAccuracies.length + langDetector.languageAccuracies.length) == 0) {
            if (text.length > (MIN_CHARS_FOR_LANG_DETECT * 2)) {
                console.warn(`${REPAIR_TOOT} no language detected`, langLogObj);
            }

            this.language ??= config.locale.defaultLanguage;
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
            } else if (this.language && this.language != UNKNOWN) {
                logTrace(`Using chosenLanguage "${chosenLanguage}" to replace "${this.language}"`);
            }

            this.language = chosenLanguage;
            return;
        }

        if (FOREIGN_SCRIPTS.has(tinyLD.chosenLang) && this.language?.startsWith(tinyLD.chosenLang!)) {
            logTrace(`Using existing foreign lang "${this.language}" even with low accuracy`);
            return;
        }

        // Prioritize English in edge cases with low tinyLD accuracy but "en" either in toot or in LangDetector result
        if (!tinyLD.isAccurate && langDetector.isAccurate && langDetector.chosenLang == LANGUAGE_CODES.english) {
            logTrace(`Accepting "en" from langDetector.detectedLang`);
            this.language = LANGUAGE_CODES.english;
            return;
        }

        if (this.language) {
            if (text.length > (2 * MIN_CHARS_FOR_LANG_DETECT)) {
                logTrace(`No guess good enough to override language "${this.language}" for "${text}"`);
            }
        } else {
            logTrace(`Defaulting language prop to "en"`);
            this.language ??= config.locale.defaultLanguage;
        }
    }

   // Returns true if the toot should be re-completed
    private isComplete(): boolean {
        if (!this.completedAt) return false;  // If we haven't completed it yet, do it now

        // If we have completed it, check if we need to re-evaluate for newer trending tags, links, etc.
        return (
               // Check if toot was completed long enough ago that we might want to re-evaluate it
               ageInMinutes(this.completedAt) < config.minTrendingMinutesUntilStale()
               // But not tooted so long ago that there's little chance of new data
            || ageInMinutes(this.createdAt) > config.toots.completeAfterMinutes
        );
    }

    // Returns true if this toot is by the fedialgo user
    private isUsersOwnToot(): boolean {
        const fedialgoUserWebfingerURI = MastoApi.instance.user.webfingerURI;
        if (this.account.webfingerURI == fedialgoUserWebfingerURI) return true;
        if (this.reblog && this.reblog.account.webfingerURI == fedialgoUserWebfingerURI) return true;
        return false;
    }

    // Repair toot properties:
    //   - Set toot.application.name to UNKNOWN if missing
    //   - Call determineLanguage() to set the language
    //   - Lowercase all tags
    //   - Repair mediaAttachment types if reparable based on URL file extension
    //   - Repair StatusMention objects for users on home server
    private repair(): void {
        this.application ??= {name: UNKNOWN};
        this.application.name ??= UNKNOWN;
        this.tags.forEach(repairTag);  // Repair Tags
        this.determineLanguage();      // Determine language

        if (this.reblog) {
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
                    console.debug(`${REPAIR_TOOT} Repairing broken image attachment in toot:`, this);
                    media.type = MediaCategory.IMAGE;
                } else if (isVideo(media.remoteUrl)) {
                    console.debug(`${REPAIR_TOOT} Repairing broken video attachment in toot:`, this);
                    media.type = MediaCategory.VIDEO;
                } else if (this.uri?.includes(BLUESKY_BRIDGY) && media.previewUrl?.endsWith("/small") && !media.previewRemoteUrl) {
                    console.debug(`${REPAIR_TOOT} Repairing broken bluesky bridge image attachment in toot:`, this);
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

    ///////////////////////////////
    //       Class methods       //
    ///////////////////////////////

    // Build array of new Toot objects from an array of Status objects (or Toots).
    // Toots returned by this method should have most of their properties set correctly.
    static async buildToots(
        statuses: TootLike[],
        source: string,
        skipSort?: boolean
    ): Promise<Toot[]> {
        if (statuses.length == 0) return [];  // Avoid the data fetching if we don't to build anything
        const logPrefix = `${bracketed(source)} buildToots()`;
        const startedAt = new Date();

        // NOTE: this calls completeToots() with isDeepInspect = false. You must later call it with true
        // to get the full set of properties set on the Toots.
        let toots = await this.completeToots(statuses, logPrefix, false);
        toots = await this.removeInvalidToots(toots, logPrefix);
        toots.forEach((toot) => toot.sources = [source]);
        toots = Toot.dedupeToots(toots, logPrefix);
        // Make a first pass at scoring with whatever scorers are ready to score
        await Scorer.scoreToots(toots, false);
        // TODO: Toots are sorted by early score so callers can truncate unpopular toots but seems wrong place for it
        if (!skipSort) toots.sort((a, b) => b.getScore() - a.getScore());
        traceLog(`${logPrefix} ${toots.length} toots built in ${ageString(startedAt)}`);
        return toots;
    }

    // Fetch all the data we need to set dependent properties and set them on the toots.
    static async completeToots(toots: TootLike[], logPrefix: string, isDeepInspect: boolean): Promise<Toot[]> {
        let startedAt = new Date();
        const userData = await MastoApi.instance.getUserData();
        const trendingTags = await MastodonServer.fediverseTrendingTags();
        const trendingLinks = isDeepInspect ? (await MastodonServer.fediverseTrendingLinks()) : []; // Skip trending links
        startedAt = new Date();
        let tootsToComplete = toots;
        let completeToots: TootLike[] = [];

        // If isDeepInspect separate toots that need completing bc it's slow to rely on shouldComplete() + batching
        if (isDeepInspect) {
            [completeToots, tootsToComplete] = (split(toots, (t) => t instanceof Toot && t.isComplete()));
        }

        const newCompleteToots: Toot[] = await batchMap(
            tootsToComplete,
            async (tootLike: TootLike) => {
                const toot = (tootLike instanceof Toot ? tootLike : Toot.build(tootLike));
                toot.completeProperties(userData, trendingLinks, trendingTags, isDeepInspect);
                return toot as Toot;
            },
            "completeToots",
            config.toots.batchCompleteSize,
            isDeepInspect ? config.toots.batchCompleteSleepBetweenMS : 0
        );

        let msg = `${logPrefix} completeToots(isDeepInspect=${isDeepInspect}) ${toots.length} toots ${ageString(startedAt)}`;
        console.debug(`${msg} (${newCompleteToots.length} completed, ${completeToots.length} skipped)`);
        return newCompleteToots.concat(completeToots as Toot[]);
    }

    // Remove dupes by uniquifying on the toot's URI. This is quite fast, no need for telemtry
    static dedupeToots(toots: Toot[], logPrefix?: string): Toot[] {
        logPrefix = `${bracketed(logPrefix || "dedupeToots")} dedupeToots()`;
        const tootsByURI = groupBy<Toot>(toots, toot => toot.realURI());

        // Collect the properties of a single Toot from all the instances of the same URI (we can
        // encounter the same Toot both in the user's feed as well as in a Trending toot list).
        Object.values(tootsByURI).forEach((uriToots) => {
            if (uriToots.length == 1) return;  // If there's only one toot, nothing to do

            const firstCompleted = uriToots.find(toot => !!toot.realToot().completedAt);
            const firstScoredToot = uriToots.find(toot => !!toot.scoreInfo); // TODO: this is probably wrong
            const firstTrendingLinks = uriToots.find(toot => !!toot.realToot().trendingLinks);
            const firstTrendingRankToot = uriToots.find(toot => !!toot.realToot().trendingRank); // TODO: should probably use most recent toot
            // Deal with tag and filter arrays
            const uniqFiltered = this.uniqFlatMap<mastodon.v1.FilterResult>(uriToots, "filtered", (f) => f.filter.id);
            const uniqFollowedTags = this.uniqFlatMap<mastodon.v1.Tag>(uriToots, "followedTags", (t) => t.name);
            const uniqTrendingTags = this.uniqFlatMap<TagWithUsageCounts>(uriToots, "trendingTags", (t) => t.name);
            const uniqSources = this.uniqFlatMap<string>(uriToots, "sources", (source) => source);
            // Collate multiple retooters if they exist
            let reblogsBy = this.uniqFlatMap<Account>(uriToots, "reblogsBy", (account) => account.webfingerURI);
            reblogsBy = sortObjsByProps(reblogsBy, ["displayName"], true, true);
            // Collate accounts - reblogs and realToot accounts
            const allAccounts = uriToots.flatMap(t => [t.account].concat(t.reblog ? [t.reblog.account] : []));
            // Helper method to collate the isFollowed property for the accounts
            const isFollowed = (uri: string) => allAccounts.some((a) => a.isFollowed && (a.webfingerURI == uri));

            // Counts may increase over time w/repeated fetches so we collate the max
            const propsThatChange = FILTERABLE_SCORES.reduce((propValues, propName) => {
                propValues[propName] = Math.max(...uriToots.map(t => t.realToot()[propName] || 0));
                return propValues;
            }, {} as Record<KeysOfValueType<Toot, number>, number>);

            uriToots.forEach((toot) => {
                // propsThatChange are only set on the realToot
                toot.realToot().favouritesCount = propsThatChange.favouritesCount;
                toot.realToot().reblogsCount = propsThatChange.reblogsCount;
                toot.realToot().repliesCount = propsThatChange.repliesCount;
                // Props set on first found
                toot.realToot().completedAt ??= firstCompleted?.completedAt;  // DON'T automatically copy to base toot - some fields may need setting later
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
                toot.muted = uriToots.some(toot => toot.muted);  // Liberally set muted on retoots and real toots
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
            const mostRecent = mostRecentToot(toots)! as Toot;

            // Log when we are collating retoots and toots with the same realURI()
            if (uniquify(toots.map(t => t.uri))!.length > 1) {
                traceLog(`${logPrefix} deduped ${toots.length} toots to ${mostRecent.describe()}:`, toots);
            }

            return mostRecent;
        });

        logTootRemoval(logPrefix, "duplicate", toots.length - deduped.length, deduped.length);
        return deduped;
    }

    // Extract a minimum ID from a set of toots that will be appropriate to use as the maxId param
    // for a call to the mastodon API to get the next page of toots.
    // Unfortunately sometimes the mastodon API returns toots that occurred like 100 years into the past
    // or future so we use the MAX_ID_IDX toot when sorted by createdAt to get the min ID.
    static findMinIdForMaxIdParam(toots: Toot[]): string | null {
        if (toots.length == 0) return null;
        const idx = Math.min(toots.length - 1, MAX_ID_IDX);
        return sortByCreatedAt(toots)[idx].id;
    }

    static async removeInvalidToots(toots: Toot[], logPrefix: string): Promise<Toot[]> {
        const serverSideFilters = (await MastoApi.instance.getServerSideFilters()) || [];
        return filterWithLog(toots, t => t.isValidForFeed(serverSideFilters), logPrefix, 'invalid', 'Toot');
    }

    // Return a new array of a toot property collected and uniquified from an array of toots
    // e.g. with two toots having {sources: ["a", "b"]} and {sources: ["b", "c"]} we get ["a", "b", "c"]
    private static uniqFlatMap<T>(
        toots: Toot[],
        property: KeysOfValueType<Toot, any[] | undefined>,
        uniqFxn: (elem: T) => string
    ): T[] {
        const mappedReblogs = toots.flatMap(toot => (toot.reblog?.[property] as T[] | undefined) ?? []);
        const mapped = (toots.flatMap(toot => (toot[property] as T[] | undefined) ?? [])).concat(mappedReblogs);
        return uniquifyByProp(mapped, uniqFxn);
    }
};


// Methods for dealing with toot timestamps
export const tootedAt = (toot: TootLike): Date => new Date(toot.createdAt);
export const earliestToot = (toots: StatusList): TootLike | null => sortByCreatedAt(toots)[0];
export const mostRecentToot = (toots: StatusList): TootLike | null => sortByCreatedAt(toots).slice(-1)[0];

// Returns array with oldest toot first
export function sortByCreatedAt<T extends StatusList>(toots: T): T {
    return toots.toSorted((a, b) => (a.createdAt < b.createdAt) ? -1 : 1) as T;
};

export const earliestTootedAt = (toots: StatusList): Date | null => {
    const earliest = earliestToot(toots);
    return earliest ? tootedAt(earliest) : null;
};

export const mostRecentTootedAt = (toots: StatusList): Date | null => {
    const newest = mostRecentToot(toots);
    return newest ? tootedAt(newest) : null;
};
