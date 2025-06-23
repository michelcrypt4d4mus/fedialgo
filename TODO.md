# TODO
1. Get `MastodonServer` errors into the API error messages somehow
1. After muting an account and calling refreshMutedAccounts() somehow the filters stop applying and the whole feed is shown again
1. Make use of the fact that you can see who favourited a post: https://docs.joinmastodon.org/methods/statuses/#favourited_by
1. Why does this happen, where we get two copies of bridged bsky accounts?
   ```json
   "id": "113482690234776099",
   "acct": "youranoncentral.bsky.social@bsky.brid.gy",
   "url" (1): "https://bsky.brid.gy/r/https://bsky.app/profile/youranoncentral.bsky.social",
   "url" (2): "https://bsky.brid.gy/ap/did:plc:mxc7liuon6iq5gzapmmwkq22",
   ```

### What's slow:
According to Chrome profiler it's the retrieval of the user's favourites that is the biggest bottleneck at initial load time. Took ~10 seconds, getting user's old toots took ~5s.
