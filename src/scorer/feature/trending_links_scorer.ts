/*
 * Score toots that contain currently trending links.
 * https://docs.joinmastodon.org/methods/trends/#links
 */
import FeatureScorer from '../feature_scorer';
import MastodonServer from '../../api/mastodon_server';
import Toot from '../../api/objects/toot';
import { StringNumberDict } from "../../types";
import { ScoreName } from '../scorer';
import { sumArray } from '../../helpers/collection_helpers';


export default class TrendingLinksScorer extends FeatureScorer {
    description = "Favour links that are trending in the Fediverse";

    constructor() {
        super(ScoreName.TRENDING_LINKS);
    }

    // TODO: this is unnecessary as numAccounts should be stored in the TrendingLink objects
    async prepareScoreData(): Promise<StringNumberDict> {
        return (await MastodonServer.fediverseTrendingLinks()).reduce(
            (accountsPostingLinkCounts, link) => {
                accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
                return accountsPostingLinkCounts;
            },
            {} as StringNumberDict
        );
    }

    async _score(toot: Toot): Promise<number> {
        toot = toot.reblog || toot;

        if (!toot.trendingLinks) {
            this.logger.warn(`No trendingLinks found for toot:`, toot);
            return 0;
        }

        return sumArray(toot.trendingLinks.map(link => this.scoreData[link.url] || 0));
    }
};
