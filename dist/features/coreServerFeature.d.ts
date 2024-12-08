import { mastodon } from "masto";
import { AccountNames, ServerFeature } from "../types";
export default function mastodonServersInfo(_api: mastodon.rest.Client, _user: mastodon.v1.Account, followedAccounts: AccountNames): Promise<ServerFeature>;
