/*
 * Random number generator to mix up the feed.
 */
import FeatureScorer from '../feature_scorer';


export default class ChaosFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Insert Chaos into the scoring (social media ist krieg)",
            defaultWeight: 1,
            scoreName: "Chaos",
        });
    }

    async _score() {
        return Math.random();
    }
};
