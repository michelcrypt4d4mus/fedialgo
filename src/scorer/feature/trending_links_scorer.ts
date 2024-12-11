/*
 * Score toots that contain currently trending links.
 * https://docs.joinmastodon.org/methods/trends/#links
 */
import { mastodon } from 'masto';

import FeatureScorer from '../feature_scorer';
import MastodonServer from '../../api/mastodon_server';
import Storage from '../../Storage';
import Toot from '../../api/objects/toot';
import { StringNumberDict, TrendingLink, TrendingLinkUrls, WeightName } from "../../types";


export default class TrendingLinksScorer extends FeatureScorer {
    trendingLinks: TrendingLink[] = [];

    constructor() {
        super(WeightName.TRENDING_LINKS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        const links = await MastodonServer.fediverseTrendingLinks();
        this.trendingLinks = links.map(FeatureScorer.decorateHistoryScores) as TrendingLink[];

        return Object.fromEntries(
            Object.entries(this.trendingLinks).map(
                ([url, link]) => [url, (link.numAccounts || 0) + (link.numToots || 0)]
            )
        )
    }

    async _score(toot: Toot): Promise<number> {
        const links = this.trendingLinks.filter((link) => toot.content.toLowerCase().includes(link.url));

        return links.map(link => (link.numToots || 0) + (link.numAccounts || 0))
                    .reduce((total, x) => total + x, 0);
    }
};
