import FeedScorer from "../FeedScorer";
import { StatusType } from "../../types";


export default class diversityFeedScorer extends FeedScorer {
    constructor() {
        super("Diversity", "Disfavor posts from users that you have seen a lot of posts from already");
    }

    feedExtractor(feed: StatusType[]): Record<string, number> {
        // this prevents just always the first post from being shown
        const sortRandom = () => Math.random() - 0.5;

        return feed.sort(sortRandom).reduce(
            (obj: Record<string, number>, toot) => {
                obj[toot.account.acct] = (obj[toot.account.acct] || 0) - 1;
                return obj;
            },
            {}
        );
    }

    async score(toot: StatusType) {
        super.score(toot);
        const frequ = this.features[toot.account.acct];
        this.features[toot.account.acct] = frequ + 1;
        return frequ + 1;
    }
};
