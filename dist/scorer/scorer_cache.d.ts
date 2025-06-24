import type FeedScorer from "./feed_scorer";
import type Scorer from "./scorer";
import type TootScorer from "./toot_scorer";
export default class ScorerCache {
    static feedScorers: FeedScorer[];
    static tootScorers: TootScorer[];
    static weightedScorers: Scorer[];
    static addScorers(tootScorers: TootScorer[], feedScorers: FeedScorer[]): void;
    static prepareScorers(force?: boolean): Promise<void>;
    static resetScorers(): void;
}
