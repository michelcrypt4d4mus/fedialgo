<!-- [![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml) -->

(Forked from [pkreissel's original implementation](https://github.com/pkreissel/fedialgo))

# `fedialgo`
FediAlgo in action on YouTube:

[![FediAlgo in action](https://img.youtube.com/vi/tR35bUHzJdk/0.jpg)](https://www.youtube.com/watch?v=tR35bUHzJdk)

Fedialgo is a `node.js` package that can be used to produce an algorithmic fediverse experience. This will replace the project "fedifeed" and make it possible to implement the idea into all kinds of other projects. It should (hopefully) also work in React Native Projects but that's untested.


# Installation
### The Demo App
`fedialgo` is just a `node.js` package. You don't use it on its own; it can only function when used inside of a larger application.

If you're not developing your own app there's a simple demo app that can spin up a webserver, score and order a curated "For You" style Mastodon feed, and present it to your browser at `http://localhost:3000/`. The demo app is incredibly easy to setup; you can find it over in the [`fedialgo_demo_app_foryoufeed`](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed) repo.

### In A `node.js` Project
You can install from github with `npm`:

```bash
npm install --save github:michelcrypt4d4mus/fedialgo#stable
```

Or with `yarn`:

```bash
yarn add https://github.com/michelcrypt4d4mus/fedialgo#stable
```

# Usage
The demo app's [`Feed`](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/blob/master/src/pages/Feed.tsx) component demonstrates the latest and greatest way to use Fedialgo but here's a quick overview of how to get up and running:

```typescript
import { login, mastodon } from "masto";
import { TheAlgorithm } from "fedialgo"

// Optionally (tho you are encouraged to use FediAlgo this way) you can set up a callback for FediAlgo to use
// to manage the state of the timeline in your app. In React this might look like:
import { useState } from React;
const [timeline, setTimeline] = useState<Toot[]>([]);

// Verify mastodon login and instantiate a TheAlgorithm object
const api: mastodon.Client = await login({url: user.server, accessToken: user.access_token});
const currentUser = await api.v1.accounts.verifyCredentials()
// setTimelineInApp param is optional but encouraged
const algorithm = await TheAlgorithm.create({api: api, user: currentUser, setTimelineInApp: setTimeline})
```

Once you've instantiated a `TheAlgorithm` object there's three primary ways of interacting with it:

```typescript
import { PresetWeightLabel, Toot, WeightName, Weights } from "fedialgo";

// Trigger the feed builder. FediAlgo will start doing stuff asynchronously. If you passed setTimelineInApp
// in the constructor all you need to do is monitor the state of whatever variable contains the timeline
// (in the React example above that variable would be 'timeline').
algorithm.triggerFeedUpdate();

// algorithm.getTimeline() returns the current weight-ordered/filtered array of Toot objects
// Note there won't be anything in there until the timeilne is at least partially done being built!
const timeline: Toot[] = algorithm.getTimeline();
// You can check if there is a timeline load in progress. Calling treggerFeedUpdate() before the load is done
// will throw an error.
if (!algorithm.isLoading()) algorithm.triggerFeedUpdate();

// Get and set score weightings (the things controlled by the sliders in the demo app)
const weights: Weights = await algorithm.getUserWeights();
weights[WeightName.NUM_REPLIES] = 0.5;
timelineFeed = await algorithm.updateUserWeights(weights);

// Choose a preset weight configuration
timelineFeed = await algorithm.updateUserWeightsToPreset(PresetWeightLabel.FRIENDS);

// The names of the weights that can be adjusted are exported as the WeightName enum. Additional properties (description, minimum value, etc) can be found at algorithm.scorersDict.
for (const key in WeightName) console.log(`Weight '${key}' info: ${algorithm.scorersDict[key]}`);

// Set a filter for only German language toots
const filters = algorithm.getFilters();
filters.filterSections[PropertyName.LANGUAGE].updateValidOptions("de", true);
const filteredFeed = algorithm.updateFilters(filters);

// Set a filter for only toots with at least 3 replies
filters.numericFilters[WeightName.NUM_REPLIES].value = 3;
const filteredFeed = algorithm.updateFilters(filters);
```

#### More On The `setTimelineInApp` Callback
You can optionally pass a `setTimelineInApp()` callback to `TheAlgorithm.create()` that will be called whenever the feed is changed. Specifically the callback will be invoked when:

* An incremental batch of toots is retrieved from the fediverse and integrated into the timeline
* You make a call to `algorithm.updateUserWeights()`
* You make a call to `algorithm.updateFilters()`.

An example involving React component state:


## `Toot` API
The timeline is returned as an array of `Toot` objects which are a minimal extension of the mastodon API's `Status` object with a few more properties and some helper methods. Check [`toot.ts`](./src/api/objects/toot.ts) for details.


## Other Data Available In `TheAlgorithm`
FediAlgo provides a bunch of other data besides the timeline should you choose to access it.


#### Fediverse Trending Data
Current "trending" fediverse data can be accessed at `algorithm.trendingData`. See [`types.js`](src/types.ts) for info on the data type.

```typescript
// Trending links
algorithm.trendingData.links.foreach((link) => console.log(`Link '${link.uri}' tooted by ${link.numAccounts} accounts`));

// Trending tags
algorithm.trendingData.links.foreach((tag) => console.log(`Tag '${tag.name}' tooted by ${tag.numAccounts} accounts`));

// Trending toots
algorithm.trendingData.toots.foreach((toot) => console.log(`Trending toot w/rank ${toot.trendingRank}: '${toot.describe()}'`));

// Popular servers
algorithm.mastodonServers.foreach((server) => console.log(`Server used to determine trending data:`, server);
```

#### User Data
The user's followed accounts, muted accounts, followed tags, and a few other bits and bobs used the compute the weighting in the timeline can be accessed at `algorithm.userData`. See [`types.js`](src/types.ts) for info on the data type.


## Package Configuration
Package configuration options can be found in [`src/config.ts`](src/config.ts). You can't change these via the API currently.


# Contributing
### Developer Setup
If necessary install the dev dependencies with `npm install --include=dev`.

### Deploying Changes
For changes to propagate you must run `npm run build` to generate changes to files in `dist/` and then check those files into git.

### Developing Against a Local Repo
Clone this repo and cd into it. Then run:

```bash
npm install
npm link
```

Then `cd` to the `node.js` project that is going to host this package and run this:
```bash
npm link fedialgo
```

### Running Test Suite
`npm run test`

### Miscellaneous
Use // @ts-ignore if you run into Typescript warnings (because your project might also use masto)

```bash
npm run build
```
in `fedialgo` directory after changes and they will automatically be detected.

There's a pre-commit git hook that runs `npm run build`.


# TODO
1. Add scoring for links similar to `onlyLinks` filter
1. Make use of the fact that you can see who favourited a post: https://docs.joinmastodon.org/methods/statuses/#favourited_by

### What's slow:
Not 100% sure if these are slow because the actual fetch needs to be slow or if there is some mutex situation keeping them from running but either way right now these are the outliers:

* [API RecentUserToots] Completing fetch at page 10, got 400 records in 28.2 seconds
* [API FavouritedAccounts] Completing fetch at page 10, got 400 records in 28.6 seconds
* [API RecentNotifications] Completing fetch at page 10, got 400 records in 29.1 seconds
* [FediverseTrendingToots] fetched 80 unique records in 25.5 seconds (**Much slower than the otehr fediverse fetches!)
* [API FollowedTags] Retrieved page 3 (have 118 records so far in 15.2 seconds) (FollowedTags can be surprising slow)

Not on the critical path so maybe fine:

* [API TrendingTagTootsV2] Completing fetch at page 1, got 15 records in 31.8 seconds



# Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
