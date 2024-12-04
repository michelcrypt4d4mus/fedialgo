import { mastodon } from "masto";
import { ServerFeature } from "../types";
export default function coreServerFeature(followedAccounts: mastodon.v1.Account[]): Promise<ServerFeature>;
