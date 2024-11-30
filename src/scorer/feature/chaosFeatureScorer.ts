/*
 * Random number generator to mix up the feed.
 */
import FeatureScorer from '../FeatureScorer';


export default class ChaosFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Insert Chaos into the scoring because social media ist krieg",
            defaultWeight: 1,
            scoreName: "Chaos",
        });
    }

    async score() {
        return Math.random();
    }
};
