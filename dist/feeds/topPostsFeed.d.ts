import { mastodon } from "masto";
import { StatusType } from "../types";
export default function topPostsFeed(api: mastodon.rest.Client): Promise<StatusType[]>;
