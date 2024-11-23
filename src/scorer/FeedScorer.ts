/*
 * Base class that other toot scorers extend.
 */
import { mastodon } from "masto";
import { Toot } from "../types";


export default class FeedScorer {
    features: Record<string, number> = {};

    private _verboseName: string = "BaseScorer";
    private _isReady: boolean = false;
    private _description: string = "";
    private _defaultWeight: number = 1;

    constructor(verboseName: string, description?: string, defaultWeight?: number) {
        this._verboseName = verboseName;
        this._description = description || "";
        this._defaultWeight = defaultWeight || 1;
    }

    async setFeed(feed: Toot[]) {
        this.features = await this.feedExtractor(feed)
        this._isReady = true;
    }

    feedExtractor(_feed: Toot[]): Record<string, number> {
        throw new Error("Method not implemented.");
    }

    async score(_toot: mastodon.v1.Status): Promise<number> {
        if (!this._isReady) throw new Error("FeedScorer not ready");
        return 0;
    }

    getVerboseName() {
        return this._verboseName;
    }

    getDescription() {
        return this._description;
    }

    getDefaultWeight() {
        return this._defaultWeight;
    }
}
