import { mastodon } from "masto";
import { Toot } from "../types";
export default function getTrendingToots(api: mastodon.rest.Client): Promise<Toot[]>;
