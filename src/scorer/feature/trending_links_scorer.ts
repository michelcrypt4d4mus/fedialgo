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
    linkData: TrendingLinkUrls = {};

    constructor() {
        super(WeightName.TRENDING_LINKS);
    }

    async featureGetter(): Promise<StringNumberDict> {
        const links = await MastodonServer.fediverseTrendingLinks();
        const trendingLinks = links.map(decorateTrendingLink);

        this.linkData = trendingLinks.reduce((acc, link) => {
            acc[link.url.toLowerCase()] = link;
            return acc;
        }, {} as TrendingLinkUrls)

        return Object.fromEntries(
            Object.entries(this.linkData).map(
                ([url, link]) => [url, (link.numAccounts || 0) + (link.numToots || 0)]
            )
        )
    }

    async _score(toot: Toot): Promise<number> {
        const links = Object.values(this.linkData).filter((link) => toot.content.toLowerCase().includes(link.url.toLowerCase()));
        return links.map(link => (link.numToots || 0) + (link.numAccounts || 0)).reduce((total, x) => total + x, 0);
    }
};


function decorateTrendingLink(link: mastodon.v1.TrendLink): TrendingLink {
    const trendingLink = link as TrendingLink;
    trendingLink.url = trendingLink.url.toLowerCase();

    if (!trendingLink?.history?.length) {
        console.warn(`decorateTrendingTag() found no history for tag:`, trendingLink);
        trendingLink.history = [];
    }

    const recentHistory = trendingLink.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
    trendingLink.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    trendingLink.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return trendingLink;
}
