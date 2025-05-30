"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonScoreWeightName = exports.ScoreName = void 0;
/*
 * Base class for Toot scorers.
 */
const async_mutex_1 = require("async-mutex");
const scorer_cache_1 = __importDefault(require("./scorer_cache"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const config_1 = require("../config");
const weight_presets_1 = require("./weight_presets");
// There's a scorer for each of these ScoreNames
var ScoreName;
(function (ScoreName) {
    ScoreName["ALREADY_SHOWN"] = "AlreadyShown";
    ScoreName["CHAOS"] = "Chaos";
    ScoreName["DIVERSITY"] = "Diversity";
    ScoreName["FAVOURITED_ACCOUNTS"] = "FavouritedAccounts";
    ScoreName["FAVOURITED_TAGS"] = "FavouritedTags";
    ScoreName["FOLLOWED_ACCOUNTS"] = "FollowedAccounts";
    ScoreName["FOLLOWED_TAGS"] = "FollowedTags";
    ScoreName["IMAGE_ATTACHMENTS"] = "ImageAttachments";
    ScoreName["INTERACTIONS"] = "Interactions";
    ScoreName["MENTIONS_FOLLOWED"] = "MentionsFollowed";
    ScoreName["MOST_REPLIED_ACCOUNTS"] = "MostRepliedAccounts";
    ScoreName["MOST_RETOOTED_ACCOUNTS"] = "MostRetootedAccounts";
    ScoreName["NUM_FAVOURITES"] = "NumFavourites";
    ScoreName["NUM_REPLIES"] = "NumReplies";
    ScoreName["NUM_RETOOTS"] = "NumRetoots";
    ScoreName["PARTICIPATED_TAGS"] = "ParticipatedTags";
    ScoreName["RETOOTED_IN_FEED"] = "RetootedInFeed";
    ScoreName["TRENDING_LINKS"] = "TrendingLinks";
    ScoreName["TRENDING_TAGS"] = "TrendingTags";
    ScoreName["TRENDING_TOOTS"] = "TrendingToots";
    ScoreName["VIDEO_ATTACHMENTS"] = "VideoAttachments";
})(ScoreName || (exports.ScoreName = ScoreName = {}));
;
// Order currently influences the order of the score weighting sliders in the demo app
var NonScoreWeightName;
(function (NonScoreWeightName) {
    NonScoreWeightName["TIME_DECAY"] = "TimeDecay";
    NonScoreWeightName["TRENDING"] = "Trending";
    NonScoreWeightName["OUTLIER_DAMPENER"] = "OutlierDampener";
})(NonScoreWeightName || (exports.NonScoreWeightName = NonScoreWeightName = {}));
;
// Local constants
const LOG_PREFIX = "Scorer";
const scoreLogger = new log_helpers_1.ComponentLogger(LOG_PREFIX, "scoreToots");
const SCORE_MUTEX = new async_mutex_1.Mutex();
const TRENDING_WEIGHTS = [
    ScoreName.TRENDING_LINKS,
    ScoreName.TRENDING_TAGS,
    ScoreName.TRENDING_TOOTS,
];
class Scorer {
    isReady = false; // Set to true when the scorer is ready to score
    logger;
    name;
    scoreData = {}; // Background data used to score a toot
    constructor(name) {
        this.name = name;
        this.logger = new log_helpers_1.ComponentLogger(LOG_PREFIX, name);
    }
    // Return a ScorerInfo object with the description and the scorer itself
    getInfo() {
        return {
            description: this.description,
            scorer: this,
        };
    }
    // This is the public API for scoring a toot
    async score(toot) {
        if (this.isReady)
            return await this._score(toot);
        if (!toot.scoreInfo) {
            this.logger.warn(`Not ready, scoring 0...`);
            return 0;
        }
        else {
            const existingScore = toot.getIndividualScore("raw", this.name);
            this.logger.debug(`Not ready but toot already scored (existing score: ${existingScore})`);
            return existingScore;
        }
    }
    //////////////////////////////
    //   Static class methods   //
    //////////////////////////////
    // Score and return an array of toots sorted by score. This DOES NOT mutate the order of
    // 'toots' array in place - if you need the sorted array you need to assign the return value.
    // If 'isScoringFeed' is false the scores will be "best effort"
    static async scoreToots(toots, isScoringFeed) {
        const scorers = scorer_cache_1.default.weightedScorers;
        const startedAt = new Date();
        try {
            // Lock mutex to prevent multiple scoring loops calling DiversityFeedScorer simultaneously.
            // If it's already locked just cancel the current loop and start over (scoring is idempotent so it's OK).
            // Makes the feed scoring more responsive to the user adjusting the weights to not have to wait.
            let releaseMutex;
            if (isScoringFeed) {
                SCORE_MUTEX.cancel();
                releaseMutex = await SCORE_MUTEX.acquire();
                // Feed scorers' data must be refreshed each time the feed changes
                scorer_cache_1.default.feedScorers.forEach(scorer => scorer.extractScoreDataFromFeed(toots));
            }
            try { // Score the toots asynchronously in batches
                await (0, collection_helpers_1.batchMap)(toots, t => this.decorateWithScoreInfo(t, scorers), { logPrefix: LOG_PREFIX });
            }
            finally {
                releaseMutex?.();
            }
            // Sort feed based on score from high to low and return
            scoreLogger.trace(`Scored ${toots.length} toots ${(0, time_helpers_1.ageString)(startedAt)} (${scorers.length} scorers)`);
            toots = toots.toSorted((a, b) => b.getScore() - a.getScore());
        }
        catch (e) {
            if (e == async_mutex_1.E_CANCELED) {
                scoreLogger.trace(`Mutex cancellation...`);
            }
            else {
                scoreLogger.warn(`Caught error:`, e);
            }
        }
        return toots;
    }
    ///////////////////////////////
    //   Private class methods   //
    ///////////////////////////////
    // Add all the score info to a Toot's scoreInfo property
    static async decorateWithScoreInfo(toot, scorers) {
        const realToot = toot.realToot();
        const userWeights = await Storage_1.default.getWeights();
        // Find non scorer weights
        const getWeight = (weightKey) => userWeights[weightKey] ?? weight_presets_1.DEFAULT_WEIGHTS[weightKey];
        const outlierDampener = getWeight(NonScoreWeightName.OUTLIER_DAMPENER);
        const timeDecayWeight = getWeight(NonScoreWeightName.TIME_DECAY) / 10; // Divide by 10 to make it more user friendly
        const trendingMultiplier = getWeight(NonScoreWeightName.TRENDING);
        // Do scoring
        const rawestScores = await Promise.all(scorers.map((s) => s.score(toot)));
        // Compute a weighted score a toot based by multiplying the value of each numerical property
        // by the user's chosen weighting for that property (the one configured with the GUI sliders).
        const scores = scorers.reduce((scoreDict, scorer, i) => {
            const rawScore = rawestScores[i] || 0;
            let weightedScore = rawScore * (userWeights[scorer.name] ?? 0);
            // Apply the TRENDING modifier but only to toots that are not from followed accounts or tags
            if (realToot.isTrending() && (!realToot.isFollowed() || TRENDING_WEIGHTS.includes(scorer.name))) {
                weightedScore *= trendingMultiplier;
            }
            // Outlier dampener of 2 means take the square root of the score, 3 means cube root, etc.
            // TODO: outlierDampener is always greater than 0...
            if (outlierDampener > 0) {
                const scorerScore = weightedScore;
                const outlierExponent = 1 / outlierDampener;
                // Diversity scores are negative so we temporarily flip the sign to get the root
                if (scorerScore >= 0) {
                    weightedScore = Math.pow(scorerScore, outlierExponent);
                }
                else {
                    weightedScore = -1 * Math.pow(-1 * scorerScore, outlierExponent);
                }
            }
            scoreDict[scorer.name] = {
                raw: rawScore,
                weighted: weightedScore,
            };
            return scoreDict;
        }, {});
        // Multiple weighted score by time decay penalty to get a final weightedScore
        const decayExponent = -1 * Math.pow(toot.ageInHours(), config_1.config.scoring.timeDecayExponent);
        const timeDecayMultiplier = Math.pow(timeDecayWeight + 1, decayExponent);
        const weightedScore = this.sumScores(scores, "weighted");
        const score = weightedScore * timeDecayMultiplier;
        // Preserve rawScores, timeDecayMultiplier, and weightedScores for debugging
        const scoreInfo = {
            rawScore: this.sumScores(scores, "raw"),
            score,
            scores,
            timeDecayMultiplier,
            trendingMultiplier,
            weightedScore,
        };
        // TODO: duping the score to realToot() is a hack that sucks
        toot.realToot().scoreInfo = toot.scoreInfo = scoreInfo;
    }
    // Add 1 so that time decay multiplier works even with scorers giving 0s
    static sumScores(scores, scoreType) {
        return 1 + (0, collection_helpers_1.sumArray)(Object.values(scores).map((s) => s[scoreType]));
    }
}
exports.default = Scorer;
;
//# sourceMappingURL=scorer.js.map