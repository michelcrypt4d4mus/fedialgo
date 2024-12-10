/*
 * Random number generator to mix up the feed.
 */
import FeatureScorer from '../feature_scorer';
import Toot from '../../api/objects/toot';
import { WeightName } from "../../types";


export default class ChaosScorer extends FeatureScorer {
    constructor() {
        super(WeightName.CHAOS);
    }

    async _score(toot: Toot) {
        try {
            return this.decimalHash(toot.content);
        } catch (e) {
            console.warn(`Error in _score() for ${this.name}:`, e, `\nToot with error in ChaosScorer:`, toot);
            return 0;
        }
    }

    // Use a hash to get a deterministic score between 0 and 1
    decimalHash(s: string): number {
        let hash = 0;

        for (let i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + ((hash << 5) - hash);
        }

        return (hash & hash) / Math.pow(2, 31);
    }
};
