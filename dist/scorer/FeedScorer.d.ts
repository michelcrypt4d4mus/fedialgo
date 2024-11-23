import { mastodon } from "masto";
import { Toot } from "../types";
export default class FeedScorer {
    features: Record<string, number>;
    private _scoreName;
    private _isReady;
    private _description;
    private _defaultWeight;
    constructor(scoreName: string, description?: string, defaultWeight?: number);
    setFeed(feed: Toot[]): Promise<void>;
    feedExtractor(_feed: Toot[]): Record<string, number>;
    score(_toot: mastodon.v1.Status): Promise<number>;
    getScoreName(): string;
    getDescription(): string;
    getDefaultWeight(): number;
}
