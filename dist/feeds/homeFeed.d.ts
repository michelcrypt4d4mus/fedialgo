import { mastodon } from "masto";
import { Toot } from "../types";
export default function getHomeFeed(api: mastodon.rest.Client, numToots?: number | null, maxId?: string | number | null): Promise<Toot[]>;
