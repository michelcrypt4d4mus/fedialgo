/*
 * Gives higher weight to posts from users that have often interacted with your posts.
 */
import Account from "../../api/objects/account";
import AccountScorer from "./acccount_scorer";
import MastoApi from "../../api/api";
import { type StringNumberDict } from "../../types";
import { ScoreName } from '../../enums';


export default class InteractionsScorer extends AccountScorer {
    description = "Favour accounts that interact with your toots";

    constructor() {
        super(ScoreName.INTERACTIONS);
    }

    async prepareScoreData(): Promise<StringNumberDict> {
        const notifications = await MastoApi.instance.getNotifications();
        const interactionAccounts = notifications.map(notification => Account.build(notification.account));
        return Account.countAccounts(interactionAccounts);
    };
};
