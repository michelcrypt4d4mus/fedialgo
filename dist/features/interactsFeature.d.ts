import { mastodon } from "masto";
import { AccountFeature } from "../types";
export default function interactFeature(api: mastodon.rest.Client): Promise<AccountFeature>;
