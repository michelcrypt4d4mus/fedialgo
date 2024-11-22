import { mastodon } from "masto";
import { AccountFeature } from "../types";
export default function favFeature(api: mastodon.rest.Client): Promise<AccountFeature>;
