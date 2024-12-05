"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheAlgorithm = exports.TIME_DECAY = void 0;
const async_mutex_1 = require("async-mutex");
const chaosFeatureScorer_1 = __importDefault(require("./scorer/feature/chaosFeatureScorer"));
const diversity_feed_scorer_1 = __importDefault(require("./scorer/feed/diversity_feed_scorer"));
const favsFeatureScorer_1 = __importDefault(require("./scorer/feature/favsFeatureScorer"));
const followed_tags_feature_scorer_1 = __importDefault(require("./scorer/feature/followed_tags_feature_scorer"));
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const trending_tags_1 = __importDefault(require("./feeds/trending_tags"));
const trending_toots_1 = __importDefault(require("./feeds/trending_toots"));
const ImageAttachmentScorer_1 = __importDefault(require("./scorer/feature/ImageAttachmentScorer"));
const InteractionsFeatureScorer_1 = __importDefault(require("./scorer/feature/InteractionsFeatureScorer"));
const mastodon_api_cache_1 = __importDefault(require("./api/mastodon_api_cache"));
const num_favorites_scorer_1 = __importDefault(require("./scorer/feature/num_favorites_scorer"));
const num_replies_scorer_1 = __importDefault(require("./scorer/feature/num_replies_scorer"));
const num_retoots_scorer_1 = __importDefault(require("./scorer/feature/num_retoots_scorer"));
const paginator_1 = __importDefault(require("./api/paginator"));
const retooted_users_scorer_1 = __importDefault(require("./scorer/feature/retooted_users_scorer"));
const retoots_in_feed_scorer_1 = __importDefault(require("./scorer/feed/retoots_in_feed_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("./scorer/feature/most_replied_accounts_scorer"));
const Storage_1 = __importDefault(require("./Storage"));
const trending_toots_feature_scorer_1 = __importDefault(require("./scorer/feature/trending_toots_feature_scorer"));
const trending_tags_scorer_1 = __importDefault(require("./scorer/feature/trending_tags_scorer"));
const VideoAttachmentScorer_1 = __importDefault(require("./scorer/feature/VideoAttachmentScorer"));
const helpers_1 = require("./helpers");
const account_1 = require("./objects/account");
const toot_1 = require("./objects/toot");
const config_1 = require("./config");
const types_1 = require("./types");
const UNKNOWN_APP = "unknown";
const TIME_DECAY = types_1.WeightName.TIME_DECAY;
exports.TIME_DECAY = TIME_DECAY;
class TheAlgorithm {
    api;
    user;
    filters;
    // Variables with initial values
    feed = [];
    followedAccounts = {};
    feedLanguageCounts = {};
    appCounts = {};
    tagCounts = {};
    tagFilterCounts = {}; // Just tagCounts filtered for a minimum count
    scoreMutex = new async_mutex_1.Mutex();
    reloadIfOlderThanMS;
    // Optional callback to set the feed in the code using this package
    setFeedInApp = (f) => console.log(`Default setFeedInApp() called...`);
    fetchers = [
        homeFeed_1.default,
        trending_toots_1.default
    ];
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new chaosFeatureScorer_1.default(),
        new favsFeatureScorer_1.default(),
        new followed_tags_feature_scorer_1.default(),
        new ImageAttachmentScorer_1.default(),
        new InteractionsFeatureScorer_1.default(),
        new num_favorites_scorer_1.default(),
        new num_replies_scorer_1.default(),
        new num_retoots_scorer_1.default(),
        new retooted_users_scorer_1.default(),
        new most_replied_accounts_scorer_1.default(),
        new trending_toots_feature_scorer_1.default(),
        new trending_tags_scorer_1.default(),
        new VideoAttachmentScorer_1.default(),
    ];
    // These scorers require the complete feed to work properly
    feedScorers = [
        new diversity_feed_scorer_1.default(),
        new retoots_in_feed_scorer_1.default(),
    ];
    weightedScorers = [
        ...this.featureScorers,
        ...this.feedScorers,
    ];
    scorersDict = this.weightedScorers.reduce((scorerInfos, scorer) => {
        scorerInfos[scorer.name] = scorer.getInfo();
        return scorerInfos;
    }, 
    // TimeDecay requires bespoke handling so it's not included in the loop above
    { [TIME_DECAY]: Object.assign({}, config_1.DEFAULT_WEIGHTS[TIME_DECAY]) });
    // This is the alternate constructor() that instantiates the class and loads the feed from storage.
    static async create(params) {
        await Storage_1.default.setIdentity(params.user);
        await Storage_1.default.logAppOpen();
        const algo = new TheAlgorithm(params);
        await algo.setDefaultWeights();
        algo.filters = await Storage_1.default.getFilters();
        algo.feed = await Storage_1.default.getFeed();
        algo.followedAccounts = (0, account_1.buildAccountNames)((await Storage_1.default.getFollowedAccts()));
        algo.repairFeedAndExtractSummaryInfo();
        algo.setFeedInApp(algo.feed);
        return algo;
    }
    constructor(params) {
        this.api = params.api;
        this.user = params.user;
        this.setFeedInApp = params.setFeedInApp ?? this.setFeedInApp;
        this.filters = JSON.parse(JSON.stringify(config_1.DEFAULT_FILTERS));
        this.reloadIfOlderThanMS = Storage_1.default.getConfig().reloadIfOlderThanMinutes * 60 * 1000; // Currently unused
    }
    // Fetch toots from followed accounts plus trending toots in the fediverse, then score and sort them
    async getFeed() {
        console.debug(`getFeed() called in fedialgo package...`);
        // Fetch toots and prepare scorers before scoring (only needs to be done once (???))
        const allResponses = await Promise.all([
            (0, trending_tags_1.default)(this.api),
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
        this.feed = (0, helpers_1.dedupeToots)(cleanFeed, "getFeed");
        this.followedAccounts = await mastodon_api_cache_1.default.getFollowedAccounts(this.api);
        this.repairFeedAndExtractSummaryInfo();
        return this.scoreFeed.bind(this)();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await Storage_1.default.getWeightings();
    }
    // Update user weightings and rescore / resort the feed.
    async updateUserWeights(userWeights) {
        console.log("updateUserWeights() called with weights:", userWeights);
        await Storage_1.default.setWeightings(userWeights);
        return this.scoreFeed.bind(this)();
    }
    // TODO: maybe this should be a copy so edits don't happen in place?
    getFilters() {
        return this.filters;
    }
    updateFilters(newFilters) {
        console.log(`updateFilters() called with newFilters: `, newFilters);
        this.filters = newFilters;
        Storage_1.default.setFilters(newFilters);
        return this.filteredFeed();
    }
    // Filter the feed based on the user's settings. Has the side effect of calling the setFeedInApp() callback.
    filteredFeed() {
        const filteredFeed = this.feed.filter(toot => this.isFiltered(toot));
        this.setFeedInApp(filteredFeed);
        return filteredFeed;
    }
    // Debugging method to log info about the timeline toots
    logFeedInfo(prefix = "") {
        prefix = prefix.length == 0 ? prefix : `${prefix} `;
        console.debug(`${prefix}feed toots posted by application counts:`, this.appCounts);
        console.log(`${prefix}tagCounts:`, this.tagCounts);
        console.log(`${prefix}timeline toots (condensed):`, this.feed.map(toot_1.condensedStatus));
    }
    // Adjust toot weights based on user's chosen slider values
    // TODO: unclear whether this is working correctly
    async learnWeights(tootScores, step = 0.001) {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);
        if (!this.filters.weightLearningEnabled) {
            console.debug(`learnWeights() called but weight learning is disabled...`);
            return;
        }
        else if (!tootScores) {
            console.debug(`learnWeights() called but tootScores arg is empty...`);
            return;
        }
        // Compute the total and mean score (AKA 'weight') of all the posts we are weighting
        const total = Object.values(tootScores)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + Math.abs(currentValue), 0);
        const mean = total / Object.values(tootScores).length;
        // Compute the sum and mean of the preferred weighting configured by the user with the weight sliders
        const newTootScores = await this.getUserWeights();
        const userWeightTotal = Object.values(newTootScores)
            .filter((value) => !isNaN(value))
            .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        const meanUserWeight = userWeightTotal / Object.values(newTootScores).length;
        for (let key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight); // TODO: this seems wrong?
        }
        await this.updateUserWeights(newTootScores);
        return newTootScores;
    }
    // Compute language and application counts. Repair broken toots:
    //   - Set toot.language to English if missing.
    //   - Set media type to "image" if appropriate
    repairFeedAndExtractSummaryInfo() {
        this.feedLanguageCounts = this.feed.reduce((langCounts, toot) => {
            toot.language ??= Storage_1.default.getConfig().defaultLanguage; // Default to English
            langCounts[toot.language] = (langCounts[toot.language] || 0) + 1;
            return langCounts;
        }, {});
        this.appCounts = this.feed.reduce((counts, toot) => {
            toot.application ??= { name: UNKNOWN_APP };
            const app = toot.application?.name || UNKNOWN_APP;
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {});
        // Check for weird media types
        this.feed.forEach(toot => {
            toot.mediaAttachments.forEach((media) => {
                if (media.type === "unknown" && (0, helpers_1.isImage)(media.remoteUrl)) {
                    console.warn(`Repairing broken media attachment in toot:`, toot);
                    media.type = helpers_1.IMAGE;
                }
                else if (!helpers_1.MEDIA_TYPES.includes(media.type)) {
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
        }, {});
        this.tagFilterCounts = Object.fromEntries(Object.entries(this.tagCounts).filter(([_key, val]) => val >= Storage_1.default.getConfig().minTootsForTagToAppearInFilter));
    }
    // TODO: is this ever used?
    list() {
        return new paginator_1.default(this.feed);
    }
    // Load weightings from storage. Set defaults for any missing weightings.
    async setDefaultWeights() {
        let weightings = await Storage_1.default.getWeightings();
        let shouldSetWeights = false;
        Object.keys(this.scorersDict).forEach((key) => {
            const value = weightings[key];
            if (!value && value !== 0) {
                weightings[key] = this.scorersDict[key].defaultWeight;
                shouldSetWeights = true;
            }
        });
        // If any changes were made to the Storage weightings, save them back to storage
        if (shouldSetWeights)
            await Storage_1.default.setWeightings(weightings);
    }
    // Injecting the scoreInfo property to each toot. Sort feed based on toot scores.
    async scoreFeed() {
        const logPrefix = `scoreFeed() [${(0, helpers_1.createRandomString)(5)}]`;
        console.debug(`${logPrefix} called in fedialgo package...`);
        try {
            // Lock a mutex to prevent multiple scoring loops to call the DiversityFeedScorer simultaneously
            this.scoreMutex.cancel();
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
                Storage_1.default.setFeed(this.feed);
                console.debug(`${logPrefix} call completed successfully...`);
            }
            finally {
                releaseMutex();
            }
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                console.debug(`${logPrefix} mutex cancellation`);
            }
            else {
                console.warn(`${logPrefix} caught error:`, e);
            }
        }
        return this.filteredFeed();
    }
    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    async decorateWithScoreInfo(toot) {
        // console.debug(`decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        let rawScore = 1;
        const rawScores = {};
        const weightedScores = {};
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
        const trendingScore = rawScores[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        const trendingWeighting = userWeights[types_1.WeightName.TRENDING_TOOTS] ?? 0;
        if (trendingScore > 0 && trendingWeighting < 1.0)
            rawScore *= trendingWeighting;
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || config_1.DEFAULT_WEIGHTS[TIME_DECAY].defaultWeight;
        const seconds = Math.floor((new Date().getTime() - new Date(toot.createdAt).getTime()) / 1000);
        const timeDecayMultiplier = Math.pow((1 + timeDecay), -1 * Math.pow((seconds / 3600), 2));
        const score = rawScore * timeDecayMultiplier;
        toot.scoreInfo = {
            rawScore,
            rawScores,
            score,
            timeDecayMultiplier,
            weightedScores,
        };
        // If it's a retoot copy the scores to the retooted toot as well // TODO: this is janky
        if (toot.reblog)
            toot.reblog.scoreInfo = toot.scoreInfo;
    }
    isFiltered(toot) {
        const apps = this.filters.filteredApps;
        const languages = this.filters.filteredLanguages;
        const tags = this.filters.filteredTags;
        const tootLanguage = toot.language || Storage_1.default.getConfig().defaultLanguage;
        if (languages.length > 0) {
            if (!languages.includes(tootLanguage)) {
                console.debug(`Removing toot ${toot.uri} w/invalid language ${tootLanguage}. valid langs:`, languages);
                return false;
            }
            else {
                console.debug(`Allowing toot with language ${tootLanguage}...`);
            }
        }
        if (tags.length > 0) {
            // Then tag checkboxes are a blacklist
            if (this.filters.suppressSelectedTags) {
                if (toot.tags.some(tag => tags.includes(tag.name))) {
                    return false;
                }
            }
            else if (!toot.tags.some(tag => tags.includes(tag.name))) {
                // Otherwise tag checkboxes are a whitelist
                return false;
            }
        }
        if (apps.length > 0 && !apps.includes(toot.application?.name)) {
            console.debug(`Removing toot ${toot.uri} with invalid app ${toot.application?.name}...`);
            return false;
        }
        else if (this.filters.onlyLinks && !(toot.card || toot.reblog?.card)) {
            return false;
        }
        else if (toot.reblog && !this.filters.includeReposts) {
            console.debug(`Removing reblogged toot from feed`, toot);
            return false;
        }
        else if (!this.filters.includeTrendingToots && toot.scoreInfo?.rawScores[types_1.WeightName.TRENDING_TOOTS]) {
            return false;
        }
        else if (!this.filters.includeTrendingHashTags && toot.trendingTags?.length) {
            return false;
        }
        else if (!this.filters.includeFollowedAccounts && (toot.account.acct in this.followedAccounts)) {
            return false;
        }
        else if (!this.filters.includeReplies && toot.inReplyToId) {
            return false;
        }
        else if (!this.filters.includeFollowedHashtags && toot.followedTags?.length) {
            return false;
        }
        return true;
    }
    isValidForFeed(toot) {
        if (toot == undefined)
            return false;
        if (toot?.reblog?.muted || toot?.muted)
            return false; // Remove muted accounts and toots
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
    }
    ;
    shouldReloadFeed() {
        const mostRecentTootAt = (0, toot_1.earliestTootAt)(this.feed);
        if (!mostRecentTootAt)
            return true;
        return ((Date.now() - mostRecentTootAt.getTime()) > this.reloadIfOlderThanMS);
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
//# sourceMappingURL=index.js.map