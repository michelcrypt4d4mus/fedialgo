# NEXT RELEASE

### v1.2.9

### v1.2.8
* More `tagOnlyStrings`

### v1.2.7
* More `tagOnlyStrings`

### v1.2.6
* More `tagOnlyStrings`

### v1.2.5
* Better fix for "always show followed" filter issue

### v1.2.4
* Fix issue where followed hashtags with 0 toots were showing up in filter list when sorted alphabetically with "always show followed" option enabled

### v1.2.3
* (Demo App) Fix hashtag filter section footer switch layout
* (Demo App) Fix layout for short but wide images in toots

### v1.2.1 - v1.2.2
* More `tagOnlyStrings`

# v1.2.0
* Add `includeFollowed` param to `BooleanFilter` functions
* (Demo App) Add switch for "Always Show Followed" to filters section

### v1.1.59
* (Demo App) Trigger error pop up when a `Toot` fails to resolve to a URL on the user's homeserver

### v1.1.55 - v1.1.58
* More `tagOnlyStrings`

### v1.1.54
* (Demo App) Logging change for poll response

### v1.1.53
* Logging of args for calls to `Logger.error()`
* More `tagOnlyStrings`
* (Demo App) Use branded mastodon favicon

### v1.1.52
* (Demo App) Log calls to `extractText()`

### v1.1.50 - v1.1.51
* More `tagOnlyStrings`

### v1.1.49
* (Demo App) Avoid endless loop when `Toot.resolve()` fails in `ReplyModal`

### v1.1.48
* More `tagOnlyStrings`

### v1.1.47
* Increase `config.api.mutexWarnSeconds` to 10 seconds

### v1.1.46
* (Demo App) Set favicon

### v1.1.44 - v1.1.45
* More `tagOnlyStrings`

### v1.1.43
* Bump `axios` to 1.12.2 via `npm audit fix`

### v1.1.42
* (Demo App) `persistentCheckbox()` takes a `GuiCheckboxName` argument

### v1.1.41
* (Demo App) Move default values for GUI checkboxes into `config.ts`, change default for `allowMultiSelect` to `false`

### v1.1.39 - v1.1.40
* More `tagOnlyStrings`

### v1.1.38
* (Demo App) Use `useAccordion()` for custom API error accordion
* Raise `config.toots.batchCompleteSleepBetweenMS` from 150ms to 210ms because responsiveness is pretty impaired while running
* More `tagOnlyStrings`

### v1.1.36 - v1.1.37
* More `tagOnlyStrings`

### v1.1.35
* (Demo App) Use an `Accordion` for non-fatal error warnings; refactor `ApiErrorsPanel` component

### v1.1.34
* More `tagOnlyStrings`

### v1.1.33
* (Demo App) Set webpack's `devtool` option to `undefined` for production builds to remove source map from `bundle.js` (shrinks bundle from 15 MB to under 3MB)
* (Demo App) Reenable PurgeCSS with more `safelist` options

### v1.1.32
(Demo App) Revert PurgeCSS introduction because it's causing layout weirdness

### v1.1.31
* (Demo App) Add `media-gallery` CSS classes to PurgeCSS `safelist` to fix bug with images not displaying
* Logging of env vars

### v1.1.30
* (Demo App) `npm run build` now writes `bundle.js` to `process.env.BUILD_DIR`

### v1.1.29
* (Demo App) Lock `bootstrap` to version 5.2.3

### v1.1.28
* (Demo App) Use `PurgeCSS` webpack plugin to shrink `bundle.js` output

### v1.1.27
* (Demo App) Use CDN to deliver `bootstrap.min.css`

### v1.1.26
* (Demo App) Use smaller `Showcase.jpg` image on landing screen instead of larger `Showcase.png` version

### v1.1.25
* Logging changes

### v1.1.24
* More `tagOnlyStrings`

### v1.1.23
* Rename `MoarDataPoller` to `UserDataPoller`

### v1.1.21 - v1.1.22
* More `tagOnlyStrings`

### v1.1.20
* Push `MastodonServer` scraping errors into `MastoApi.apiErrors` array for display to user
* Consolidate API error logging to new `MastoApi.recordApiError()` method
* (Demo App) Make non-fatal errors and warnings list yellow instead of red and smaller font

### v1.1.19
* More `tagOnlyStrings`

### v1.1.18
* Refactor `AgeIn` helper class to replace `ageInSeconds()`, `ageInHours()`, etc. and export it

### v1.1.17
* Add `debugWithTraceObjs()` method to `Logger` class

### v1.1.15
* (Demo App) Adjust switchbar checkbox labels

### v1.1.14
* (Demo App) Move filter related switch checkboxes into the "Feed Filters" accordion section
* More `tagOnlyStrings`

### v1.1.13
* (Demo App) Rename `Colored Filter Highlights` switch

### v1.1.12
* Include cause of the error in `TheAlgorithm.apiErrorMsgs` for `Error` objects with non-null `cause` property

### v1.1.11
* Ignore DMs in `MostRepliedAccountsScorer` and `MostFavouritedAccountsScorer`
* More `tagOnlyStrings`

### v1.1.10
* More `tagOnlyStrings`

### v1.1.9
* Double `config.api.maxSecondsPerPage` to 60 seconds wait before throwing an error and halting; just log warning and continue if request took between 30-60 seconds

### v1.1.8
* Add static getters for `isDeepDebug`, `isLoadTest`, and `isQuickMode` to `TheAlgorithmm`
* (Demo App) Debug panel shows current state of environment variables when `NODE_ENV=development`

### v1.1.7
* (Demo App) Make DMs in the timeline have a slightly different background color so they stand out

