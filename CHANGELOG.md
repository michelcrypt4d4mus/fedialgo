# NEXT RELEASE

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
