import { mastodon } from "masto";
import { ServerFeature } from "../types";
export default function coreServerFeature(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<ServerFeature>;
