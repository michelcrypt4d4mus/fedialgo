/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { mastodon } from "masto";
import { E_CANCELED, Mutex } from 'async-mutex';

import ChaosFeatureScorer from "./scorer/feature/chaosFeatureScorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FavsFeatureScorer from "./scorer/feature/favsFeatureScorer";
import FollowedTagsFeatureScorer from "./scorer/feature/followed_tags_feature_scorer";
import getHomeFeed from "./feeds/homeFeed";
import getRecentTootsForTrendingTags from "./feeds/trending_tags";
import getTrendingToots from "./feeds/trending_toots";
import ImageAttachmentScorer from "./scorer/feature/ImageAttachmentScorer";
import InteractionsFeatureScorer from "./scorer/feature/InteractionsFeatureScorer";
import MastodonApiCache from "./api/mastodon_api_cache";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import Paginator from "./api/paginator";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import Storage from "./Storage";
import TrendingTootFeatureScorer from "./scorer/feature/trending_toots_feature_scorer";
import TrendingTagsFeatureScorer from "./scorer/feature/trending_tags_scorer";
import VideoAttachmentScorer from "./scorer/feature/VideoAttachmentScorer";
import {
    AccountNames,
    AlgorithmArgs,
    FeedFilterSettings,
    ScorerDict,
    StringNumberDict,
    Toot,
    TootScore,
    Weights,
} from "./types";
import {
    IMAGE,
    MEDIA_TYPES,
    createRandomString,
    dedupeToots,
    isImage
} from "./helpers";
import { buildAccountNames } from "./objects/account";
import { condensedStatus, earliestTootAt } from "./objects/toot";
import { DEFAULT_FILTERS, DEFAULT_WEIGHTS } from "./config";
import { ScorerInfo } from "./types";
import { WeightName } from "./types";

