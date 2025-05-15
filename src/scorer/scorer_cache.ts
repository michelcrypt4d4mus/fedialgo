/*
 * To avoid circular dependencies.
 */
import FeatureScorer from "./feature_scorer";
import FeedScorer from "./feed_scorer";


export default class ScorerCache {
    // These can score a toot without knowing about the rest of the toots in the feed
    static featureScorers: FeatureScorer[] = [];
    // These scorers require the complete feed to work properly
    static feedScorers: FeedScorer[] = [];
    // All scorers that can be weighted
    static weightedScorers: (FeedScorer | FeatureScorer)[] = [];

    static addScorers(featureScorers: FeatureScorer[], feedScorers: FeedScorer[]) {
        this.featureScorers = featureScorers;
        this.feedScorers = feedScorers;
        this.weightedScorers = [...featureScorers, ...feedScorers];
    }
};
