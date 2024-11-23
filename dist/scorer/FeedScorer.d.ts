import { mastodon } from "masto";
import { StatusType } from "../types";
export default class FeedScorer {
    features: Record<string, number>;
    private _verboseName;
    private _isReady;
    private _description;
    private _defaultWeight;
    constructor(verboseName: string, description?: string, defaultWeight?: number);
    setFeed(feed: StatusType[]): Promise<void>;
    feedExtractor(_feed: StatusType[]): Record<string, number>;
    score(_toot: mastodon.v1.Status): Promise<number>;
    getVerboseName(): string;
    getDescription(): string;
    getDefaultWeight(): number;
}
