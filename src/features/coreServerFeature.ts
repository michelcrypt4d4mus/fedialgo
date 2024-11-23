/*
 * Handles getting things like monthly active users about the various servers in the Fediverse.
 */
import { mastodon } from "masto";

import { mastodonFetch, mastodonFetchPages } from "../helpers";
import { ServerFeature } from "../types";

const NUM_SERVERS_TO_CHECK = 30;
const NUM_SERVERS_TO_RETURN = 20;
const SERVER_RECORDS_TO_PULL = 80;
const NUM_SERVER_PAGES_TO_PULL = 10;


export default async function coreServerFeature(
    api: mastodon.rest.Client,
    user: mastodon.v1.Account
): Promise<ServerFeature> {
    const results = await mastodonFetchPages<mastodon.v1.Account>(
        api.v1.accounts.$select(user.id).following.list,
        NUM_SERVER_PAGES_TO_PULL,
        SERVER_RECORDS_TO_PULL
    );

    console.log(`coreServerFeature() results pulled with mastodonFetchPages(): `, results);

    // Count up what Mastodon servers the user followss live on
    const serverFrequ = results.reduce(
        (accumulator: ServerFeature, follower: mastodon.v1.Account) => {
            const server = follower.url.split("@")[0].split("https://")[1];
            accumulator[server] = (accumulator[server] || 0) + 1;
            return accumulator;
        },
        {}
    );

    console.debug(`coreServerFeature() serverFrequ: `, serverFrequ);
    const popularServers = Object.keys(serverFrequ)
                                 .sort((a, b) => serverFrequ[b] - serverFrequ[a])
                                 .slice(0, NUM_SERVERS_TO_CHECK)
    console.debug(`Top ${NUM_SERVERS_TO_CHECK} servers: `, popularServers)

    const monthlyUsers = await Promise.all(popularServers.map(server => {
        const serverMonthlyUsers = getMonthlyUsers(server);
        console.log(`Monthly users for ${server}: `, serverMonthlyUsers);
        return serverMonthlyUsers;
    }));

    const overrepresentedServerFrequ = popularServers.reduce((acc, server, index) => {
        const activeUsers = monthlyUsers[index];
        if (activeUsers < 10) return acc;
        const ratio = serverFrequ[server] / activeUsers;
        return { ...acc, [server]: ratio }
    }, {});

    console.log(`overrepresentedServerFrequ: `, overrepresentedServerFrequ);
    return overrepresentedServerFrequ;
};


async function getMonthlyUsers(server: string): Promise<number> {
    try {
        const instance = await mastodonFetch<mastodon.v2.Instance>(server, "api/v2/instance");
        console.debug(`monthlyUsers() for '${server}', 'instance' var: `, instance);
        return instance ? instance.usage.users.activeMonth : 0;
    } catch (error) {
        console.warn(`Error fetching data for server ${server}:`, error);
        return 0; // Return 0 if we can't get the data
    }
};
