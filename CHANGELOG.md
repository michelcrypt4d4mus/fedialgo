# NEXT RELEASE

### v0.48.3
* Move score statistics stuff out of `Scorer` class and into `stats_helper.ts`

### v0.48.2
* Change format of `TootScore` object, remove `alternateScoreInfo()` and `formatScore()` methods (functionality moved to demo app)
* Rename some config options

### v0.48.1
* (no changes, just a test build)

## v0.48.0
* Add a `FollowedAccountsScorer` to offset the slowly creeping dominance of participated and followed tags in the feed

### v0.47.14
* Add `#government` to the list of "too generic to trend" tags
* (Demo App) Mobile improvements from @nanos

### v0.47.13
* (Demo App) Code improvements

### v0.47.12
* (Demo App) `ErrorBoundary` component to catch any and all errors

### v0.47.11
* (Demo App) Drop down buttons now display the selected option

### v0.47.10
* (Demo App) Fix `LoginPage` redirect (had two frontslashes)

### v0.47.9
* Clear `TheAlgorithm.cacheUpdater` in `reset()`
* Rename `Config` to `config`; convert `config.api.staleDataTrendingMinutes` to method; lower `hashtagTootRetrievalDelaySeconds` to 1 second
* Rename `config.api.backgroundLoadIntervalSeconds` to `backgroundLoadIntervalMinutes`
* Refactor `stats_helper.ts` for Recharts data stuff

### v0.47.8
* Make `Config` a `class` instead of just an object
* Add missing files from last build

### v0.47.7
* Move scorer descriptions out of `config` and into the `Scorer` class
* Bump up default diversity penalty weight to 2.0
* Separate `StorageKey` enum into `CacheKey` for API methods and `AlgorithmStorageKey` for other FediAlgo browser storage

### v0.47.6
* (Demo App) Remove await from `WeightSlider` call to `updateUserWeights()`

### v0.47.5
* (Demo App) Fix build

### v0.47.4
* Compute the average final score per decile of raw/weighted score

### v0.47.3
* (Demo App) Add link in header to `CHANGELOG` and a link for bug reports

### v0.47.2
* Export `MinMaxAvg` and `ScoreStats` types
* (Demo App) Add option to chart raw vs. weighted score stats, avg vs. min vs. max per quartile/decile/etc
* (Demo App) Fix bug in charting of score stats

### v0.47.1
* Add `TheAlgorithm.getRechartsStatsData()` method to prepare data about score statistics for `Recharts` presentation
* (Demo App) Add show stats button to experimental section

## v0.47.0
* Separate out `NonScoreWeightName` and `ScoreName` enums from `WeightName` enum
* Add quintile stats for the feed for each score category to the `getCurrentState()` return object

### v0.46.1
* Set up a poller to periodically save changes to toots' `numTimesShown` property to the cache

## v0.46.0
* Refactor `Config` variables into namespaces
* (Demo App) Fix bug with hashtag color gradient at startup

### v0.45.1
* Truncate the stored home timeline toots array to the same max length as the overall timeline so it doesn't grow forever

## v0.45.0
* Add `AlreadyShownScorer` and `Toot.numTimesShown` property (managed by the client app)
* Drop `WeightName.PARTICIPATED_TAGS` default weight to 0.15

### v0.44.5
* Fix boolean logic for multiple type filters

### v0.44.4
* (Demo App) Use a color gradient for participated hashtag filter coloring

### v0.44.3
* (Demo app) Fix alt text on images

### v0.44.2
* Improve hashtag paragraph detector regex

### v0.44.1
* (Demo App) Tweak CSS for tag paragraph

## v0.44.0
* Add `contentParagraphs()`, `contentNonTagsParagraphs()`, and `contentTagsParagraph()` methods to `Toot` object
* Remove emoji short codes from strings used for language detection
* (Demo App) Display `contentTagsParagraph()` in smaller font and below images/polls/etc (if it exists)

### v0.43.8
* `tootFetcher.name` yields empty string in production so use a logPrefix argument
* (Demo App) Allow multiple filter accordion sections to stay open at the same time

### v0.43.7
* Standardize upgrade repair of all user's filter settings

### v0.43.6
* Generalize upgrading stored boolean filter settings

### v0.43.5
* Handle upgrading stored filter settings (remove deprecated server side filters)

