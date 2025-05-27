import Toot from "../api/objects/toot";
export declare function getFavouritedTagToots(): Promise<Toot[]>;
export declare function getParticipatedHashtagToots(): Promise<Toot[]>;
export declare function getRecentTootsForTrendingTags(): Promise<Toot[]>;