### v1.1.6
* (Demo App) Adjust `fontSize` for switch labels

### v1.1.5
* (Demo App) Put back switch label spaces; make it just "Stick To Top"

### v1.1.4
* **(BREAKING CHANGE)** Add `fontSize` argument to `Account.noteWithAccountInfo()`, which is now a fxn not a getter
* (Demo App) Add `accountBioFontSize`, `footerHashtagsFontSize`, and `errorFontSize` properties to `config.theme`
* (Demo App) Add `config.timeline.loadTootsButtons` section to make "load toots" link labels and tooltips configurable
* (Demo App) Adjust monospace font slightly
* (Demo App) Make switch box labels CamelCase (remove spaces)

### v1.1.3
* Export `DEFAULT_FONT_SIZE`
* (Demo App) Add `defaultFontSize` and `retooterFontSize` properties to `config.theme` and pass them to appropriate fxns

### v1.1.2
* More `tagOnlyStrings`

### v1.1.1
* Update `masto.js` to 7.2.0

## v1.1.0
* Add `allowMultiSelect` argument to `BooleanFilter.updateOption()` method
* (Demo App) Add checkbox for `allowMultiSelect`
* (Demo App) Flip boolean and rename switches for `showFilterHighlights` and `showLinkPreviews`

### v1.0.6
* More `tagOnlyStrings`

### v1.0.5
* More `tagOnlyStrings`

### v1.0.4
* (Demo App) Fix EISDIR error in `serve_dist_bundle.js` (PR: https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/pull/6)

### v1.0.3
* `npm audit fix` to update a few packages

### v1.0.2
* (Demo App) Don't show retoot button for DMs

### v1.0.1
* More `tagOnlyStrings`

# v1.0.0
* Fix bug where toots were being kept in cache well beyond `config.toots.maxAgeInDays` value

### v0.79.3 - v0.79.8
* More `tagOnlyStrings`

### v0.79.2
* Add `refreshTrendingData()` method to `TheAlgorithm`
* Export `sleep()` helper method
* (Demo App) Set default server to `mastodon.social` unless it's debug mode
* (Demo App) Fix preservation of `server` state in browser storage
* (Demo App) Fix bug where trending links and toots wouldn't show up during initial load

### v0.79.1
* (Demo App) Fix error logging on `LoginPage`

## v0.79.0
* Add `isGoToSocialUser()` method to `MastoApi` and `TheAlgorithm`; add `canBeDisabledOnGoToSocial` to API endpoint config; handle API errors differently for potentially disabled GoToSocial endpoints
* (Demo App) Support maintaining registered app and user state across multiple servers
* (Demo App) Don't call `api.apps.v1.verifyCredentials()` if user is on a GoToSocial instance (that endpoint doesn't exist on GoToSocial)
* (Demo App) Fix bug where configured default server wasn't actually getting set as the default server

### v0.78.10 - v0.78.21
* More `tagOnlyStrings`

### v0.78.9
* (Demo App) Add blurred filter to sensitive videos (maybe)

### v0.78.8
* Fix bug where user's own toots were being incorrectly removed from `getConversation()` and conversation toots were being incorrectly sorted by score instead of `createdAt`

### v0.78.7
* Handle edge case issue where muting an account causes selected filter option to disappear from list even though filter is still applied
* (Demo App) Add blurred filter to sensitive videos (maybe)

### v0.78.6
* Fix zh-TW => Taiwanese language map

### v0.78.5
* (Demo App) Remove useless show content button for NSFW images

### v0.78.2 - v0.78.4
* More `tagOnlyStrings`

### v0.78.1
* (Demo App) Fix default value for `hideSensitive`

## v0.78.0
* Don't count the empty string as a valid `spoilerText` for the Type: Spoilered filter
* (Demo App) Hide sensitive / NSFW images behind a clickthrough and add a toggle to enable / disable this behavior

### v0.77.16 - v0.77.19
* More `tagOnlyStrings`

### v0.77.15
* (Demo App) Properly set the `website` param when registering a new app (should fix issues with GoToSocial logins)

### v0.77.14
* More `tagOnlyStrings`

### v0.77.13
* Drop default `NUM_FAVOURITES` weight to 0 now that we are pulling in toots from the home server, drop default `DIVERSITY` weight to -3

### v0.77.12
* Fix bug with `Toot.replyMentions` when replying to users on the same server as the fedialgo user

### v0.77.10 - v0.77.11
* More `tagOnlyStrings`

### v0.77.9
* Fix bug with sorting hashtag filter options by excluding all options with 0 or undefined `numToots`

### v0.77.7
* Fix potential issue with sorting when only one value provided for ascending/descending arg

### v0.77.6
* (Demo App) Try to fix the `MinTootsSlider` default value

### v0.77.5
* Put in a cache busting fallback if user's `RecentUserToots` end up empty

### v0.77.4
* Go back to manual `Toot` construction in `MastoApi.buildFromApiObjects()`

### v0.77.3
* Logging of `sortByValue()` results

### v0.77.2
* Set `Account.suspended` correctly in `dedupeToots()`
* More `tagOnlyStrings`

### v0.77.1
* Add `config.scoring.diversityScorerRetootMultiplier` to apply a harsher diversity penalty to retoots than to a user's own toots

## v0.77.0
* Add `config.toots.minToSkipFilterUpdates` and `config.toots.filterUpdateBatchSize` to cut down on the number of (slow, expensive) calls to `updateFilterOptions()` during loads
* Fix runtime logging of `updateFilters()`

### v0.76.2
* Log `updateFilters()` at runtime

