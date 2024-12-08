/*
 * Main class that handles scoring and sorting a feed made of Toot objects.
 */
import { mastodon } from "masto";
import { E_CANCELED, Mutex } from 'async-mutex';

import ChaosScorer from "./scorer/feature/chaos_scorer";
import DiversityFeedScorer from "./scorer/feed/diversity_feed_scorer";
import FollowedTagsFeatureScorer from "./scorer/feature/followed_tags_feature_scorer";
import ImageAttachmentScorer from "./scorer/feature/image_attachment_scorer";
import InteractionsScorer from "./scorer/feature/interactions_scorer";
import MostFavoritedAccountsScorer from "./scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "./scorer/feature/most_replied_accounts_scorer";
import NumericFilter from "./objects/numeric_filter";
import NumFavoritesScorer from "./scorer/feature/num_favorites_scorer";
import NumRepliesScorer from "./scorer/feature/num_replies_scorer";
import NumRetootsScorer from "./scorer/feature/num_retoots_scorer";
import Paginator from "./api/paginator";
import PropertyFilter, { SOURCE_FILTERS, PropertyName, SourceFilterName } from "./objects/property_filter";
import RetootedUsersScorer from "./scorer/feature/retooted_users_scorer";
import RetootsInFeedScorer from "./scorer/feed/retoots_in_feed_scorer";
import Scorer from "./scorer/scorer";
import Storage from "./Storage";
import TrendingTagsFeatureScorer from "./scorer/feature/trending_tags_scorer";
import TrendingTootFeatureScorer from "./scorer/feature/trending_toots_feature_scorer";
import VideoAttachmentScorer from "./scorer/feature/video_attachment_scorer";
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
import { buildAccountNames } from "./objects/account";
import { condensedStatus, containsString, describeToot, earliestTootAt, sortByCreatedAt } from "./objects/toot";
import { DEFAULT_FILTERS, DEFAULT_WEIGHTS } from "./config";
import { IMAGE, MEDIA_TYPES, createRandomString, dedupeToots, isImage } from "./helpers";
import { MastoApi } from "./api/api";
import { ScorerInfo } from "./types";
import { WeightName } from "./types";

const TIME_DECAY = WeightName.TIME_DECAY;
const BROKEN_TAG = "<<BROKEN_TAG>>"
const UNKNOWN_APP = "unknown";


class TheAlgorithm {
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    filters: FeedFilterSettings;
    mastoApi: MastoApi;

