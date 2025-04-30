# NEXT RELEASE

### v0.20.11
* `Toot.buildToots()` helper method

### v0.20.10
* Store an `updatedAt` value with each data object in the browser storage and use that to determine what data is actually stale
* Init `TheAlgorithm.loadingStatus` with `"(ready to load)"` during construction so it isn't empty until load is complete
* Refactor a common fetchTrendingFromAllServers() method wrapper
* Sort trending toots correctly

### v0.20.9
* (Demo App) Make the refresh handling actually work by moving required vars and code into `useEffect()` blocks
* Force repull of trending data if the cache returns an empty array
* Call setDependentProperties() on result of fediverseTrendingToots()
* Set `Toot.trendingTags` property more accurately in setDependentProperties()
* Add `Config.excessiveTagsPenalty` param

### v0.20.8
* `RetootsInFeedScorer` can use `Toot.reblogsBy.length` to score (and therefore doesn't need to be a `FeedScorer`)
* `RetootsInFeedScorer` scores with the square of the number of retooting accounts the user follows
* Remove `TrendingLinksScorer.trendingLinks` property
* Stop mutating the `Toot` objects in `FollowedTagsScorer` (now happens in `Toot.setDependentProperties()`)
* Set `Toot.muted` where necessary in `Toot.setDependentProperties()`
* Add Toot.setDependentProps() static method to set props for array of Toots. move the setting of those props to the calls like MastoApi.fetchHomeFeed() that do the initial Toot object building

### v0.20.7
* Consolidate all `Toot` post processing to `Toot.setDependentProperties()` method
* (Optimization) Make Account.webfingerURI a string instead of a method that returns a string

### v0.20.6
* Remove trending toot fetching from `MastoApi.getTimelineToots()` (remove the method, actually). `TheAlgorithm.getFeed()` now handles trending toot retrieval
* Penalize trending tag toots if they have more than `Config.excessiveTags` total tags
* Add `Config.timelineDecayExponent` param

### v0.20.5
* Use reverse chronological order sort in `DiversityFeedScorer`
* Stop mutating `DiversityFeedScorer.scoreData` during scoring
* Score toots with parallelized Promises instead of serially, add `Config.scoringBatchSize` param

### v0.20.4
* Add `Config.staleDataSeconds` param, consolidate `Storage.isStaleData()` method
* Add a 5 second timeout to public API calls via new `Config.timeoutMS` param
* Implement a reload based on time of most recent toot in timeline (10 minutes is the trigger)
* Get rid of unnecessary `Toot.resolveAttempted` flag

### v0.20.3
* Optimize to only scan for and set `Toot.trendingLinks` once if possible
* Make `Toot.imageAttachments`, `videoAttachments`, etc. computed once in `Toot` constructor instead of methods

### v0.20.2
* Repair media attachments with URL arguments in `remoteUrl`
* Lower time between timeline pulls to 1 second
* Make scorers work with the original toot, not just with the retoot
* Use time of retoot not just original toot when scoring retoots
* Bump up `TRENDING` weight to 0.15

### v0.20.1
* Add scores for retooted account to `MostFavoritedAccountsScorer` and `MostRepliedAccountsScorer`
* Load followed accounts and tags in `getUserData()`, store a `UserData` object on `MastoApi`
* Refactor `initializeFiltersWithSummaryInfo()` to `feed_filters.ts`

## v0.20.0
* (Demo App) Add ability to bookmark toots
* Limit length of feed to `maxNumCachedToots` only after scoring and sorting
* Refactor filters serialize/deserialize methods to `feed_filters.ts`

### v0.19.8
* Use lowercase when detecting a Toot's trending links
* Use lowercase when uniquifying trending links & tags

### v0.19.7
* Set all weights to 0 for CHRONOLOGICAL preset
* Remove `Toot.reblogsByAccts()` method
* Refactor `uniquifyByProp()` collection helper
* Include toots with trending links in LINKS filter even if they don't have link cards

### v0.19.6
* Remove `Toot.attachmentPrefix()` method

### v0.19.5
* `Toot.containsTagsMsg()` method

### v0.19.4
* `npm audit fix` a `react-router-dom` vulnerability in the demo app

### v0.19.3
* Add filter for Toots that mention the fedialgo user
* Check in missing `dist/` files

### v0.19.2
* Add `.gif` to `IMAGE_EXTENSIONS`
* Store `TheAlgorithm.mastodonServers` sooner
* Unify blocked/muted account handling
* Refactor `shuffle()` method for arrays
* Lower default `NUM_FAVOURITES` weighting
* Add `Config.noTrendingLinksServers` so we can skip scraping trending links from servers that don't support it.
* Lower `Config.maxTimelineTootsToFetch` to 1,200

### v0.19.1
* Rename `TheAlgorithm.extractSummaryInfo()` to `TheAlgorithm.initializeFiltersWithSummaryInfo()`
* Allow things that user has reblogged into the feed
* `Toot.realAccount()` method

## v0.19.0
* Preserve `MastodonServersInfo` information like MAU
* Tweak `Toot.describe()` string

### v0.18.5
* Use `Account.webfingerURI` instead of `Account.acct`
* Add `.webp` to `IMAGE_EXTENSIONS`
* Get rid of `Toot.homserverAccountURL()`

### v0.18.4
* Rename `RetootedUsersScorer` to `MostRetootedUsersScorer`
* Remove unused exports for `TIME_DECAY` and `TRENDING`

### v0.18.3
* Introduce `Account` class

### v0.18.2
* Increase `Config.maxTimelineTootsToFetch` to 1500

### v0.18.1
* Cache the user's server side filter settings

## v0.18.0
* Expose `TheAlgorithm.mastodonServers` property

### v0.17.4
* Fix duplicates ending up in `Toot.reblogsBy` on page reloads
* Add `TheAlgorithm.loadingStatus` message
* Add `DISCUSSIONS` preset; tweak `TRENDING` preset

### v0.17.3
* Test release

### v0.17.2
* Tweak `TRENDING` preset

### 0.17.1
* Refactor `MediaCategory` enum
* Explicitly export all objects and variables required by the demo app
* Exclude `mstd.social` from default servers
* Add `Reverse Chronological" preset algo

## 0.17.0
* Configure various algorithm weight presets that can be selected via `PresetWeights` object
* Add `TootScore.weightedScore` variable; make `Toot.weightedScores` object values reflect the trending multiplier
* Resolve Toot to self (and log error) if there's an API failure when resolving
* Add `Toot.ageInSeconds()` and `Toot.ageInHours()` methods

### 0.16.9
* Include `Toot.repliesCount` when scoring `Toot.popularity()`
* Add optional maxChars arg to `Toot.contentShortened()`

### 0.16.8
* Replace links with `[domain.name]` in trending link titles
* Prefix trending links with `[domain.name]`

### 0.16.7
* Remove unused learnWeights related cruft
* Add account name when describing no text Toots in trending list

### 0.16.6
* `Toot.homeserverURL()` method to allow linking on the user's mastodon instance instead of remote servers
* Fix display of image/video/audio only toots in Trending Toots section

### 0.16.5
* Better handling of no text toots in `Toot.contentShortened()`

### 0.16.4
* Store and reload trendingToots; add `Toot.contentShortened()` method

### 0.16.3
* [Demo App] Add Stick To Top checkbox for left panel

### 0.16.2
* Preserve `TheAlgorithm.trendingLinks` for use in client
* Save trending links and data to local storage

### 0.16.1
* Bump `image-size` package for vulnerability fix (`npm audit fix`)

## 0.16.0
* `Algorithm.buildTagURL()` helper method
* Extract and preserve `TheAlgorithm.trendingTags` for use in client
* `DiversityFeedScorer` logs at DEBUG level
* [Demo App] "What's Trending" accordion section

## 0.15.3
* Fix miscased `Scorer.ts` files in `dist/` package.

## 0.15.2
* Fix `unknown` media type for video files with extension `.mp4`

## `0.15.1`
* Fix demo app dependency

## `0.15.0`
* Make `Poll` a filterable type

## `0.14.2`
* [bug] Force removal of duplicats `Toot.reblogsBy` values
* Exclude `bsky.brid.gy` from MAU numbers

## `0.14.1`
* Make sure `trendingRank` is set correctly on trending toots retooted by people you follow

## `0.14.0`
* `accountNameWithEmojis()` and `Toot.contentWithEmojis()` API methods

## `0.13.4`
* [bug] Remove dupes from `Toot.reblogsBy` array
* Unified `Toot.realURI()` method
* Tweak default weights

## `0.13.3`
* Convert `Toot.reblogBy` (an `Account`) to `Toot.reblogsBy` (an `Account[]`)
* Make `DiversityFeedScorer` properly account for retoots

## `0.13.2`
* [bug] Fix retoots being scored based on the retooter not on the original toot

## `0.13.1`
* [bug] `videoAttachments()` wasn't including `gifv` videos
* [bug] export `WeightName` enum for usage in client app

## `0.13.0`
* Adjustable global `Trending` multiplier that's applied to cumulative score of trending toots of all types

## `0.12.0`
* Add `TrendingLinksScorer` to boost toots that contain Fediverse-wide trending links
* `TrendingTagsScorer` uses max of `numAccounts` not `log2(sum(numAccounts))`
* Add blocked accounts to muted account list
* [bug] Add `@server.com` string to `Account` objects for users on the home server that didn't have it.

## `0.11.0`
* Add `MentionsFollowedScorer`
* Add handling for audio `mediaAttachment`

## `0.10.1`
* Refactor a `MastodonServer` class for calls to the public API

## `0.10.0`
* Add `Toot.isDM()` instance method and filter option
* Stop muted accounts from sneaking into the feed via trending toots

## `0.9.1`
* `DiversityFeedScorer` sorts by MD5 of id to get random but repeatable ordering so scores don't bounce around as incremental loads happen
* `ChaosScorer` uses a hashing function to generate a deterministic score instead of `Math.random()`
* Don't decide whether to reload feed (leave that to the client app using this package)

## `0.9.0`
* (demo app) switch to sort filters by count instead of by name

## `0.8.6`
* Remove followed servers that don't meet MAU requirements from trending data
* Standardize caching of data fetched from Mastodon

## `0.8.5`
* [bug] Handle `FeatureScorer` not being ready if page is reloaded

## `0.8.4`
* Fix de/serialization of score data on `Toot` objects introduced by `Toot` refactor

## `0.8.3`
* Enable `reloadFeed()` method to return true after 10 minutes has passed since latest toot in timline
* Refactor out a proper `Toot` class

## `0.8.2`
* [bug] Fix server side filter application

## `0.8.1`
* Pull and apply server side filters to trending toots manually because user's server side filters can't be applied to toots pulled from other servers

## `0.8.0`
* Add numeric filtering (minimum replies, minimum reblogs, etc)

## `0.7.0`
* Add filtering based on username
* Implement a real incremental load

## `0.6.1`
* Convert the filtering of sources to the standard model
* [bug] Fix doublecounting of toot categories

## `0.6.0`
* Allow inverting filters for apps and languages (not just hashtags)
* Standardize a `FilterSection` object structure for app, language, hashtag, etc. filtering

## `0.5.1`
* Rudimentary ability to keep loading more toots in the background after delivering the first batch

## `0.5.0`
* Add scoring for raw number of retoots
* Centralize configuration and defaults in `config.ts`

## `0.4.0`
* Implement tag based filtering (blacklist and whitelist)

## `0.3.0`
* Implement `TrendingTags` scoring (pull recent toots from tags that are trending into the timeline)
* [bug] Fix followed accounts filter

## `0.2.0`
* Add ability to filter based on the application used to toot
* Repair broken `mediaAttachments` entries if possible

## `2024-12-02` (`0.1.0`)
* Implement live filtering of the feed (for languages, followed tags, etc.)
* Add `setFeedInApp` callback parameter to `TheAlgorithm.create()`
* Remove user's own toots from timeline

## `2024-12-01`
* Introduce `TootScore` type to hold all score info
* filter out toots that match user's configured filters
* Use `localForage` package for persistent state instead of browser's Local Storage which is capped at 10MB
* Use `async-mutex` to limit scoring to one thread at a time
* [bug] `reblogsFeedScorer` should only count retoots
* [bug] reset the diversity scorer when rescoring

## `2024-11-30`
* Refactor `decorateWithScoreInfo()` method
* Rename `scores` => `rawScores` and `value` => `score`

## `2024-11-27`
* Add a `MostRepliedAccounts` score
* Add a list of default servers to check for trending toots if user isn't following very many accounts
* Add 1 to score so if all weights are 0 the timeline is reverse chronological order
* [bug] default to 0 instead of erroring out on reweight

## `2024-11-26`
* Add `FollowedTagsScorer`

## `2024-11-25`
* `reblogBy` should be an `Account` not a string
* Don't filter out replies from feed (filtering replies is now an option on the front end)

## `2024-11-24`
* Add `ImageAttachmentScorer` and `VideoAttachmentScorer`
* Improve scorer descriptions

## `2024-11-23`:
* Make time decay param configurable
* Rename feature scorers
