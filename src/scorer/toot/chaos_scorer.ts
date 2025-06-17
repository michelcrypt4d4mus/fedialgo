import Toot from '../../api/objects/toot';
import TootScorer from '../toot_scorer';
import { ScoreName } from '../../enums';


/**
 * Random number generator to mix up the feed.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class ChaosScorer extends TootScorer {
    description = "Insert Chaos into the scoring (social media ist krieg)";

    constructor() {
        super(ScoreName.CHAOS);
    }

    async _score(toot: Toot) {
        // Return the existing score if it exists
        if (toot.scoreInfo?.scores) {
            const existingScore = toot.getIndividualScore("raw", this.name);
            if (existingScore) return existingScore;
        }

        try {
            return this.decimalHash(toot.realToot.content);
        } catch (e) {
            console.warn(`Error in _score() for ${this.name}:`, e, `\nToot with error in ChaosScorer:`, toot);
            return 0;
        }
    }

    // Use a hash to get a deterministic score between 0 and 1
    private decimalHash(s: string): number {
        let hash = 0;

        for (let i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + ((hash << 5) - hash);
        }

        return (hash & hash) / Math.pow(2, 31);
    }
};
