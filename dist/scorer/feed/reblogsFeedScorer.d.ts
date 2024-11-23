import FeedScorer from "../FeedScorer";
import { StatusType } from "../../types";
export default class reblogsFeedScorer extends FeedScorer {
    constructor();
    feedExtractor(feed: StatusType[]): Record<string, number>;
    score(toot: StatusType): Promise<number>;
}