    // Variables with initial values
    feed: Toot[] = [];
    serverSideFilters: mastodon.v2.Filter[] = [];
    followedAccounts: AccountNames = {};
    followedTags: StringNumberDict = {};
    scoreMutex = new Mutex();
    reloadIfOlderThanMS: number;
    // Optional callback to set the feed in the code using this package
    setFeedInApp: (f: Toot[]) => void = (f) => console.debug(`Default setFeedInApp() called...`);

    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new ChaosScorer(),
        new MostFavoritedAccountsScorer(),
        new FollowedTagsFeatureScorer(),
        new ImageAttachmentScorer(),
        new InteractionsScorer(),
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
        // algo.serverSideFilters = await Storage.getServerSideFilters();
        algo.repairFeedAndExtractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }

    private constructor(params: AlgorithmArgs) {
        this.api = params.api;
        this.mastoApi = new MastoApi(this.api);
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
        this.reloadIfOlderThanMS = Storage.getConfig().reloadIfOlderThanMinutes * 60 * 1000;  // Currently unused
    }

    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed(numTimelineToots?: number, maxId?: string): Promise<Toot[]> {
        console.debug(`[fedialgo] getFeed() called (numTimelineToots=${numTimelineToots}, maxId=${maxId})`);
        numTimelineToots = numTimelineToots || Storage.getConfig().numTootsInFirstFetch;
        let allResponses: any[] = [];

        if (!maxId) {
            allResponses = await Promise.all([
                this.mastoApi.getFeed(numTimelineToots, maxId),
                this.mastoApi.getStartupData(),
                ...this.featureScorers.map(scorer => scorer.getFeature(this.api)),
            ]);
        } else {
            allResponses = await Promise.all([
                this.mastoApi.getFeed(numTimelineToots, maxId),
            ]);
        }

        console.log(`getFeed() allResponses:`, allResponses);
        const { homeToots, otherToots } = allResponses.shift();
        const newToots = [...homeToots,...otherToots];
        console.log(`getFeed() got ${homeToots.length} newToots, ${otherToots.length} other toots`);

        if (allResponses.length > 0) {
            const userData = allResponses.shift();
            this.followedAccounts = userData.followedAccounts;
            this.followedTags = userData.followedTags;
            this.serverSideFilters = userData.serverSideFilters;
        }

        this.logTootCounts(newToots, homeToots)
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanNewToots = newToots.filter((toot) => this.isValidForFeed.bind(this)(toot));
        const numRemoved = newToots.length - cleanNewToots.length;
        console.log(`Removed ${numRemoved} invalid toots of ${newToots.length} leaving ${cleanNewToots.length}`);

        const cleanFeed = dedupeToots([...this.feed, ...cleanNewToots], "getFeed");
        this.feed = cleanFeed.slice(0, Storage.getConfig().maxNumCachedToots);

        this.repairFeedAndExtractSummaryInfo();
        this.maybeGetMoreToots(homeToots, numTimelineToots);
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
        const filteredFeed = this.feed.filter(toot => this.isInTimeline(toot));
        console.log(`filteredFeed() found ${filteredFeed.length} valid toots of ${this.feed.length}...`);
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }

    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix: string = ""): void {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(condensedStatus));
        console.log(`${prefix}timeline toots filters, including counts:`, this.filters);
    }

    // Compute language and application counts. Repair broken toots and populate extra data:
    //   - Set isFollowed flag
    //   - Set toot.language to defaultLanguage if missing
    //   - Set media type to "image" if unknown and reparable
    repairFeedAndExtractSummaryInfo(): void {
        const appCounts: StringNumberDict = {};
        const languageCounts: StringNumberDict = {};
        const sourceCounts: StringNumberDict = {};
        const tagCounts: StringNumberDict = {};
        const userCounts: StringNumberDict = {};
        const serverSideFilterCounts: StringNumberDict = {};

        this.feed.forEach(toot => {
            // Decorate / repair toot data
            toot.application ??= {name: UNKNOWN_APP};
            toot.application.name ??= UNKNOWN_APP;
            toot.language ??= Storage.getConfig().defaultLanguage;
            toot.isFollowed = toot.account.acct in this.followedAccounts;

            // Check for weird media types
            toot.mediaAttachments.forEach((media) => {
                if (media.type === "unknown" && isImage(media.remoteUrl)) {
                    console.warn(`Repairing broken media attachment in toot:`, toot);
                    media.type = IMAGE;
                } else if (!MEDIA_TYPES.includes(media.type)) {
                    console.warn(`Unknown media type: '${media.type}' for toot:`, toot);
                }
            });

            // Lowercase and count tags
            toot.tags.forEach(tag => {
                tag.name = (tag.name?.length > 0) ? tag.name.toLowerCase() : BROKEN_TAG;
                tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
            });

            // Must happen after tags are lowercased and before source counts are aggregated
            toot.followedTags = toot.tags.filter((tag) => tag.name in this.followedTags);
            languageCounts[toot.language] = (languageCounts[toot.language] || 0) + 1;
            appCounts[toot.application.name] = (appCounts[toot.application.name] || 0) + 1;
            userCounts[toot.account.acct] = (userCounts[toot.account.acct] || 0) + 1;

            // Aggregate source counts
            Object.entries(SOURCE_FILTERS).forEach(([sourceName, sourceFilter]) => {
                if (sourceFilter(toot)) {
                    sourceCounts[sourceName] ??= 0;
                    sourceCounts[sourceName] += 1;
                }
            });

            // Aggregate server-side filter counts
            this.serverSideFilters.forEach((filter) => {
                // before 4.0 Filter objects lacked a 'context' property
                if (filter.context?.length > 0 && !filter.context.includes("home")) return;
                if (filter.filterAction != "hide") return;

                filter.keywords.forEach((keyword) => {
                    if (containsString(toot, keyword.keyword)) {
                        console.debug(`toot ${describeToot(toot)} matched server side filter keyword:`, keyword);
                        serverSideFilterCounts[keyword.keyword] ??= 0;
                        serverSideFilterCounts[keyword.keyword] += 1;
                    }
                });
            });
        });

        // Instantiate missing filter sections  // TODO: maybe this should happen in Storage?
        Object.values(PropertyName).forEach((sectionName) => {
            if (sectionName in this.filters.filterSections) return;
            this.filters.filterSections[sectionName] = new PropertyFilter({title: sectionName});
        });

        // TODO: if there's an validValue set for a filter section that is no longer in the feed
        // the user will not be presented with the option to turn it off. This is a bug.
        this.filters.filterSections[PropertyName.APP].optionInfo = appCounts;
        this.filters.filterSections[PropertyName.HASHTAG].optionInfo = tagCounts;
        this.filters.filterSections[PropertyName.LANGUAGE].optionInfo = languageCounts;
        this.filters.filterSections[PropertyName.SOURCE].optionInfo = sourceCounts;
        this.filters.filterSections[PropertyName.USER].optionInfo = userCounts;
        // Server side filters are inverted by default bc we don't want to show toots including them
        this.filters.filterSections[PropertyName.SERVER_SIDE_FILTERS].optionInfo = serverSideFilterCounts;
        this.filters.filterSections[PropertyName.SERVER_SIDE_FILTERS].validValues = Object.keys(serverSideFilterCounts);
        console.debug(`repairFeedAndExtractSummaryInfo() completed, built filters:`, this.filters);
    }

    // TODO: is this ever used?
    list(): Paginator {
        return new Paginator(this.feed);
    }

    // Asynchronously fetch more toots if we have not reached the requred # of toots
    // and the last request returned the full requested count
    private async maybeGetMoreToots(newHomeToots: Toot[], numTimelineToots: number): Promise<void> {
        const maxTimelineTootsToFetch = Storage.getConfig().maxTimelineTootsToFetch;
        console.log(`Have ${this.feed.length} toots in timeline, want ${maxTimelineTootsToFetch}...`);

        // Stop if we have enough toots or the last request didn't return the full requested count (minus 2)
        if (
               Storage.getConfig().enableIncrementalLoad
            && this.feed.length < maxTimelineTootsToFetch
            && newHomeToots.length >= (numTimelineToots - 3)  // Sometimes we get 39 records instead of 40 at a time
        ) {
            setTimeout(() => {
                // Use the 5th toot bc sometimes there are weird outliers. Dupes will be removed later.
                console.log(`calling getFeed() recursively current newHomeToots:`, newHomeToots);
                const tootWithMaxId = sortByCreatedAt(newHomeToots)[5];
                this.getFeed(numTimelineToots, tootWithMaxId.id);
            }, Storage.getConfig().incrementalLoadDelayMS);
        } else {
            if (!Storage.getConfig().enableIncrementalLoad) {
                console.log(`halting getFeed(): incremental loading disabled`);
            } else if (this.feed.length >= maxTimelineTootsToFetch) {
                console.log(`halting getFeed(): we have ${this.feed.length} toots`);
            } else {
                console.log(`halting getFeed(): fetch only got ${newHomeToots.length} toots (expected ${numTimelineToots})`);
            }
        }
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
                    await Scorer.decorateWithScoreInfo(toot, this.weightedScorers);
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

    // Return true if the toot has not been filtered out of the feed
    private isInTimeline(toot: Toot): boolean {
        let isOK = Object.values(this.filters.filterSections).every((section) => section.isAllowed(toot));
        return isOK && Object.values(this.filters.numericFilters).every((filter) => filter.isAllowed(toot));
    }

    // Return false if Toot should be discarded from feed altogether and permanently
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

    // Utility method to log progress of getFeed() calls
    private logTootCounts(newToots: Toot[], newHomeToots: Toot[]) {
        let msg = `Got ${Object.keys(this.followedAccounts).length} followed accounts, ${newToots.length} new toots`;
        msg += `, ${newHomeToots.length} new home toots, ${newToots.length} total new toots, this.feed has ${this.feed.length} toots`;
        console.log(msg);
    }

    private shouldReloadFeed(): boolean {
        const mostRecentTootAt = earliestTootAt(this.feed);
        if (!mostRecentTootAt) return true;
        return ((Date.now() - mostRecentTootAt.getTime()) > this.reloadIfOlderThanMS);
    }

    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores: Weights, step = 0.001): Promise<Weights | undefined> {
        console.debug(`learnWeights() called with 'tootScores' arg but is not implemented`, tootScores);
        return;

        // if (!this.filters.weightLearningEnabled) {
        if (true) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        } else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }

        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
                            .filter((value) => !isNaN(value))
                            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(tootScores).length;

        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores = await this.getUserWeights()
        const userWeightTotal = Object.values(newTootScores)
                                   .filter((value: number) => !isNaN(value))
                                   .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;

        for (let key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key as WeightName]) / mean) / (newTootScores[key as WeightName] / meanUserWeight);
            newTootScores[key as WeightName] = newTootScores[key as WeightName] - (step * newTootScores[key as WeightName] * reweight);  // TODO: this seems wrong?
        }

        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }
};


export {
    TIME_DECAY,
    FeedFilterSettings,
    PropertyName,
    NumericFilter,
    PropertyFilter,
    ScorerInfo,
    SourceFilterName,
    StringNumberDict,
    TheAlgorithm,
    Toot,
    Weights,
};
