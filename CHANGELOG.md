## NEXT
* Convert the filtering of sources to the standard model

## 0.6.0
* Allow inverting filters for apps and languages (not just hashtags)
* Standardize a `FilterSection` object structure for app, language, hashtag, etc. filtering

## 0.5.1
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
