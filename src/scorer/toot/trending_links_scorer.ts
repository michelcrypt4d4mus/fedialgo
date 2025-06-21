import MastodonServer from '../../api/mastodon_server';
import TootScorer from '../toot_scorer';
import type Toot from '../../api/objects/toot';
import { ScoreName } from '../../enums';
import { sumArray } from '../../helpers/collection_helpers';
import { type StringNumberDict } from "../../types";


/**
 * Score toots based on the numAccounts of any trending links they contain.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
export default class TrendingLinksScorer extends TootScorer {
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
        if (!toot.realToot.trendingLinks) {
            this.logger.trace(`No trendingLinks found for toot:`, toot.description);
            return 0;
        }

        return sumArray(toot.realToot.trendingLinks.map(link => this.scoreData[link.url]));
    }
};
