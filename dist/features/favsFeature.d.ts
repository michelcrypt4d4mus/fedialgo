import { mastodon } from "masto";
import { AccountFeature } from "../types";
export default function FavsFeature(api: mastodon.rest.Client): Promise<AccountFeature>;
