import { mastodon } from "masto";
import { StringNumberDict } from "../types";
export default function FollowedTagsFeature(api: mastodon.rest.Client): Promise<StringNumberDict>;
