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
        return this.trendingLinks.reduce((accountsPostingLinkCounts, link) => {
            accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
            return accountsPostingLinkCounts;
        }, {} as StringNumberDict);
    }

    async _score(toot: Toot): Promise<number> {
        const links = this.trendingLinks.filter((link) => toot.content.toLowerCase().includes(link.url));

        return links.map(link => (link.numToots || 0) + (link.numAccounts || 0))
                    .reduce((total, x) => total + x, 0);
    }
};
