import { mastodon } from "masto";
import { Toot } from "../types";
export default function topPostsFeed(api: mastodon.rest.Client): Promise<Toot[]>;
