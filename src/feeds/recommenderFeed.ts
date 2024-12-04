import { camelCase } from "change-case";
import { mastodon } from "masto";

import { Toot } from "../types";
import { transformKeys } from "../api";


export default async function getRecommenderFeed(_api: mastodon.rest.Client, _user: mastodon.v1.Account): Promise<Toot[]> {
    let data, res;
    try {
        res = await fetch("http://127.0.0.1:5000")
        data = await res.json()
    } catch (e) {
        console.log(e)
        return [];
    }
    if (!res.ok) {
        return [];
    }
    const statuses = data.statuses.map((status: Toot) => {
        status.recommended = true;
        return status;
    })
    return transformKeys(statuses, camelCase);
};
