import { mastodon } from "masto";
import { AccountFeature } from "../types";
export default function InteractionsFeature(api: mastodon.rest.Client): Promise<AccountFeature>;