### v0.76.1
* More `tagOnlyStrings`

## v0.76.0
* Add all followed tags to the list of existing hashtag filter options so they can be appropriately deep scanned

### v0.75.18
* Add many of the 1,000 most common english words from [here](https://www.ef.edu/english-resources/english-vocabulary/top-1000-words/) to `tagOnlyStrings`

### v0.75.17
* Log full list of additional tags found but in a single line
* More `tagOnlyStrings`

### v0.75.16
* Be smarter about setting `UserData.lastUpdatedAt` to avoid unnecessary rebuilds

### v0.75.15
* Reduce debug logging

### v0.75.14
* Add `isApiCacheKey()` method; only update `Storage.lastUpdatedAt` when API data is written

### v0.75.13
* Fix bug where `getUserData()` wasn't updating to latest after `Storage` data is updated

### v0.75.12
* More `tagOnlyStrings`

### v0.75.11
* Log `hasNewestApiData()`

### v0.75.10
* Add `lastUpdatedAt` to `Storage` info returned by `getCurrentState()`

### v0.75.8
* (Demo App) Don't `resolve()` Toot URLs if user is on a GoToSocial instance

### v0.75.7
* Reverse order of operations when checking that a `Toot` contains a tag as a substring

### v0.75.1 - v0.75.6
* More `tagOnlyStrings`

## v0.75.0
* Refactor historical data background fetching to `MoarDataPoller` class
* Don't rescore the feed after each call to `getMoarData()` so as to avoid shuffling the feed as the user is looking at it
* More `tagOnlyStrings`

### v0.74.20 - v0.74.22
* More `tagOnlyStrings`

### v0.74.19
* Rename `isTagTootsCategory()`
* More `tagOnlyStrings`

### v0.74.18
* Change background fetch sleep to a random number of milliseconds between 0 and the configured value
* More `tagOnlyStrings`

### v0.74.17
* Skip deep scan of tag filter strings when loading cached data
* More `tagOnlyStrings`

### v0.74.16
* More `tagOnlyStrings`

### v0.74.15
* Filters don't do deep string comparison for tags that appear in `tagOnlyStrings`
* Add more `tagOnlyStrings`

### v0.74.13 - v0.74.14
* Even more `tagOnlyStrings`

### v0.74.12
* Another workaround for `Toot.tagNames().has()`

### v0.74.11
* Add a lot more `tagOnlyStrings` to configuration

### v0.74.10
* Temp fix for bug with `Toot.tagNames().has()`

### v0.74.9
* Call `completeObjProperties()` in `CountedList.incrementCount()`

### v0.74.8
* Reenable broad search for all hashtags that appear only as strings, not as formal Tags

### v0.74.7
* Use existing tag regex when re-scanning filter options for any followed tag strings
* Add `tagNames()` method to `Toot` objects that caches a `Set` of tag strings for faster lookup
* Rename `MastodonTag` type to `Hashtag`

### v0.74.6
* Move `CONVERSATION` and `JUST_MUTING` constants into `LoadAction` enum

### v0.74.5
* Last build seemed broken... no changes just a tag here

### v0.74.4
* Fix bug where `FediverseCacheKey.FEDIVERSE_TRENDING_TOOTS` data wasn't being built into Toot objects

### v0.74.3
* Create `config.locale.messages` for potentially user facing string configuration
* Reset `trendingData` when `reset()` is called
* Refactor out `FediverseCacheKey` enum

### v0.74.2
* Rename `TagTootsType` enum to `TagTootsCategory`

### v0.74.1
* Only do the followed hashtag additional scan in `finishFeedUpdate()`, not for each fetch because it's slow

## v0.74.0
* Update filter option counts for followed hashtags with substring search even if there's no "#" character
* Turn `TAG_ONLY_STRINGS` into a `config.toots.tagOnlyStrings` parameter; add "is" to list
* Add `forEach()` to `CountedList` class

### v0.73.14
* Keep track of which Toots have had their foreign script hashtags suppressed from the filter options

### v0.73.13
* Refactor `SuppressedHashtags` to a singleton class
* Add `config.api.errorMsgs` for error messages

### v0.73.12
* (Demo App) Disable Submit button while waiting for a new toot to be posted to the server
* (Demo App) Place cursor at end of mentions when composing a reply

### v0.73.11
* Rename `TagTootsCacheKey` enum to `TagTootsType`, move JSDoc for enums to its own module
* (Demo App) Fix bug with disabled Submit button when composing new toots

### v0.73.10
* Fix bug in `saveTimelineToCache()`

### v0.73.9
* Make a last ditch effort at `Toot` language detection with `detectForeignScriptLanguage()`

### v0.73.7
* Refactor API errors handling methods to `api/errors.ts` file
* Add `logStringifiedProps()` to `Logger` class

### v0.73.6
* `@types/blueimp-md5` is a dev dependency, not an actual dependency
* Upgrade `axios` package to 1.10.0

### v0.73.5
* `@react-native-async-storage/async-storage` is a dev dependency, not an actual dependency

### v0.73.4
* Add `isTagTootsCacheKey()`, `isCacheKey()` methods, use to reduce logging of `TagTootsCacheKey` fetches

### v0.73.3
* Fix bug with checking whether API objects can be uniquified

### v0.73.2
* Remove the actual `Scorer` object from `TheAlgorithm.weightsInfo` value properties

### v0.73.1
* Merge `TagList`'s `removeMutedTags()` into `removeInvalidTrendingTags()`

## v0.73.0
* Use a real mutex to lock `TheAlgorithm`'s toot fetch methods; rework logging situation
* Cache user's Mastodon server instance info in browser storage for 30 days
* Add `isRetooter` property to `UserData`
* Fix issue where `isRetooter` was incorrectly applied to `FAVOURITED_TAG_TOOTS`
* Rename `ObjWithCountList` to `CountedList` and stop exporting it

### v0.72.8
* Rename `FeatureScorer` to `TootScorer`
* Rename `HOMESERVER_TIMELINE_TOOTS` to just `HOMESERVER_TOOTS`
* Remove `moreOldToots` argument from `triggerFeedUpate()` (client app should call `triggerHomeTimelineBackFill()`)
* Remove config `hashtagTootRetrievalDelaySeconds`; don't sleep before launching hashtag `Toot` retrieval
* Use `fetchGenerator() for all API calls instead of either `fetch()` or `fetchGenerator()`
* Lower `config.api.backgroundLoadSleepBetweenRequestsMS` to 1000

### v0.72.7
* Mark `Toot` objects that are missing a `trendingLinks` property as needing to be recompleted

### v0.72.6
* Use appropriate conditional types in `MastoApi`, rename `MastodonApiObj` to `ApiObj`
* Standardize the uniquification step across all the various types of `ApiObj`s

### v0.72.5
* Uniquify accounts on `webfingerURI`
* (Demo App) Fix handling of missing `toot.trendingLinks`

### v0.72.4
* Remove empty strings when generating `wordsRegex()`

### v0.72.3
* Fix `UserData.mutedKeywordsRegex` when the user has no server side filters

### v0.72.2
* Add `lastEditedAt` getter to `Toot` and compare it to `completedAt` when evaluating `Toot` completeness so as to catch edits
* Bust `Toot`'s `contentCache` at build time if Toot's `editedAt` property exists
* Sort `Toot`s most recent first when de-duping properties

### v0.72.1
* Fix bug when `DiversityFeedScorer` tries to build `scoringData` before `toot.trendingTags` is populated

## v0.72.0
* Add `MastoApi.getHomeserverTimelineToots()` and integrate local server toots into timeline

### v0.71.2
* (Demo App) Fix `logout()` call

### v0.71.1
* Fix potential bug when truncating cached rows
* Make ESLint happier

## v0.71.0
* Add ability to filter by originating server
* Don't sort `Toot` objects twice in `buildToots()`

### v0.70.5
* Bump `brace-expansion` with `npm audit fix`

### v0.70.4
* Add `isLocal` getters to `Account` and `Toot` objects, improve `extractDomain()` helper method
* Add `isLocalUrl()` method to MastoApi
* Don't rebuild `Account` objects unnecessarily
* Uniquify `Account` objects by `url`, not by `id` (IDs are only unique across a single server)

### v0.70.2
* Export `optionalSuffix()` helper
* JSDoc comments for `string_helpers.ts` and `Logger`

### v0.70.1
* Remove default for `getRechartsStatsData(numPercentiles)`
* Rename `TootFilter.title` to `propertyName`
* (Demo App) Add `config.status.numPercentiles` parameter

## v0.70.0
* Add support for blocked domains
* Precompile a `mutedKeywordsRegex` and store it in the `UserData` object
* Add `Toot.matchesRegex()` method
* Add `fedibird.com` to list of `noMauServers`

### v0.69.22
* Fix error handling in `MastoApi.getServerSideFilters()`

### v0.69.21
* Fix filtering of user's own toots out of their timeline
* Return more `MastoApi` properties in `getCurrentState()`

### v0.69.20
* Add `allEmojis()` getter to `Toot`
* (Demo App) Larger font for version information

### v0.69.19
* Make `TheAlgorithm.weightedScorers` private
* Make `isFollowed` and `isFollower` actually optional on `Account`

### v0.69.17
* Rename `Account` and `Toot` objects' `homeserverURL` to `localServerUrl`
* Add `accountUrl()` method to `MastoApi`

### v0.69.16
* Allow `TRENDING` weight of 0

### v0.69.15
* Add input validation for `updateUserWeights()`
* Get rid of `skipSort` param; introduce `TootSource` type

### v0.69.13
* Set `FEDIVERSE_POPULAR_SERVERS` staleness to 5 days

### v0.69.12
* Use `Promise.allSettled()` to ensure we wait for all loads to complete before marking state as not loading any more
* Move `minCharsForLanguageDetect` and `maxContentPreviewChars` to `TootsConfig`

### v0.69.11
(Demo App) Go back to logging out after NetworkErrors

### v0.69.9 - v0.69.10
* Stop requiring all `FetchParams` to have a value
* Make `TheAlgorithm.weightPresets` into a static variable

### v0.69.8
* Convert `isBoolean/NumericFilterName` methods to static `TootFilter.isValidFilterProperty()`

### v0.69.7
* JSDoc comments for `Account`

### v0.69.6
* Convert `TheAlgorithm.getTimeline()` to a getter named `timeline`, `getApiErrorMsgs()` to `apiErrorMsgs`, `isLoading()` and `serverInfo()` to getters
* Convert `Toot` object's `attachmentType`, `author()`, `contentTagParagraph()`, `isDM()`, `isFollowed()`, `isPrivate()`, `realToot()`, `realURI()`, `realURL()` to getters
* Convert `Account` object's `homeserver()`, `homeserverURL()`, `noteWithAccountInfo()` to getters
* Convert `Toot.getScore()` to `score` getter
* Rename `ObjWithTootCount` to `NamedTootCount`, `WithCounts` to `TootCounts`
* Upgrade `masto.js` to 7.1.0
* Fix handling of failed hashtag timeline and search for hashtag API requests

### v0.69.5
* Add "la" to `TAG_ONLY_STRINGS`

### v0.69.4
* Set `FEDIVERSE_POPULAR_SERVERS` staleness to 72 hours
* (Demo App) Reverse the order of color highlighting for tag filters so trending tags are always colored first

### v0.69.3
* Lower `timeoutMS` to 2,500

### v0.69.2
* Don't log `FollowersScorer` data

### v0.69.1
* Lower log level for missing score message

## v0.69.0
* Add `FollowersScorer` to weight accounts that follow the fedialgo user
* Cap initial followed account retrieval before merging toots to timeline at 1,600; beyond that they will be loaded in a background job that sleeps `config.apibackgroundLoadSleepBetweenRequestsMS` in between requests
* Fix `OUTLIER_DAMPENER` value in various presets
* Fix removing newly muted accounts from feed
* (Demo App) Sort filter options by `displayName` if available

## v0.68.0
* Update the cache in the background instead of always dropping/reloading the whole thing when it gets stale
* Add `getFollowers()` to `MastoApi`; add configuration variable `config.api.pullFollowers` to turn on/off follower retrieval
* Don't wait for scorers to finish preparing before integrating toots into the timeline
* Remove `TheAlgorithm.filterOptionDataSources()` method
* `TheAlgorithm.userData` now refers to the same object as `MastoApi.instance.userData`

## v0.67.0
* (Demo App) Add switches in the hashtag filter section to enable / disable each kind of hashtag colored highlighting (participated/favourited/trending)

### v0.66.6
* (Demo App) Fix column spacing in trending tags section

### v0.66.5
* Fix source in `TagList.fromParticipated()`

### v0.66.4
* Apply the `TRENDING` multiplier even to followed toots

### v0.66.3
* Don't strip out followed hashtags from the trending tag list if they aren't being used to fetch toots for those tag

### v0.66.2
* Much cleaner, decorator based approach to building options for `BooleanFilterOptionList`
* (Demo App) Show loading spinner immediately upon clicking "clear all data"

### v0.66.1
* Set time decay to 0 for `TOTAL_CHAOS` weight preset

## v0.66.0
* Add an `AuthorFollowerScorer`
* Fix bug where `DiversityFeedScorer` was penalizing new toots with trending tags more than old toots with trending tags
* Flip default sign on scores returned by penalty scorers: they now just return positive values like other scorers, but the default weights sign is flipped to negative
* Add a `TOTAL_CHAOS` weight preset
* Rename `Toot` object's `realAccount()` to `author()`
* Add a `withRetoot()` method to `Toot`

### v0.65.2
* (Demo App) Don't show `OAUTH_ERROR_MSG` on network errors

### v0.65.1
* Let `class-transformer` deserialize arrays directly
* Add cache summary to `getCurrentState()`'s storage info

## v0.65.0
* Add `triggerMoarData()` method to `TheAlgorithm`
* Don't trigger unnecessarsy `maxCacheRecords` truncation calls
* Explicitly mark `loadStartedAt` instead of relying on message passing to `setLoadingState()`
* (Demo App) Add button/link to trigger pulling the next batch of historical user data to tune the algorithm
* (Demo App) Use last load times computed within React instead of those provided by `TheAlgorithm`

### v0.64.5
* (Demo App) Followed hashtags use same color scheme as followed users

### v0.64.4
* `BooleanFilterOptionList.maxNumToots` is now a variable not a function
* Add `isFollowed` to hashtag `BooleanFilterOption`s
* Add `maxValue(property)` to `BooleanFilterOptionList`
* Fix User filter `isFollowed` for accounts w/interactions

### v0.64.2
* (Demo App) Bump `webpack-dev-server` to version 5.22 via `npm audit force`

### v0.64.1
* Refactor/clean up language and hashtag filter option building

## v0.64.0
* Add `maxCacheRecords` option to API endpoints config
* Refactor decoration of filter options into various `BooleanFilterOptionList` subclasses

### v0.63.2
* Call `setFeedInApp()` with empty list as soon as `reset()` is called

### v0.63.1
* Fix edge case with error handling during `MastoApi.reset()` where `WaitTime` object is missing
* Use `Promise.allSettled()` to rescue partial results from API calls
* Handle API errors better when getting trending/participated/etc. tag toots

## v0.63.0
* Add `getApiErrorMsgs()` method to `TheAlgorithm` (and add those messages to the `getCurrentState()` return value)
* (Demo App) Remove muted/blocked accounts from thread view, pass a source param to `completeProperties()` instead of boolean `isDeepInspect`
* (Demo App) Display non-fatal errors below control panel when they happen

### v0.62.2
* Avoid overzealous language determination for user's own toots

### v0.62.1
* At startup, if timeline cache is full truncate it down to `config.toots.truncateFullTimelineToLength` records
* Add bsd.network to `noMauServers` list
* Add "mastodon" to the list of tags that can only match as tag names

## v0.62.0
* Add a `displayName` property to `BooleanFilterOption` (and populate it for languages and accounts)
* Add sum of reply/favourite/retoot counts to user filter options' `numToots`
* Add usage counts to language filter options' `numToots`
* Use type `BooleanFilterOptionList` for `UserData.favouriteAccounts`
* Increase staleness for followed accounts and tags to 12 hours
* (Demo App) Don't make unnecessary calls to `updateFilters()` when sorting UI's filter options by count etc.
* (Demo App) Disable Highlights Only switch if Hide Filters is turned on

### v0.61.1
* On API error, check whether merge is supported _before_ checking whether cache should be discarded in favor of new rows
* (Demo App) Persist the state of each filter section's header checkboxes between sessions

## v0.61.0
* Strip useless params out of `validateParams()` logging of API params
* (Demo App) Add a "Hide Filter Highlights" checkbox to the main Feed page
* (Demo App) Preserve the user's checkbox selection states between sessions
* (Demo App) Remove `react-persistent-state` package

### v0.60.6
* (Demo App) Fix build

### v0.60.5
* (Demo App) Standardize app configuration

### v0.60.4
* Rename `BooleanFilter`'s `updateValidOptions()` to `updateOption()`
* Completely reset scorers when `reset()` is called
* Suppress foreign language and muted keyword trending tags completely

### v0.60.3
* Rename `BooleanFilter.validValues()` to `selectedOptions`
* Add a `maxSecondsPerPage` to the API config that will halt polling if things are going slow
* (Demo App) Fix bug with formatting of type filters leading to errors when selecting multi word options
* (Demo App) minToots slider value should update as more data comes in

### v0.60.2
* Rename `BooleanFilter.isThisSelectionEnabled()` to `isOptionEnabled()`

### v0.60.1
* Rename `BooleanFilter`'s `optionInfo` property to just `options`
* Drop configured `initialMaxRecords` for favourited toots to half of the other configuration because it seems to be the bottleneck

## v0.60.0
* (Demo App) Add a 'Create New Toot' button to the main page

### v0.59.1
* Export `DATA_SOURCES_FOR_FILTER_OPTIONS`, add `filterOptionDataSources()` method to `TheAlgorithm`

## v0.59.0
* `BooleanFilterOption` now contain more information than just the number of toots in the current timeline they match (in particular they now contain enough information to drive the color gradients)
* (Demo App) Lower configured `idealNumOptions` for the `MinTootsSlider` to 60

### v0.58.2
* Add `UserData.favouriteAccounts` property
* Repair broken audio attachments like we do with images and videos
* Refactor an abstract `ObjWithCountList` class from `TagList` class so we can hold account info
* (Demo App) Reorder filter section (and make it easily configurable in the future)
* (Demo App) Fix bug with computing gradients at new user login

## v0.58.0
* Add `map()` method to `TagList`
* Add a section for "Hashtags You Often Favourite"

### v0.57.3
* Stop exporting `isDebugMode` (it's a static property now)
* Add `FEDIALGO_DEEP_DEBUG` env var and corresponding `Logger.deep()` method
* `UserData`'s `Tag` properties are now `TagList` objects; `TagList` has a few new methods to make it easier to work with

### v0.57.2
* Add `config.favouritedTags.maxParticipations` param
* (Demo App) Fix bug where reply mentions were injected twice

### v0.57.1
* Fully separate `TagTootsCacheKey` enum elements from `CacheKey` enum

## v0.57.0
* Add `favouritedTags` property to `UserData` object
* Export `TagTootsCacheKey` type
* (Demo App) Add cyan color gradient for user's favourited hashtags in the hashtag filter view

### v0.56.4
* (Demo App) Link the Github Release Notes instead of the raw CHANGELOG.md in the header
* New `BooleanFilter` method `optionsAsTagList()`
* Lower staleness duration for server side filters to four hours
* Don't alias `Logger` to `ComponentLogger` when exporting
* (Demo App) Use new `MinTootsSlider` component to control the number of trending objects in the list

### v0.56.1 - v0.56.3
* Use `Logger`s instead of `logPrefix` args everywhere

## v0.56.0
* Refactor main `MastoApi` method method into a few easier to follow pieces
* Fix bug where scorers were not resetting their state when `reset()` was called and all other data was reset
* Uniquify `Notification` objects from the API against the cache as they arrive to avoid the build up of dupes
* `MastoApi.instanceInfo()` only returns the v2 API data structure for a server configuration. If the v1 version exists it will be logged and thrown as an error.
* Adjust `DISCUSSIONS` weight preset

### v0.55.1 - v0.55.4
* Stop exporting `sortKeysByValue()` helper
* Use `import { type Thing }` instead of just `import { Thing} ` where appropriate bc apparently it makes the typescript compiler happy
* Add missing `enums.ts` files
* (Demo App) Better error handling/formatting, esp. in `ReplyModal`
* (Demo App) Fix small bug with bootstrapping the minTootsSlider

## v0.55.0
* Add `entriesSortedByValue()`, `optionsSortedByValue()`, `optionsSortedByName()`, and `numOptions()` methods to `BooleanFilter`
* Export `TagList` class
* (Demo App) Make the minTootsSlider's initial value flexible to try to show the newly configured `idealNumOptions`

### v0.54.20 - v0.54.21
* Rename `TRENDING_HASHTAGS` to `TRENDING_TAGS` and `PARTICIPATED_HASHTAGS` to `PARTICIPATED_TAGS`
* (Demo App) Rework / generalize color gradient config for participated hashtags
* (Demo App) Undo some memoization in `Feed.tsx` after the scroll listener `showMoreToots()` somehow went crazy and loaded the entire timeline (diff: https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/compare/baf2640872fb521b0b739d2e213d618cf2305317..master)

### v0.54.19

### v0.54.18
* (Demo App) Fix bug with color gradient for hashtags (was checking the wrong boolean), Revert to the original `getTooltip()` for now

### v0.54.16
* Logging cleanup

### v0.54.15
* (Demo App) Fix memoization watcher for type filter
* (Demo App) Use `ComponentLogger` from fedialgo package

### v0.54.14
* (Demo App) Fix bug where long filter labels weren't getting trimmed to configured length

### v0.54.13 (not deployed to production)
* Add information about storage usage for each primitive type to `getCurrentState()`
* `MastoApi` now has a `reset()` method which is called by `TheAlgorithm` during resets
* Add telemetry to `MastoApi` for request wait times (data is returned in `getCurrentState()` under the new `Api` section)
* `QUICK_MODE` isn't always turned on when `NODE_ENV=development` and/the `FEDIALGO_DEBUG` env var is turned on; has to be enabled separately now
* Add `BooleanFilter.isThisSelectionEnabled()` method
* (maybe) ~~fixed bug where `BooleanFilter` wasn't being fully reconstructed as class instances (they were just objects and so had no instance methods)~~
* Export `ComponentLogger` class

### v0.54.12
* Add a `TootCache` object property to each `Toot` that memoizes the results of frequently called string functions like `contentWithCard()` or `contentWithEmojis()`

### v0.54.11
* Exclude object's functions when computing browser storage usage (the fxns aren't serialized to storage?)

### v0.54.10
* (Demo App) Sort fediverse server list by `followedPctOfMAU`
* (Demo App) Trending panel configuration options in main config

### v0.54.8
* Export `TrendingType` enum

### v0.54.7
* Add `servers` to renamed `TrendingData` type; remove `TheAlgorithm.mastodonServers` property; export `TrendingData` and `MastodonInstance` types; remove `MastodonInstanceEmpty` type
* Add Thai, Hindi, Hebrew language detection for hashtags
* (Demo App) Toggling of how many trending links/tags/etc. are shown

### v0.54.5 / v0.54.6
* (Demo App) Add tooltips to all the filter header switches; add `HeaderSwitch` component
* (Demo App) Consolidate configurable stuff `Config` object

### v0.54.3 / v0.54.4
* Export `LANGUAGE_CODES` dict
* (Demo App) Show full language name in filter section, not just 2 character code

### v0.54.2
* Add filters to `getCurrentState()` return value
* Remove diacritics from text when filtering for hashtag matches. Fixes bug where german/french etc. tags weren't filtering correctly bc tag names have already had diacritics stripped
* Change hashtag language detection regexes to match substrings instead of whole strings
* Fix bug where japanese/arabic/etc. tags reappear when trending tags are loaded from the cache at startup
* Add `lodash` library, use it for `makeChunks()` which is exported as a helper method
* (Demo App) Reorder filters so interactions filter is at the top. Filters switches now have column based sorting instead of row based sorting.

### v0.54.1
* (Demo App) Memoization optimizations for `StatusComponent` props, `TrendingInfo` sections (the most expensive renders according to profiler)
* (Demo App) Standardize logging through `ComponentLogger` class

## v0.54.0
* Add `replyMentions()` method to Toot objects
* Collate all `trendingLinks` on a `Toot`, don't settle for first found
* Add `numTimesShown` to standard `PROPS_THAT_CHANGE` calculation
* (Demo App) Inject Toot.replyMentions() account tags into top of replies; disable submit reply button until toot's ID is resolved

### v0.53.10
* Fix bug with moar data poller favourited toots puller that caused it to think it was finished after pulling only the minimum number of favourited toots

### v0.53.9
* Actually fix the 'realURI is not a function' by making sure all `Toot` related `CacheKey`s are in `STORAGE_KEYS_WITH_TOOTS`

### v0.53.8
* Temporary workaround for 'realURI is not a function' errors

### v0.53.7
* Stop considering retoots of toots w/hashtags to be "participation" in those hashtags unless the user is mostly a retooter meaning more than `config.participatedToots.minPctToCountRetoots` of their toots are retoots

### v0.53.6
* (Demo App) Adjust the color gradients so there's more color variation in the low/middle range in the hashtag filters

### v0.53.5
* (Demo App) Remove unused `node-emoji` package

### v0.53.4
* (Demo App) Bump up `tsconfig.json`'s `jsx` to `react-jsx`

### v0.53.3
* Use a workaround for the weird issue with half width japanese characters when determining a hashtag's language
* (Demo App) Bump up `tsconfig.json`'s `target` to `ES2016`

### v0.53.2
* Remove japanese/korean/cyrillic etc. tags from trending list unless that's the user's current language
* Add `invalidTags` property to `TagTootsConfig` type
* Bump up filtering out of participated tags from favourited tag toots pull to "more than 3 uses"

### v0.53.1
* Lower `config.batchCompleteSleepBetweenMS` from 250ms to 150ms because the `completeProperties()` seems to be much faster now

## v0.53.0
* Introduce `TagList` and `TootsForTagsList` classes to manage participated/favourited/trending tags

### v0.52.1
* Don't remove user's own toots from the threaded view

## v0.52.0
* Add `getFavouritedTagToots()` to get non followed / non participated tags based on favourites into the mix

### v0.51.5
* (Demo App) Avoid invalid file extensions in the MIME -> extension mapping

### v0.51.4
* (Demo App) Use `useDropZone()` instead of `Dropzone` for attachment uploads

### v0.51.3
* (Demo App) Limit media attachments to the sizes and MIME types specified in the user's home server's configuration

### v0.51.2
* (Demo App) Fix bug with `serverInfo` instantiation

### v0.51.1
* (Demo App) Fix bug with image previews in replies

## v0.51.0
* Add `serverInfo()` to `TheAlgorithm`; add `serverInfo()` response to `getCurrentState()`
* Add `homeInstanceInfo()` method to `Account`
* (Demo App) Validate replies adhere to the `maxCharacters` and `maxMediaAttachments` configured for the user's server

### v0.50.6
* (Demo App) Disable background `resolve()` resolution of toots on scroll

### v0.50.5
* Fix bug in wordRegex() method (AI sucks)

### v0.50.4
* Return Trending data in `getCurrentState()`
* Refactor `UserData` population, add `regex` property to trending links and tags
* Precompile hashtag and trending link search regexes

### v0.50.3
* (Demo App) Refactor `AttachmentsModal` into `MultimediaNode` component, only register an arrow key listener when there's more than one image

### v0.50.2
* (Demo App) Stick the left panel to top but allow scrolling within it if it's more than the viewport height

### v0.50.1
* (Demo App) Fix bug where new tab opened when trying to open the raw `Toot` JSON modal

## v0.50.0
* (Demo App) Add ability to reply to toots inside the app
* (Demo App) Pre-emptively resolve the toot ID as it appears on screen to speed up future interactions
* (Demo App) Add experimental feature to completely wipe the app so as to deal with OAuth errors
* Add `complete` flag argument to `reset()` method

### v0.49.4
* (Demo App) Show original toot in raw JSON view, not just the realToot
* Add `Toot.resolveID()` method and `resolvedID` property, remove `Toot.resolved` property because of recursion issues

### v0.49.3
* (Demo App) Allow thread viewer on reply toots w/out their own replies

### v0.49.2
* Don't set `resolvedToot` to `this` if there's a failed lookup because it leads to a recursion error in `class-transformer`

### v0.49.1
* Resolve toot before `getConversation()`

## v0.49.0
* (Demo App) Thread viewer accordion panel
* Add `getConversation()` method to `Toot` class
* Log suspended accounts

### v0.48.10
* Remove blocked/muted keywords from the visible list of trending tags

### v0.48.9
* Fix bug where home timeline toots were being sorted backwards before being truncated

### v0.48.8
* Refactor `Toot.contentWithCard()` method

### v0.48.7
* Suppress warnings when `ChaosScorer` calls `getIndividualScore()`

### v0.48.6
* (Demo App) `useMemo()` for a few possibly expensive calculations

### v0.48.5
* Make numeric filters apply to the `realToot()` not the retoot, don't use `scoreInfo` to get values for numeric filters

### v0.48.4
* Convert various `Array.includes()` calls into `Set.has()` calls (more than 20x faster according to jsbench.me results)

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

## v0.33.0
* Sort built toots by their preliminary score, not by their popularity
* Increase default `FOLLOWED_TAGS` weight to 4
* Decrease default `TRENDING` weight to 0.15
* Add `Toot.getScore()` method
* Add `Config.batchCompleteTootsSize` param, rename `Config.batchCompleteTootsSleepBetweenMS`

### v0.32.1
* Separate out the backfill functionality to `TheAlgorithm.triggerHomeTimelineBackFill()`
* Improve `Storage.dumpData()` method; remove unused `StorageKey`s

## v0.32.0
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

## v0.24.0
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

### 0.15.3
* Fix miscased `Scorer.ts` files in `dist/` package.

### 0.15.2
* Fix `unknown` media type for video files with extension `.mp4`

### `0.15.1`
* Fix demo app dependency

## `0.15.0`
* Make `Poll` a filterable type

### `0.14.2`
* [bug] Force removal of duplicats `Toot.reblogsBy` values
* Exclude `bsky.brid.gy` from MAU numbers

### `0.14.1`
* Make sure `trendingRank` is set correctly on trending toots retooted by people you follow

## `0.14.0`
* `accountNameWithEmojis()` and `Toot.contentWithEmojis()` API methods

### `0.13.4`
* [bug] Remove dupes from `Toot.reblogsBy` array
* Unified `Toot.realURI()` method
* Tweak default weights

### `0.13.3`
* Convert `Toot.reblogBy` (an `Account`) to `Toot.reblogsBy` (an `Account[]`)
* Make `DiversityFeedScorer` properly account for retoots

### `0.13.2`
* [bug] Fix retoots being scored based on the retooter not on the original toot

### `0.13.1`
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

### `0.10.1`
* Refactor a `MastodonServer` class for calls to the public API

## `0.10.0`
* Add `Toot.isDM()` instance method and filter option
* Stop muted accounts from sneaking into the feed via trending toots

### `0.9.1`
* `DiversityFeedScorer` sorts by MD5 of id to get random but repeatable ordering so scores don't bounce around as incremental loads happen
* `ChaosScorer` uses a hashing function to generate a deterministic score instead of `Math.random()`
* Don't decide whether to reload feed (leave that to the client app using this package)

## `0.9.0`
* (demo app) switch to sort filters by count instead of by name

### `0.8.6`
* Remove followed servers that don't meet MAU requirements from trending data
* Standardize caching of data fetched from Mastodon

### `0.8.5`
* [bug] Handle `FeatureScorer` not being ready if page is reloaded

### `0.8.4`
* Fix de/serialization of score data on `Toot` objects introduced by `Toot` refactor

### `0.8.3`
* Enable `reloadFeed()` method to return true after 10 minutes has passed since latest toot in timline
* Refactor out a proper `Toot` class

### `0.8.2`
* [bug] Fix server side filter application

### `0.8.1`
* Pull and apply server side filters to trending toots manually because user's server side filters can't be applied to toots pulled from other servers

## `0.8.0`
* Add numeric filtering (minimum replies, minimum reblogs, etc)

## `0.7.0`
* Add filtering based on username
* Implement a real incremental load

### `0.6.1`
* Convert the filtering of sources to the standard model
* [bug] Fix doublecounting of toot categories

## `0.6.0`
* Allow inverting filters for apps and languages (not just hashtags)
* Standardize a `FilterSection` object structure for app, language, hashtag, etc. filtering

### `0.5.1`
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
