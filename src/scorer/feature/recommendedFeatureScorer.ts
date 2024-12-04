/*
 * CURRENTLY UNUSED
 */
import { mastodon } from "masto";

import FeatureScorer from '../feature_scorer';
import { Toot } from "../../types";


export default class recommendedFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            featureGetter: (_api: mastodon.rest.Client) => { return Promise.resolve({}) },
            scoreName: "Recommended",
            description: "Posts that are recommended by AI embeddings",
        });
    }

    async _score(toot: Toot) {
        return toot.recommended ? toot.similarity ?? 1 : 0;
    }
}
