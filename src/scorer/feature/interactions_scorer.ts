/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import Account from "../../api/objects/account";
import AccountScorer from "../acccount_scorer";
import MastoApi from "../../api/api";
import { StringNumberDict, WeightName } from "../../types";


export default class InteractionsScorer extends AccountScorer {
    constructor() {
        super(WeightName.INTERACTIONS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const notifications = await MastoApi.instance.getRecentNotifications();
        const interactionAccounts = notifications.map(notification => Account.build(notification.account));
        return Account.countAccounts(interactionAccounts);
    };
};
