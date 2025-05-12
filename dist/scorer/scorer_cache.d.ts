import FeatureScorer from "./feature_scorer";
import FeedScorer from "./feed_scorer";
export default class ScorerCache {
    static featureScorers: FeatureScorer[];
    static feedScorers: FeedScorer[];
    static weightedScorers: (FeedScorer | FeatureScorer)[];
    static addScorers(featureScorers: FeatureScorer[], feedScorers: FeedScorer[]): void;
}
