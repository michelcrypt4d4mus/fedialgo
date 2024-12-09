import { mastodon } from "masto";
import Toot from "../api/objects/toot";
export default function getTrendingToots(api: mastodon.rest.Client): Promise<Toot[]>;
