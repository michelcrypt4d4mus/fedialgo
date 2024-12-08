/*
 * Random number generator to mix up the feed.
 */
import FeatureScorer from '../feature_scorer';
import { WeightName } from "../../types";


export default class ChaosScorer extends FeatureScorer {
    constructor() {
        super({scoreName: WeightName.CHAOS});
    }

    async _score() {
        return Math.random();
    }
};