### v0.43.4
* Adjust the `TRENDING` preset to more heavily weight number of replies and retoots, `DISCUSSIONS` preset to more heavily weight `PARTICIPATED_TAGS` and `INTERACTIONS`, and bump up a lot of `FRIENDS` preset related weights
* Lower `Config.tootsCompleteAfterMinutes` to 24 hours

### v0.43.3
* Add min/max score to `TheAlgorithm.statusDict()`
* (Demo App) Add icon for bot account toots

### v0.43.2
* Remove `TheAlgorithm.logCurrentState()` method
* Drop `Config.toots.maxCachedTimelineToots` to 3,000

### v0.43.1
* (Demo App) Fix bug with action button count comparison

## v0.43.0
* Add filter for `TypeFilterName.BOT`
* Export `isValueInStringEnum()` helper, `KeysOfValueType` type
* (Demo App) Enable unfollowing accounts

### v0.42.1
* Rename `ScorerDict` type to `WeightInfoDict`
* Remove `BooleanFilterName.SERVER_SIDE_FILTERS` (toots that match server side filters are now stripped out as invalid in `buildToots()`)

## v0.42.0
* Sort trending toots by `trendingRank`
* (Demo App) Render the trending toots using the `StatusComponent`

### v0.41.6
* Add `mastodon.gamedev.place` to the list of `noMauServers`
* Remove invalid toots in `Toot.buildToots()`
* Refactor `Toot.uniqFlatMap()` method

### v0.41.5
* (Demo App) Add missing `Confirmation.tsx` file

### v0.41.4
* Filter out toots matching the server side filters altogether (in particular from the list of trending toots)
* Use `split()` method to separate `Toot`s needing completion from those that are complete

### v0.41.3
* Re-optimize `Toot` completion

### v0.41.2
* Speed up re-filtering of the feed during `refreshMutedAccounts()`
* Export `WeightPresetLabel` enum

### v0.41.1
* (Demo App) Fix account tooltip when control panel isn't sticking to top by moving it into the feed `<div>`

## v0.41.0
* (Demo App) Add mute and follow account buttons
* Add `refreshMutedAccounts()` method to `TheAlgorithm`

### v0.40.8
* (Demo App) link to repo in header

### v0.40.7
* (Demo App) Error handling around initial app registrations

### v0.40.6
* (Demo App) minimally validate server URLs on LoginPage

### v0.40.5
* Add `getFavouritedToots()` to `moar_data_poller` call

### v0.40.4
* Add `Config.tootsCompleteAfterMinutes` to set an upper bound on how old toots can be before we assume there will be no new info about trending tags/links/etc to re-evaluate for them

### v0.40.3
* (Demo App) Extract the `REPO_NAME` and `REPO_URL` from `package.json`

### v0.40.2
* Add `Config` to `getCurrentState()` response

### v0.40.1
* Decrease production logging

## v0.40.0
* Add a "spoilered" filter for toots with `spoiler_text`
* Add a "private" filter for non public, followers only toots
* Turn on minor `Toot.dedupeToots()` optimization
* Fix collation of `favourited`, `reblogged`, and `bookmarked` flags in `dedupeToots()`, add collation of `filtered` property
* Optimize type filter matching

### v0.39.9
* Make `TheAlgorithm.isDebugMode` a static variable set at run time

### v0.39.8
* More futzing with type exports

### v0.39.7
* Export types with `export type`

### v0.39.6
* Fix toot type filtering for retooted audio/image/video attachments and sensitive toots

### v0.39.5
* ~~Remove unnecessary exports of `TrendingLink`, `TagWithUsageCounts`, `FeedFilterSettings`, `Weights` types~~

### v0.39.4
* Remove HTML tags from `Toot.content` field when scanning for hashtags and keywords with `containsString()`

### v0.39.3
* ~~Stop exporting unnecessary `BooleanFilter` and `NumericFilter` type~~
* `Drop `TrendingTags` weight to 0.2`

### v0.39.2
* Filter out zero weighted scores from `Toot.alternateScoreInfo()`

### v0.39.1
* ~~Stop exporting unnecessary `WeightName` type~~

## v0.39.0
* Rename `PresetWeights` constant to `WEIGHT_PRESETS`, stop exporting `PresetWeightLabel`, add `TheAlgorithm.weightPresets` property

### v0.38.1
* Ensure `triggerPullAllUserData()` sets `loadingStatus` to null if there's an exception

