/*
 * Score toots that contain currently trending links.
 * https://docs.joinmastodon.org/methods/trends/#links
 */
import FeatureScorer from '../feature_scorer';
import MastodonServer from '../../api/mastodon_server';
import Toot from '../../api/objects/toot';
import { StringNumberDict, TrendingLink, WeightName } from "../../types";


export default class TrendingLinksScorer extends FeatureScorer {
    trendingLinks: TrendingLink[] = [];

    constructor() {
        super(WeightName.TRENDING_LINKS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        this.trendingLinks = await MastodonServer.fediverseTrendingLinks();

        // TODO: could add numtoots? + (link.numToots || 0);
        // TODO: we don't need to return this, this.trendingLinks is enough
        return this.trendingLinks.reduce(
            (accountsPostingLinkCounts, link) => {
                accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
                return accountsPostingLinkCounts;
            },
            {} as StringNumberDict
        );
    }

    // TODO: this mutates the toot object, which is not ideal
    async _score(toot: Toot): Promise<number> {
        toot = toot.reblog || toot;

        if (!toot.trendingLinks) {
            toot.trendingLinks = this.trendingLinks.filter(link => toot.containsString(link.url));
            console.debug(`[${this.constructor.name}] Found ${toot.trendingLinks.length} trendingLinks for ${toot.describe()}`);
        }

        return toot.trendingLinks.map(link => link.numToots || 0).reduce((total, x) => total + x, 0);
    }
};
