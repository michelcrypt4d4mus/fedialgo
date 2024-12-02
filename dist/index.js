"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheAlgorithm = exports.MastodonApiCache = exports.TRENDING_TOOTS = exports.TIME_DECAY = exports.NO_LANGUAGE = exports.DEFAULT_TIME_DECAY = exports.DEFAULT_FILTERS = void 0;
const async_mutex_1 = require("async-mutex");
const scorer_1 = require("./scorer");
const helpers_1 = require("./helpers");
const topPostFeatureScorer_1 = require("./scorer/feature/topPostFeatureScorer");
Object.defineProperty(exports, "TRENDING_TOOTS", { enumerable: true, get: function () { return topPostFeatureScorer_1.TRENDING_TOOTS; } });
const mastodon_api_cache_1 = __importDefault(require("./features/mastodon_api_cache"));
exports.MastodonApiCache = mastodon_api_cache_1.default;
const homeFeed_1 = __importDefault(require("./feeds/homeFeed"));
const Paginator_1 = __importDefault(require("./Paginator"));
const Storage_1 = __importDefault(require("./Storage"));
const topPostsFeed_1 = __importDefault(require("./feeds/topPostsFeed"));
const weightsStore_1 = __importDefault(require("./weights/weightsStore"));
//import getRecommenderFeed from "./feeds/recommenderFeed";
const NO_LANGUAGE = '[not specified]';
exports.NO_LANGUAGE = NO_LANGUAGE;
const TIME_DECAY = 'TimeDecay';
exports.TIME_DECAY = TIME_DECAY;
const DEFAULT_TIME_DECAY = 0.05;
exports.DEFAULT_TIME_DECAY = DEFAULT_TIME_DECAY;
const DEFAULT_FILTERS = {
    filteredLanguages: [],
    includeFollowedHashtags: true,
    includeFollowedAccounts: true,
    includeReposts: true,
    includeReplies: true,
    includeTrendingToots: true,
    onlyLinks: false,
};
exports.DEFAULT_FILTERS = DEFAULT_FILTERS;
class TheAlgorithm {
    api;
    user;
    filters;
    feed = [];
    scoreMutex = new async_mutex_1.Mutex();
    fetchers = [
        homeFeed_1.default,
        topPostsFeed_1.default
    ];
    // These can score a toot without knowing about the rest of the toots in the feed
    featureScorers = [
        new scorer_1.ChaosFeatureScorer(),
        new scorer_1.FavsFeatureScorer(),
        new scorer_1.FollowedTagsFeatureScorer(),
        new scorer_1.ImageAttachmentScorer(),
        new scorer_1.InteractionsFeatureScorer(),
        new scorer_1.NumFavoritesScorer(),
        new scorer_1.NumRepliesScorer(),
        new scorer_1.ReblogsFeatureScorer(),
        new scorer_1.RepliedFeatureScorer(),
        new scorer_1.TopPostFeatureScorer(),
        new scorer_1.VideoAttachmentScorer(),
    ];
    // These scorers require the complete feed to work properly
    feedScorers = [
        new scorer_1.DiversityFeedScorer(),
        new scorer_1.ReblogsFeedScorer(),
    ];
    weightedScorers = [...this.featureScorers, ...this.feedScorers];
    featureScoreNames = this.featureScorers.map(scorer => scorer.getScoreName());
    feedScoreNames = this.feedScorers.map(scorer => scorer.getScoreName());
    weightedScoreNames = this.weightedScorers.map(scorer => scorer.getScoreName());
    allScoreNames = this.weightedScoreNames.concat([TIME_DECAY]);
    constructor(api, user) {
        this.api = api;
        this.user = user;
        this.filters = JSON.parse(JSON.stringify(DEFAULT_FILTERS));
    }
    // See: https://www.reddit.com/r/typescript/comments/1fnn38f/asynchronous_constructors_in_typescript/
    static async create(api, user) {
        const algo = new TheAlgorithm(api, user);
        await Storage_1.default.setIdentity(user);
        await Storage_1.default.logAppOpen();
        await algo.setDefaultWeights();
        return algo;
    }
    // Fetch toots for the timeline from accounts the user follows as well as trending toots in
    // the fediverse, score them, and sort them.
    async getFeed() {
        console.debug(`getFeed() called in fedialgo package...`);
        const response = await Promise.all(this.fetchers.map(fetcher => fetcher(this.api, this.user)));
        this.feed = response.flat();
        console.log(`Found ${this.feed.length} potential toots for feed.`);
        // Remove replies, stuff already retooted, invalid future timestamps, nulls, etc.
        let cleanFeed = this.feed.filter(isValidForFeed);
        const numRemoved = this.feed.length - cleanFeed.length;
        console.log(`Removed ${numRemoved} invalid toots (of ${this.feed.length}) from feed leaving ${cleanFeed.length}`);
        // Remove dupes by uniquifying on the URI
        // TODO: Can a toot trend on multiple servers? If so should we total its topPost scores?
        const numValid = cleanFeed.length;
        cleanFeed = [...new Map(cleanFeed.map((toot) => [toot.uri, toot])).values()];
        console.log(`Removed ${numValid - cleanFeed.length} duplicate toots, leaving ${cleanFeed.length}.`);
        this.feed = cleanFeed;
        // Prepare scorers and score toots (mutates Toot objects to add toot.scoreInfo property)
        await Promise.all(this.featureScorers.map(scorer => scorer.getFeature(this.api)));
        // const self = this;
        // await this.scoreMutex.runExclusive(async () => await this.scoreFeed(self));
        await this.scoreFeed(this);
        return this.filteredFeed();
    }
    // Rescores the toots in the feed. Gets called when the user changes the weightings.
    // Has side effect of updating WeightsStore.
    async weightTootsInFeed(userWeights) {
        console.log("weightTootsInFeed() called with 'userWeights' arg:", userWeights);
        // prevent userWeights from being set to 0
        for (const key in userWeights) {
            if (userWeights[key] == null || isNaN(userWeights[key])) {
                console.warn(`Invalid value for '${key}'! Setting to 0...`);
                userWeights[key] = 0;
            }
        }
        await weightsStore_1.default.setScoreWeightsMulti(userWeights);
        // const self = this;
        // await this.scoreMutex.runExclusive(async () => await this.scoreFeed(self));
        await this.scoreFeed(this);
        return this.filteredFeed();
    }
    // Return the user's current weightings for each score category
    async getUserWeights() {
        return await weightsStore_1.default.getUserWeightsMulti(this.allScoreNames);
    }
    // Get the longform human readable description for a given scorer
    getDescription(scorerName) {
        const scorer = this.weightedScorers.find(scorer => scorer.getScoreName() === scorerName);
        if (scorer) {
            return scorer.getDescription();
        }
        else {
            return "No description found";
        }
    }
    // Adjust toot weights based on user's chosen slider values
    async learnWeights(tootScores, step = 0.001) {
        console.debug(`learnWeights() called with 'tootScores' arg: `, tootScores);
        if (tootScores == undefined)
            return;
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
        for (const key in newTootScores) {
            const reweight = 1 - (Math.abs(tootScores[key]) / mean) / (newTootScores[key] / meanUserWeight);
            newTootScores[key] = newTootScores[key] - (step * newTootScores[key] * reweight); // TODO: this seems wrong?
        }
        await this.weightTootsInFeed(newTootScores);
        return newTootScores;
    }
    filteredFeed() {
        return this.feed.filter(toot => this.isFiltered(toot));
    }
    list() {
        return new Paginator_1.default(this.feed);
    }
    // Debugging method to log info about the timeline toots
    logFeedInfo() {
        if (!this.feed || this.feed.length == 0) {
            console.warn(`No feed to log!`);
            return;
        }
        console.log(`timeline toots (condensed): `, this.feed.map(helpers_1.condensedStatus));
        const appCounts = this.feed.reduce((counts, toot) => {
            const app = toot.application?.name || "unknown";
            counts[app] = (counts[app] || 0) + 1;
            return counts;
        }, {});
        console.debug(`feed toots posted by application counts: `, appCounts);
    }
    async scoreFeed(self) {
        const threadID = (0, helpers_1.createRandomString)(5);
        console.debug(`scoreFeed() [${threadID}] called in fedialgo package...`);
        try {
            self.scoreMutex.cancel();
            const releaseMutex = await self.scoreMutex.acquire();
            try {
                // TODO: DiversityFeedScorer mutates its state as it scores so setFeed() must be reset each scoring
                await Promise.all(self.feedScorers.map(scorer => scorer.setFeed(self.feed)));
                // TODO: DiversityFeedScorer mutations are problematic when used with Promise.all() so use a loop
                for (const toot of self.feed) {
                    await self._decorateWithScoreInfo(toot);
                }
                console.debug(`scoreFeed() [${threadID}] call completed successfully...`);
            }
            finally {
                releaseMutex();
            }
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                console.debug(`scoreFeed() [${threadID}] mutex cancellation`);
            }
            else {
                console.warn(`scoreFeed() [${threadID}] caught error:`, e);
            }
        }
        return self.sortFeed();
    }
    // Set default score weightings
    async setDefaultWeights() {
        await Promise.all(this.weightedScorers.map(scorer => weightsStore_1.default.defaultFallback(scorer.getScoreName(), scorer.getDefaultWeight())));
        weightsStore_1.default.defaultFallback(TIME_DECAY, DEFAULT_TIME_DECAY);
    }
    isFiltered(toot) {
        const tootLanguage = toot.language || NO_LANGUAGE;
        if (this.filters.onlyLinks && !(toot.card || toot.reblog?.card)) {
            console.debug(`Removing ${toot.uri} from feed because it's not a link and onlyLinks is enabled...`);
            return false;
        }
        else if (toot.reblog && !this.filters.includeReposts) {
            console.debug(`Removing reblogged status ${toot.uri} from feed...`);
            return false;
        }
        else if (this.filters.filteredLanguages.length > 0 && !this.filters.filteredLanguages.includes(tootLanguage)) {
            console.debug(`Removing toot ${toot.uri} w/invalid language ${tootLanguage}. valid langs:`, this.filters.filteredLanguages);
            return false;
        }
        else if (!this.filters.includeTrendingToots && toot.scoreInfo?.rawScores[topPostFeatureScorer_1.TRENDING_TOOTS]) {
            return false;
        }
        else if (!this.filters.includeFollowedAccounts && !toot.scoreInfo?.rawScores[topPostFeatureScorer_1.TRENDING_TOOTS]) {
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
    // Add scores including weighted & unweighted components to the Toot for debugging/inspection
    async _decorateWithScoreInfo(toot) {
        // console.debug(`_decorateWithScoreInfo ${describeToot(toot)}: `, toot);
        const scores = await Promise.all(this.weightedScorers.map(scorer => scorer.score(toot)));
        const userWeights = await this.getUserWeights();
        const rawScores = {};
        const weightedScores = {};
        let rawScore = 1;
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        this.weightedScoreNames.forEach((scoreName, i) => {
            const scoreValue = scores[i] || 0;
            rawScores[scoreName] = scoreValue;
            weightedScores[scoreName] = scoreValue * (userWeights[scoreName] ?? 0);
            rawScore += weightedScores[scoreName];
        });
        // Trending toots usually have a lot of reblogs, likes, replies, etc. so they get disproportionately
        // high scores. To fix this we hack a final adjustment to the score by multiplying by the
        // trending toot weighting if the weighting is less than 1.0.
        const trendingTootScore = rawScores[topPostFeatureScorer_1.TRENDING_TOOTS] ?? 0;
        const trendingTootWeighting = userWeights[topPostFeatureScorer_1.TRENDING_TOOTS] ?? 0;
        if (trendingTootScore > 0 && trendingTootWeighting < 1.0) {
            rawScore *= trendingTootWeighting;
        }
        // Multiple rawScore by time decay penalty to get a final value
        const timeDecay = userWeights[TIME_DECAY] || DEFAULT_TIME_DECAY;
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
        return toot;
    }
    // Sort feed based on score from high to low. This must come after the deduplication step.
    sortFeed() {
        this.feed.sort((a, b) => (b.scoreInfo?.score ?? 0) - (a.scoreInfo?.score ?? 0));
        return this.feed;
    }
}
exports.TheAlgorithm = TheAlgorithm;
;
const isValidForFeed = (toot) => {
    if (toot == undefined)
        return false;
    if (toot?.reblog?.muted || toot?.muted)
        return false; // Remove muted accounts and toots
    if (toot?.content?.includes("RT @"))
        return false; // Remove retweets (???)
    // Remove retoots (i guess things user has already retooted???)
    if (toot?.reblog?.reblogged) {
        console.debug(`Removed retoot of id ${(0, helpers_1.describeToot)(toot)}: `, toot);
        return false;
    }
    // Sometimes there are wonky statuses that are like years in the future so we filter them out.
    if (Date.now() < (new Date(toot.createdAt)).getTime()) {
        console.warn(`Removed toot with future timestamp: `, toot);
        return false;
    }
    if (toot.filtered && toot.filtered.length > 0) {
        const filterMatch = toot.filtered[0];
        console.debug(`Removed toot that matched filter (${filterMatch.keywordMatches?.join(' ')}): `, toot);
        return false;
    }
    return true;
};
//# sourceMappingURL=index.js.map