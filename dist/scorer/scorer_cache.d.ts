import FeedScorer from "./feed_scorer";
import TootScorer from "./feature_scorer";
export default class ScorerCache {
    static feedScorers: FeedScorer[];
    static tootScorers: TootScorer[];
    static weightedScorers: (FeedScorer | TootScorer)[];
    static addScorers(tootScorers: TootScorer[], feedScorers: FeedScorer[]): void;
    static prepareScorers(force?: boolean): Promise<void>;
    static resetScorers(): void;
}