## v0.38.0
* **(BREAKING CHANGE)** Export `TheAlgorithm` as the default export from `fedialgo` package instead of a named export
* Add `displayNameFullHTML()` to `Account` object
* Fix bug with upgrading stored filter args
* (Demo App) Add icon link to show the raw Toot JSON in a modal

### v0.37.2
* Add `getCurrentState()` method to `TheAlgorithm`

### v0.37.1
* Change `Toot.alternateScoreInfo()` format
* Rename `TheAlgorithm.logWithState()` to `logCurrentState()`

## v0.37.0
* **(BREAKING CHANGE)** Rename `PropertyFilter` to `BooleanFilter`, `PropertyName` to `BooleanFilterName`, `FeedFilterSettings.filterSections` to `FeedFilterSettings.booleanFilters`

### v0.36.1
* Remove diacritics from tag names

## v0.36.0
* Incremental load of stale data when possible instead of complete refresh; move staleness config to `Config.apiDefaults`
* (Demo App) Move the error modal up to `<App>` level; propagate setError

### v0.35.3
* (Demo App) mobile support

### v0.35.2
* (Demo App) user data view params

### v0.35.1
* Fix bug where followed tags weren't being lowercased before ending up in `UserData` if they were loaded from the cache

## v0.35.0
* Add a new `FavouritedTagsScorer` (and a new `UserData.favouritedTagCounts` property)
* Add `TheAlgorithm.pullAllUserData()` method to enable full backfill of user data
* Add "Experimental Features" section to the demo app
* Fix bug where new scorer weights were not automatically getting set to defaults
* Remove trending tags from the list of participated tags we're pulling toots for because we get them anyways
* Fix bug where home timeline toot cache would just grow (dedupe on the way in)
* Add `API_DEFAULTS` configuration
* Rename `ScoreInfo` type to `WeightInfo`, rename `TheAlgorithm.scorersDict` to `weightInfo`
* Fix bug in `sortObjsByProps()` when called with multiple sort params

## v0.34.0
* Use a value for the user displayed TIME_DECAY param that is 10x the value used in the calculation to make it more user friendly.
* Increase cached toots default config to 3,500
* `HomeTimelineParams` interface and helper in `TheAlgorithm`

### v0.33.8
* More language detection cleanup

### v0.33.7
* Fix language fall through logic, clean up code

### v0.33.6
* Consolidate language detection stuff in `language_helper.ts`

### v0.33.5
* Language detection for toots that need it
* Add toot.io to no trending link servers
* (Demo App) Hide link previews checkbox

### v0.33.4
* Set name and storeName of localForage browser storage (used by Storage)

### v0.33.3
* Rename `TypeFilterName.REPOSTS` to `RETOOTS`
* Add `ageInHours()` helper; allow age related fxns to take second arg; add `homeFeedTimespanHours` to `statusDict()`

### v0.33.2
* Keep `Toot.reblogsBy` sorted by `displayName`

### v0.33.1
* Return existing score instead of 0 if `Scorer` isn't ready yet (if it exists)

# v0.33.0
* Sort built toots by their preliminary score, not by their popularity
* Increase default `FOLLOWED_TAGS` weight to 4
* Decrease default `TRENDING` weight to 0.15
* Add `Toot.getScore()` method
* Add `Config.batchCompleteTootsSize` param, rename `Config.batchCompleteTootsSleepBetweenMS`

### v0.32.1
* Separate out the backfill functionality to `TheAlgorithm.triggerHomeTimelineBackFill()`
* Improve `Storage.dumpData()` method; remove unused `StorageKey`s

# v0.32.0
* Add `moreOldToots` parameter to `triggerFeedUpdate()`
* Fix bug where `getParticipatedHashtag()` toots wasn't returning a promise
* Up `Config.toots.maxCachedTimelineToots` to 2,500
* Remove unused `Config.reloadFeaturesEveryNthOpen` param

### v0.31.3
* Set `sideEffects: false` in `package.json` so webpack can tree shake (again)

### v0.31.2
* (Demo App) fix icons

### v0.31.1
* Change `DEBUG` env var to `FEDIALGO_DEBUG`, export `isDebugMode`

# v0.31.0
* Increase default `TIME_DECAY` from 0.05 to 0.15
* Change constructor argument from `language` to `locale`
* Add `Account.noteWithAccountInfo()` method

### v0.30.12
* Increase `Config.numParticipatedTagTootsPerTag` to 10
* `TheAlgorithm.tagUrl()` method