const UNKNOWN_APP = "unknown";
const TIME_DECAY = WeightName.TIME_DECAY;


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;

    // Variables with initial values
    feed: Toot[] = [];
    followedAccounts: AccountNames = {};
    feedLanguageCounts: StringNumberDict = {};
    appCounts: StringNumberDict = {};
    tagCounts: StringNumberDict = {};
    tagFilterCounts: StringNumberDict = {};  // Just tagCounts filtered for a minimum count
    scoreMutex = new Mutex();
    reloadIfOlderThanMS: number;
    // Optional callback to set the feed in the code using this package
    setFeedInApp: (f: Toot[]) => void = (f) => console.log(`Default setFeedInApp() called...`);

    fetchers = [
        getHomeFeed,
        getTrendingToots
    ];

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new ChaosFeatureScorer(),
        new FavsFeatureScorer(),
        new FollowedTagsFeatureScorer(),
        new ImageAttachmentScorer(),
        new InteractionsFeatureScorer(),
        new NumFavoritesScorer(),
        new NumRepliesScorer(),
        new NumRetootsScorer(),
        new RetootedUsersScorer(),
        new MostRepliedAccountsScorer(),
        new TrendingTootFeatureScorer(),
        new TrendingTagsFeatureScorer(),
        new VideoAttachmentScorer(),
    ];

    // These scorers require the complete feed to work properly
    feedScorers = [
        new DiversityFeedScorer(),
        new RetootsInFeedScorer(),
    ];

    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];

    scorersDict: ScorerDict = this.weightedScorers.reduce(
        (scorerInfos, scorer) => {
            scorerInfos[scorer.name] = scorer.getInfo();
            return scorerInfos;
        },
        // TimeDecay requires bespoke handling so it's not included in the loop above
        {[TIME_DECAY]: Object.assign({}, DEFAULT_WEIGHTS[TIME_DECAY])} as ScorerDict
    );

    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params: AlgorithmArgs): Promise<TheAlgorithm> {
        await Storage.setIdentity(params.user);
        await Storage.logAppOpen();

        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.filters = await Storage.getFilters();
        algo.feed = await Storage.getFeed();
        algo.followedAccounts = buildAccountNames((await Storage.getFollowedAccts()));
        algo.repairFeedAndExtractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
        this.reloadIfOlderThanMS = Storage.getConfig().reloadIfOlderThanMinutes * 60 * 1000;  // Currently unused
    }

    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(): Promise<Toot[]> {
        console.debug(`getFeed() called in fedialgo package...`);

        // Fetch toots and prepare scorers before scoring (only needs to be done once (???))
        const allResponses = await Promise.all([
            getRecentTootsForTrendingTags(this.api),
            ...this.fetchers.map(fetcher => fetcher(this.api)),
            // featureScorers return empty arrays (they're here as a parallelization hack)
            ...this.featureScorers.map(scorer => scorer.getFeature(this.api)),
        ]);

        this.feed = allResponses.flat();
        console.log(`Found ${this.feed.length} potential toots for feed. allResponses:`, allResponses);

        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = this.feed.filter((toot) => this.isValidForFeed.bind(this)(toot));
        const numRemoved = this.feed.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots of ${this.feed.length} leaving ${cleanFeed.length}`);

        this.feed = dedupeToots(cleanFeed, "getFeed");
        this.followedAccounts = await MastodonApiCache.getFollowedAccounts(this.api);
        this.repairFeedAndExtractSummaryInfo();
        return this.scoreFeed.bind(this)();
    }

    // Return the user's current weightings for each score category
    async getUserWeights(): Promise<Weights> {
        return await Storage.getWeightings();
    }

    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights: Weights): Promise<Toot[]> {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }

    // TODO: maybe this should be a copy so edits don't happen in place?
    getFilters(): FeedFilterSettings {
        return this.filters;
    }

    updateFilters(newFilters: FeedFilterSettings): Toot[] {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage.setFilters(newFilters);
        return this.filteredFeed();
    }

    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filteredFeed(): Toot[] {
        const filteredFeed = this.feed.filter(toot => this.isFiltered(toot));
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }

    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix: string = ""): void {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.debug(`${prefix}feed toots posted by application counts:`, this.appCounts);
        console.log(`${prefix}tagCounts:`, this.tagCounts);
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(condensedStatus));
    }

    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores: StringNumberDict, step = 0.001): Promise<StringNumberDict | undefined> {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);

        if (!this.filters.weightLearningEnabled) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        } else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
                            .filter((value: number) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(tootScores).length;

        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores = await this.getUserWeights()
        const userWeightTotal = Object.values(newTootScores)
                                   .filter((value: number) => !isNaN(value))
                                   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;

        for (let key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key as WeightName] / meanUserWeight);
            newTootScores[key as WeightName] = newTootScores[key as WeightName] - (step * newTootScores[key as WeightName] * reweight);  // TODO: this seems wrong?
        }

        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }

    // Compute language and application counts. Repair broken toots:
    //   - Set toot.language to English if missing.
    //   - Set media type to "image" if appropriate
    repairFeedAndExtractSummaryInfo(): void {
        this.feedLanguageCounts = this.feed.reduce((langCounts, toot) => {
            toot.language ??= Storage.getConfig().defaultLanguage;  // Default to English
            langCounts[toot.language] = (langCounts[toot.language] || 0) + 1;
            return langCounts;
        }, {} as StringNumberDict);

        this.appCounts = this.feed.reduce((counts, toot) => {
            toot.application ??= {name: UNKNOWN_APP};
            const app = toot.application?.name || UNKNOWN_APP;
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {} as StringNumberDict);

        // Check for weird media types
        this.feed.forEach(toot => {
            toot.mediaAttachments.forEach((media) => {
                if (media.type === "unknown" && isImage(media.remoteUrl)) {
                    console.warn(`Repairing broken media attachment in toot:`, toot);
                    media.type = IMAGE;
                } else if (!MEDIA_TYPES.includes(media.type)) {
                    console.warn(`Unknown media type: '${media.type}' for toot:`, toot);
                }
            });
        });

        // lowercase and count tags
        this.tagCounts = this.feed.reduce((tagCounts, toot) => {
            toot.tags.forEach(tag => {
                if (!tag.name || tag.name.length == 0) {
                    console.warn(`Broken tag found in toot:`, toot);
                    tag.name = "<<BROKEN_TAG>>";
                }

                tag.name = tag.name.toLowerCase();
                tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
            });

            return tagCounts;
        }, {} as StringNumberDict);

        this.tagFilterCounts = Object.fromEntries(
            Object.entries(this.tagCounts).filter(
               ([_key, val]) => val >= Storage.getConfig().minTootsForTagToAppearInFilter
            )
        );
    }

    // TODO: is this ever used?
    list(): Paginator {
        return new Paginator(this.feed);
    }

    // Load weightings from storage. Set defaults for any missing weightings.
    private async setDefaultWeights(): Promise<void> {
        let weightings = await Storage.getWeightings();
        let shouldSetWeights = false;

        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key as WeightName];

            if (!value && value !== 0) {
                weightings[key as WeightName] = this.scorersDict[key as WeightName].defaultWeight;
                shouldSetWeights = true;
            }
        });

        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights) await Storage.setWeightings(weightings);
    }

    // Injecting the scoreInfo property to each toot. Sort feed based on toot scores.
    private async scoreFeed(): Promise<Toot[]> {
        const logPrefix = `scoreFeed() [${createRandomString(5)}]`;
        console.debug(`${logPrefix} called in fedialgo package...`);

        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel()
            const releaseMutex = await this.scoreMutex.acquire();

            try {
                // TODO: DiversityFeedScorer mutates its state as it scores so setFeed() must be reset
                await Promise.all(this.feedScorers.map(scorer => scorer.setFeed(this.feed)));

                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of this.feed) {
                    await this.decorateWithScoreInfo(toot);
                }

                // Sort feed based on score from high to low.
                this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
                this.logFeedInfo(logPrefix);
                Storage.setFeed(this.feed);
                console.debug(`${logPrefix} call completed successfully...`);
            } finally {
                releaseMutex();
            }
        } catch (e) {
            if (e == E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            } else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }

        return this.filteredFeed();
    }

    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    private async decorateWithScoreInfo(toot: Toot): Promise<void> {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {} as StringNumberDict;
        const weightedScores = {} as StringNumberDict;

        const userWeights = await this.getUserWeights();
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));

        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        this.weightedScorers.forEach((scorer, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scorer.name] = scoreValue;
            weightedScores[scorer.name] = scoreValue * (userWeights[scorer.name] ?? 0);
            rawScore += weightedScores[scorer.name];
        });

        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingScore = rawScores[WeightName.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[WeightName.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0) rawScore *= trendingWeighting;

        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_WEIGHTS[TIME_DECAY].defaultWeight;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;

        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        } as TootScore;

        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog) toot.reblog.scoreInfo = toot.scoreInfo;
    }

    private isFiltered(toot: Toot): boolean {
        const apps = this.filters.filteredApps;
        const languages = this.filters.filteredLanguages;
        const tags = this.filters.filteredTags;
        const tootLanguage = toot.language || Storage.getConfig().defaultLanguage;

        if (languages.length > 0) {
            if (!languages.includes(tootLanguage)) {
                console.debug(`Removing toot ${toot.uri} w/invalid language ${tootLanguage}. valid langs:`, languages);
                return false;
            } else {
                console.debug(`Allowing toot with language ${tootLanguage}...`);
            }
        }

        if (tags.length > 0) {
            // Then tag checkboxes are a blacklist
            if (this.filters.suppressSelectedTags) {
                if (toot.tags.some(tag => tags.includes(tag.name))) {
                    return false;
                }
            } else if (!toot.tags.some(tag => tags.includes(tag.name))) {
                // Otherwise tag checkboxes are a whitelist
                return false;
            }
        }

        if (apps.length > 0 && !apps.includes(toot.application?.name)) {
            console.debug(`Removing toot ${toot.uri} with invalid app ${toot.application?.name}...`);
            return false;
        } else if (this.filters.onlyLinks && !(toot.card || toot.reblog?.card)) {
            return false;
        } else if (toot.reblog && !this.filters.includeReposts) {
            console.debug(`Removing reblogged toot from feed`, toot);
            return false;
        } else if (!this.filters.includeTrendingToots && toot.scoreInfo?.rawScores[WeightName.TRENDING_TOOTS]) {
            return false;
        } else if (!this.filters.includeTrendingHashTags && toot.trendingTags?.length) {
            return false;
        } else if (!this.filters.includeFollowedAccounts && (toot.account.acct in this.followedAccounts)) {
            return false;
        } else if (!this.filters.includeReplies && toot.inReplyToId) {
            return false;
        } else if (!this.filters.includeFollowedHashtags && toot.followedTags?.length) {
            return false;
        }

        return true;
    }

    private isValidForFeed(toot: Toot): boolean {
        if (toot == undefined) return false;
        if (toot?.reblog?.muted || toot?.muted) return false;  // Remove muted accounts and toots

        // Remove things the user has already retooted
        if (toot?.reblog?.reblogged) {
            return false;
        }
        // Remove the user's own toots
        if (toot.account.username == this.user.username && toot.account.id == this.user.id) {
            return false;
        }

        // Sometimes there are wonky statuses that are like years in the future so we filter them out.
        if (Date.now() < (new Date(toot.createdAt)).getTime()) {
            console.warn(`Removed toot with future timestamp: `, toot);
            return false;
        }

        // The user can configure suppression filters through a Mastodon GUI (webapp or whatever)
        if (toot.filtered && toot.filtered.length > 0) {
            const filterMatch = toot.filtered[0];
            console.debug(`Removed toot matching filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
            return false;
        }

        return true;
    };

    private shouldReloadFeed(): boolean {
        const mostRecentTootAt = earliestTootAt(this.feed);
        if (!mostRecentTootAt) return true;
        return ((Date.now() - mostRecentTootAt.getTime()) > this.reloadIfOlderThanMS);
    }
};


export {
    TIME_DECAY,
    FeedFilterSettings,
    ScorerInfo,
    StringNumberDict,
    TheAlgorithm,
    Toot,
    Weights,
};
