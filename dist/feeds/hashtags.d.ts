import Toot from "../api/objects/toot";
import { MastodonTag } from "../types";
export declare function getParticipatedHashtagToots(): Promise<Toot[]>;
export declare function getRecentTootsForTrendingTags(): Promise<Toot[]>;
export declare function removeMutedTags(tags: MastodonTag[]): Promise<MastodonTag[]>;
