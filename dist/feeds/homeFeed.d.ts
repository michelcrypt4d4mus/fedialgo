import { mastodon } from "masto";
import { Toot } from "../types";
export default function getHomeFeed(api: mastodon.rest.Client): Promise<Toot[]>;
