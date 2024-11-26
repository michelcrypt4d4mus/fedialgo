import { mastodon } from "masto";
import { TagFeature } from "../types";
export default function FollowedTagsFeature(api: mastodon.rest.Client): Promise<TagFeature>;
