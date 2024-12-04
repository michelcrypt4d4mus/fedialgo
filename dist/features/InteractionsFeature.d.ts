import { mastodon } from "masto";
import { AccountFeature } from "../types";
export default function InteractionsFeature(api: mastodon.rest.Client, _user: mastodon.v1.Account): Promise<AccountFeature>;
