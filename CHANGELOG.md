`2024-12-01`
* Introduce `TootScore` type to hold all score info
* [bug] reset the diversity weighting when rescoring

`2024-11-30`
* Refactor `_decorateWithScoreInfo()` method
* Rename `scores` => `rawScores` and `value` => `score`

`2024-11-27`
* Add a `MostRepliedAccounts` score
* Add a list of default servers to check for trending toots if user isn't following very many accounts
* Add 1 to score so if all weights are 0 the timeline is reverse chronological order
* [bug] default to 0 instead of erroring out on reweight

`2024-11-26`
* Add `FollowedTagsScorer`

`2024-11-25`
* `reblogBy` should be an `Account` not a string
* Don't filter out replies from feed (filtering replies is now an option on the front end)

`2024-11-24`
* Add `ImageAttachmentScorer` and `VideoAttachmentScorer`
* Improve scorer descriptions

`2024-11-23`:
* Make time decay param configurable
* Rename feature scorers
