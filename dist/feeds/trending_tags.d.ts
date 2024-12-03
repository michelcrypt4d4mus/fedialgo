import { mastodon } from "masto";
import { TrendingTag } from "../types";
export default function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]>;
