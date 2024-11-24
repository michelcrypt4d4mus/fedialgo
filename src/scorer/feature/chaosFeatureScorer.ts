/*
 * Random number generator to mix up the feed.
 */
import FeatureScorer from '../FeatureScorer'


export default class chaosFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Insert Randomness and Chaos into the feed because Social Media Ist Krieg",
            defaultWeight: 1,
            scoreName: "Chaos",
        });
    }

    async score() {
        return Math.random();
    }
};