### v0.30.11
* `QUICK_MODE` env var limits initial data pull same as `DEBUG` env var
* Fix bug where `TheAlgorithm.mastodonServers` were not loaded from cache
* Lower `Config.OUTLIER_DAMPENER` to 1.6

### v0.30.10
* Remove `sideEffects: false` from both fedialgo and demo app `package.json` and put back `<link>` tag in `index.html` because a lot of CSS disappeared

### v0.30.9
* Rename `TrendingTag` type to `TagWithUsageCounts`

### v0.30.8
* Set `sideEffects: false` in `package.json` so webpack can tree shake

### v0.30.7
* Add a way to do a second pass to get the HASHTAG counts right with `updateHashtagCounts()` (but don't actually use it)
* Increase `Config.maxConcurrentRequestsBackground` to 8
* More default servers

### v0.30.6
* Generate a new Array when updating filter valid values so as to trigger a `useMemo()` recomputation in demo app
* Shuffle the `Config.defaultServers` when adding additional servers to mix it up
* Configure `TAG_ONLY_STRINGS` to avoid using `containsString()` to scan for tags like "us" and "it"
* `loadingStatus` no longer assumes "Loading" will be prepended

### v0.30.5
* Suppress a bunch of language hashtags (japanese, russian, greek, korean, arabic) if they don't match the configured language
* Export `sortKeysByValue()`

### v0.30.4
* `ChaosScorer._score()` returns the existing raw score before computing a new one
* Filter out Japanese hashtags unless `Config.locale.language` is "ja"

### v0.30.3
* Special `mediaAttachment` repair for bluesky bridged toots
* Add `TypeFilter` for `IMAGES`, `VIDEO`, and `AUDIO`
* Add `numTriggers` counter

### v0.30.2
* Set `isFollowed` in `getFollowedAccounts()`, always `Account.build()` starts `isFollowed` as false
* Fixes to `Toot.dedupeToots()`, which was kind of broken because of uniquifying on retoot `realURI()` and randomly choosing retoots or real toots in final step
* Only penalize the "trending" parts of followed accounts & tags toots (last change was no penalty at all)
* Lowercase `Account.buildWebfingerURI()`
* Bump up `minRecordsForFeatureScoring` to 480
* Load `Algorithm.homeFeed` from cache on startup

### v0.30.1
* Call `Toot.complete()` in batches of 50 instead of 100, increase sleep time to 250ms from 200
* Don't penalize toots from followed accounts and tags with `TRENDING` modifier if it's less than 1 (and thus a penalty)
* Apply the `OUTLIER_DAMPENER` to the `DiversityFeedScorer` penalty
* Move the `isFollowed` property to `Account` instead of `Toot`
* Add `Toot.isFollowed()` method
* Tweak `Toot.containsTagsMsg()` string

## v0.30.0
* (Demo App) Implement viewing and voting in Mastodon polls
* `timeString()` helper now puts "this coming" prefix for future days

### v0.29.7
* Export `isAccessTokenRevokedError()`

### v0.29.6
* Deal with bug where Toot's followedTags property was getting lost
* Add `TheAlgorithm.mostRecentHomeTootAgeInSeconds()` method
* (Demo App) Revamp `useAlgorithmContext`

### v0.29.5
* (Demo App) Tooltip text for auto load checkbox

### v0.29.4
* Add `TheAlgorithm.isDebug` property

### v0.29.3
* `FollowedAccounts` and `RecentNotifications` are pulled in batches of 80 records instead of 40; `FollowedTags` pulled in batches of 100
* `fetchHomeFeed()` has `skipMutex=true`
* Bump up `TRENDING` weight to 0.25

### v0.29.2
* Add `Config.lookbackForUpdatesMinutes` param and scan backwards from the `maxUpdatedAt` that many more minutes to catch changes
* Add a check for `LOAD_TEST=true` env var that dramatically bumps up the number of toots to retrieve
* Rename `Config.toots.maxAgeInDays` (was hours increment), add age check to `Toot.isValidForFeed()`

### v0.29.1
* Add `Config.isAppFilterVisible` boolean
* Add `Toot.completedAt` and `shouldComplete()`, rename `Toot.setDependentProperties()` to `completeProperties()`
* Add `Config.sleepBetweenCompletionMS` to avoid overloading browser with `completeToots()`

## v0.29.0
* Defer processing of the most expensive `Toot` properties (`trendingLinks`, mostly, but other tag stuff too) until all data has arrived
* `fetchHomeFeed()` now infers the `maxTootedAt` param from the cached `HOME_TIMELINE` toots
* New private property `TheAlgorithm.homeFeed: Toot[]`
* Rename `Config.api.backgroundLoadIntervalSeconds`
* Add `validateConfig()`

### v0.28.1
* `UserData.followedTags` is now a `TagNames` dict

# v0.28.0
* `Toot.containsString()` also checks the link preview card text
* Add a `Toot.participatedHashtags` property and corresponding filter
* Rename `HASHTAG_PARTICIPATION` to `PARTICIPATED_TAGS`; add participated hashtags to `Toot.containsTagMsg()`

### v0.27.4
* Export a `NON_SCORE_WEIGHTS` array for `TIME_DECAY` etc.

### v0.27.3
* (Demo App) Add missing `Showcase.jpg` file to repo

### v0.27.2
* Massively rework how loading of home timeline toots is accomplished

### v0.27.1
* Add a language argument to Algorithm.create() and choose servers for trending toots based on it
* Refactor `lockExecution()`

## v0.27.0
* Add a Sensitive (NSFW) `TYPE_FILTER`
* Add `OutlierDampener` weighting option

### v0.26.3
* Add `Config.numParticipatedTagTootsPerTag` option and set it to 5 so we pull far less participated tag toots
* Add UserData.languagesPosted in and UserData.preferredLanguage

### v0.26.2
* Don't set `catchupCheckpoint` if the feed is empty
* Fix bug where `Account.webfingerURI` field was not getting set

### v0.26.1
* Lower `Config.incrementalLoadDelayMS` to 500 ms
* (Demo App) Fix bug with missing `mostRecentAt`

## v0.26.0
* Use `class-transformer` package to serialize and deserialize objects (which will hopefully improve speed)

### v0.25.4
* Fix bug where changes to the feed would invalidate old FeedFilterSettings in the GUI
* Add `Config.invalidTrendingTags` param to list tags that are too generic to be used
* `TheAlgorithm.reset()` also resets concurrency

### v0.25.3
* Add a `source` property to `Toot` class
* (Demo App) Reduce the `numDisplayedToots` if user scrolls up enough

### v0.25.2
* `DiversityFeedScorer` also penalizes trending tags that show up more than `Config.minTrendingTagTootsForPenalty` times
* Rename `Config.homeTimelineBatchSize`
* Automatically serialize or deserialize toots to/from `Storage.get/set` based on values in `STORAGE_KEYS_WITH_TOOTS`
* Configure `STORAGE_KEYS_WITH_ACCOUNTS`, `STORAGE_KEYS_WITH_UNIQUE_IDS`, call unique checker in debug mode loading from `Storage`

### v0.25.1
* Expose `TheAlgorithm.isLoading()` method
* `triggerFeedUpdate()` is no longer called recursively

## v0.25.0
* **[BREAKING CHANGE]** Rename `TheAlgorithm.getFeed()` to `triggerFeedUpdate()`. No longer returns anything.
* **[BREAKING CHANGE]** Rename `setFeedInApp` param to `setTimelineInApp`
* Simplify the alternate score dict
* Disallow setting the catchup checkpoint before the overall app timeline cutoff
* UserData object now just stores a lookup dict for `followedAccounts` instead of all the actual followed `Account` objects
* Refactor generic `Account.buildWebfingerUriLookup()` method
* Refactor `TheAlgorithm.setCheckpointAndLoadingStatus()` method
* Add delay of `Config.api.hashtagTootRetrievalDelaySeconds` to the initial loading of the trending and participated hashtag toots
* Rename `setLoadingStateVariables()` and `setLoadCompleteStateVariables()`

### v0.24.6
* `MastoApi.instance.setBackgroundConcurrency()`, `Config.maxConcurrentRequestsBackground` option. Handle missing `Storage.getIdentity()` if possibl
* Ignore retoots when computting users hashtag history

### v0.24.5
* Remove blocked keywords (no bueno) and followed tags (they show up on their own) from the list of tags to scan for new toots

### v0.24.4
* Re-raise access token revoked errors in `mergePromisedTootsIntoFeed()`

### v0.24.3
* Double `Config.numParticipatedTagsToFetchTootsFor` to 20
* Make type filters apply properly to retoots
* Get rid of useless UserDataSerialized type

### v0.24.2
* Rename `Toot.simplifiedScoreInfo()` to `alternateScoreInfo()`
* Remove deprecated `Config.enableIncrementalLoad` property
* Privatize a bunch of `TheAlgorithm` properties that should be private

### v0.24.1
* Lower `Config.maxRecordsForFeatureScoring` to 1,600, `numTrendingTagsToots` to 200
* `HashtagParticipationScorer` uses the square root of the number of participations to tamp down runaway scores.
* Use a Semaphore to limit concurrency of hashtag search API requests; add `Config.maxConcurrentTootRequests`
* Exclude followed tags from the pulling of hashtag participation toots (followed tags are already in timeline)
* Refactor common handling for cacheable toot fetches

# v0.24.0
* Rename `Config.maxTimelineTootsToFetch` to `Config.maxInitialTimelineToots`
* Create a `UserData` object, expose a `userData` prop on `TheAlgorithm`
* `repairTag()` now replaces the `tag.url` property with link to the tag on the user's homeserver

### v0.23.1
* (Demo App) Add a section for hashtags the user participates in
* Add `Toot.simplifiedScoreInfo()` method

# v0.23.0
* Add `HashtagParticipationScorer` and import recent toots that contain hashtags the user participates in often in the feed
* Poll for old records after initial load with `setInterval()`. Add `Config.backgroundLoadIntervalMS` and `Config.maxRecordsForFeatureScoring` variables

### v0.22.4
* Add the **MOAR** feature to inch towards continued backfilling of user data later on, after the initial load is not busy

### v0.22.3
* Add `trendingRank` to `Toot.popularity()`
* Standardize boolean logic around cache hits and misses
* Add `mastodon.art` to list of no MAU servers
* Reduce `Config.minRecordsForFeatureScoring` to 240 in the hopes of improving startup speed (see TODO section of README)

### v0.22.2
* Add lastLoadTimeInSeconds prop to TheAlgorithm

### v0.22.1
* Upgrade `masto.js` to v7.0.0
* Decrease `Config.numTootsPerTrendingTag` to 15, increase `Config.numTrendingTagToots` to 250

# v0.22.0
* Parallelize the initial load as much as possible
* Use a looser definition 'containing' a hashtag: a toot contains a hashtag even if it just has the name of the hashtag as a substring (without the leading `#`)
* `UserData.followedTags` is just an array of Tags

### v0.21.4
* Use the `/api/v1/timelines/tag/:hashtag` endpoint to pull trending tag toots in addition to search endpoint
* Log the `Instance` server info dict all at once
* Increase Config.numTrendingTagToots from 100 to 150

### v0.21.3
* Add MastodonServer.fetchServerInfo() method to fetch all the available mastodon.v2.Instance data about the server instead of just MAU data

### v0.21.2
* Checkin missing `dist/` changes from last release

### v0.21.1
* `timeString()` method accepts locale argument
* Move the bulk of the scoring code to `Scorer.scoreToots()` method

## v0.21.0
* Add `TheAlgorithm.reset()` method to completely clear browser storage
* Export `timeString()` helper method
* Add `Toot.realToot()` helper to find reblogs
* Add `TheAlgorithm.statusMsg()` helper

### v0.20.14
* Rename `TheAlgorithm.mostRecentTootAt()` to `TheAlgorithm.mostRecentHomeTootAt()`
* `Storage.getToots()` returns `null` instead of `[]` if there's nothing in local storage

### v0.20.13
* Move `getRecentTootsForTrendingTags()` to `MastoApi`
* Move `getMastodonServersInfo()` from `MastoApi` class to `MastodonServer` class

### v0.20.12
* Add `Config.staleDataSeconds` dictionary to enable customized data refresh rates (rename old `Config.staleDataSeconds` to `Config.staleDataDefaultSeconds`)
* Implement `catchupCheckpoint` logic so that refocusing the app will always poll new toots back to the last home timeline toot we already have
* Refactor trending history methods to `trending_with_history.ts`

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
* Add `Toot.setDependentProps()` static method to set props for array of `Toot` objectss. move the setting of those props to the calls like `MastoApi.fetchHomeFeed()` that do the initial Toot object building

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
* Add `Config.staleDataDefaultSeconds` param, consolidate `Storage.isStaleData()` method
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
* Limit length of feed to `maxCachedTimelineToots` only after scoring and sorting
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
* Lower `Config.maxInitialTimelineToots` to 1,200

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
* Increase `Config.maxInitialTimelineToots` to 1500

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
