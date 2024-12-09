import { mastodon } from "masto";
import Toot from "../api/objects/toot";
export default function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]>;
