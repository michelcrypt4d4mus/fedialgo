import Scorer from "./scorer";
import { Toot } from "../types";
export default class FeedScorer extends Scorer {
    features: Record<string, number>;
    constructor(scoreName: string, description: string, defaultWeight?: number);
    setFeed(feed: Toot[]): Promise<void>;
    feedExtractor(_feed: Toot[]): Record<string, number>;
}