<!-- [![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml) -->

# `fedialgo`
Fedialgo is a `node.js` library offering a customizable algorithm for the federated social media platform [Mastodon](https://joinmastodon.org/) that can free you from the tyranny of Mastodon's reverse chronological order timeline. It's based on [pkreissel's original implementation](https://github.com/pkreissel/fedialgo) and ideas though it has more or less been completely rewritten and has many more features like integration of trending toots,filtering of the feed, improved load times, and more.

### Usable Demo
* Try the demo app [here](https://michelcrypt4d4mus.github.io/fedialgo_demo_app_foryoufeed/)! (code for the demo app is [here](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed)).
* Video of the the demo in action [on YouTube](https://www.youtube.com/watch?v=tR35bUHzJdk).

# Installation
You can install this library from github with `npm`:

```bash
npm install --save github:michelcrypt4d4mus/fedialgo
```

Or with `yarn`:

```bash
yarn add https://github.com/michelcrypt4d4mus/fedialgo
```

### Troubleshooting
If you're using the library outside a browser and get a `Buffer is not a function` error you may also need the `buffer` package to simulate the one provided by most browsers. It's required by the `class-transformer` library FediAlgo uses to serialize data to browser storage.
```bash
npm install --save buffer
```

And then put this in your main entrypoint (e.g. `App.tsx` or something like that):

```typescript
import { Buffer } from 'buffer'; // Required for class-transformer to work
(window as any).Buffer = Buffer;
```

# Usage
The demo app's [`Feed` component](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/blob/master/src/pages/Feed.tsx) demonstrates the latest and greatest way to use Fedialgo but here's a quick overview of how to get up and running. This code assumes you already have an access token for a user and a registered Mastodon "application" on the Mastodon server allowing `read` scope access. If you don't have one see [the `masto.js` documentation](https://github.com/neet/masto.js/?tab=readme-ov-file#quick-start) for how to get one.

The FediAlgo demo app also contains a working example of how to execute the OAuth flow for a user to both register an app and get an authorized OAuth token for them:
* [Login page](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/blob/master/src/pages/LoginPage.tsx)
* [OAuth callback page](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/blob/master/src/pages/CallbackPage.tsx)


```typescript
import TheAlgorithm from "fedialgo"
import { createRestAPIClient, mastodon } from "masto";

const mastodonServer = "https://mastodon.social";
const accessToken = getTheUserAccessTokenSomehow();
const api = createRestAPIClient({accessToken: accessToken, url: mastodonServer});
const currentUser = await api.v1.accounts.verifyCredentials();

// Instantiate a TheAlgorithm object
const algorithm = await TheAlgorithm.create({
    api: api,
    user: currentUser,
    locale: "en-GB",     // optional (available in navigator.language in browser)
});
```

### The `setTimelineInApp` Callback
You are encouraged to pass an optional `setTimelineInApp()` callback to `TheAlgorithm.create()` and allow FediAlgo to manage the state of the timeline in your app. The callback will be invoked whenever the timeline is updated. More specifically it will be invoked when any of these things happen:

* A batch of toots is retrieved from the fediverse and integrated into the timeline
* You make a call to `algorithm.updateUserWeights()` (see below)
* You make a call to `algorithm.updateFilters()` (see below)
* A background data fetch incrementally loads more of the user's historical data (as the algorithm is responsive to the user's history of favourites, retoots, etc. additional data can reorder the feed slightly)

An example involving storing the timeline in a React component's state:

```typescript
import { useState } from React;
import TheAlgorithm, { Toot } from "fedialgo"

const [timeline, setTimeline] = useState<Toot[]>([]);

const algorithm = await TheAlgorithm.create({
    api: api,
    user: currentUser,
    setTimelineInApp: setTimeline
});
```

## Functionality
Once you've instantiated a `TheAlgorithm` object there's three primary ways of interacting with it:

#### Triggering Construction Of The Timeline
```typescript
import { Toot } from "fedialgo";

// Trigger the feed builder. FediAlgo will start doing stuff asynchronously. If you passed
// setTimelineInApp in the constructor all you need to do is monitor the state of whatever
// variable contains the timeline (in the React example above that would be 'timeline').
algorithm.triggerFeedUpdate();

// After first invocation check if loading is in progress before calling to avoid exceptions
if (!algorithm.isLoading) {
    algorithm.triggerFeedUpdate();
}

// algorithm.timeline returns the current weight-ordered/filtered array of Toot objects
// Note there won't be anything there until the timeilne is at least partially built!
let timeline: Toot[] = algorithm.timeline;
// If you wanted to wait until the feed was fully constructed, wait for the Promise:
algorithm.triggerFeedUpdate().then(() => timeline = algorithm.timeline);

// You can pull additional past timeline toots beyond the configured initial amount:
algorithm.triggerHomeTimelineBackFill();
```

#### Setting Weights For The Various Feed Scorers
```typescript
import { ScoreName, Toot, Weights, WeightPresetLabel } from "fedialgo";

// Get and set score weightings (the things controlled by the sliders in the demo app)
const weights: Weights = await algorithm.getUserWeights();
weights[ScoreName.NUM_REPLIES] = 0.5;
let timelineFeed: Toot[] = await algorithm.updateUserWeights(weights);

// Additional properties (description, minimum value, etc) can be found at algorithm.weightInfo.
for (const key in algorithm.weightInfo) {
    console.log(`Weight '${key}' info: ${algorithm.weightInfo[key]}`);
}

// Or choose a preset weight configuration using the WeightPresetLabel enum
timelineFeed = await algorithm.updateUserWeightsToPreset(WeightPresetLabel.CHRONOLOGICAL);
// All the presets can be found in algorithm.weightPresets
Object.entries(algorithm.weightPresets).forEach(([presetName, weights]) => {
    console.log(`${presetName}:`, weights)
});
```

#### Filtering The Feed
```typescript
import { BooleanFilterName, ScoreName, TagTootsCacheKey, Toot, Weights } from "fedialgo";

// Set a filter for only German language toots
algorithm.filters.booleanFilters[BooleanFilterName.LANGUAGE].updateOption("de", true);
const filteredFeed: Toot[] = algorithm.updateFilters(filters);

// Set a filter for only toots with at least 3 replies
algorithm.filters.numericFilters[ScoreName.NUM_REPLIES].value = 3;
const filteredFeed: Toot[] = algorithm.updateFilters(filters);

// There's also a lot of information available about the options that can be chosen for each filter
filters.booleanFilters[BooleanFilterName.HASHTAG].options.forEach((option) => {
    console.log(`Tooted the hashtag "${option.name} ${option[TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]} times`);
});
```

#### Errors
Most minor API errors will be handled silently so that if, for example, fedialgo only gets half of a user's recent toots or whatever that doesn't cause any issues for the client app. If you want to see what, if any, errors were encountered during the scoring process you can check `apiErrorMsgs` to find them.

```typescript
console.log(`API errors:`, algorithm.apiErrorMsgs);
```

#### Resetting Everything
You can wipe the browser storage and reset all variables if needed.
```typescript
// Delete the user's timeline and historical data but preserve the user session
await algorithm.reset();
// Wipe EVERYTHING (will force a logout and complete reauthentication)
await algorithm.reset(true);
```

## `fedialgo` Functions And Types Documentation
There is some documentation of various classes and methods you might want to access while working with `fedialgo` generated from JSDoc comments in the code available [here](https://michelcrypt4d4mus.github.io/fedialgo/).

#### `Toot` Object API
The timeline is returned as an array of `Toot` objects which are a minimal extension of the mastodon API's `Status` object with a few more properties and some helper methods. Check [`toot.ts`](./src/api/objects/toot.ts) for details. In particular note that you can mark a `Toot` object's `numTimesShown` property, at which point the `AlreadyShownScorer` will return non-zero values for that Toot.

```typescript
timelineFeed[0].numTimesShown = 1;
```

#### Other Data Available From `TheAlgorithm`
FediAlgo exports a number of types and enums; check [the documentation](https://michelcrypt4d4mus.github.io/fedialgo/) or look at the bottom of [`index.ts`](src/index.ts) for details on what is available.
`TheAlgorithm` objects also provide a bunch of data besides the timeline should you choose to access it.

#### Fediverse Trending Data
Current "trending" fediverse data can be accessed at `algorithm.trendingData`. See [`types.ts`](src/types.ts) for info on the data type.

```typescript
// Trending links
algorithm.trendingData.links.foreach((link) => console.log(`Link '${link.uri}' tooted by ${link.numAccounts} accounts`));

// Trending tags
algorithm.trendingData.tags.foreach((tag) => console.log(`Tag '${tag.name}' tooted by ${tag.numAccounts} accounts`));

// Trending toots
algorithm.trendingData.toots.foreach((toot) => console.log(`Trending toot w/rank ${toot.trendingRank}: '${toot.describe()}'`));

// Popular servers
console.log(`Servers used to determine trending data:`, algorithm.mastodonServers);
```

#### User Data
The user's followed accounts, muted accounts, followed tags, and a few other bits and bobs used the compute the weighting in the timeline can be accessed at `algorithm.userData`. See [`user_data.ts`](src/api/user_data.ts) for info on the data type (and be aware this is probably the least stable / most subject to change part of the fedialgo API).

There's also a unified method to collect a bunch of information (`fedialgo` configuration, server configuration, user data, filter settings, etc.) with a single call:

```typescript
const currentState = await algorithm.getCurrentState();
```


## Package Configuration
Package configuration options can be found in [`src/config.ts`](src/config.ts). These can't currently be changed via the API though feel free to experiment with your local copy of the repo or ping me if you have a use case for updating some of the configuration variables.


# Contributing
### Developer Setup
If necessary install the dev dependencies with `npm install --include=dev`.

### Debugging
If you set the environment variable `FEDIALGO_DEBUG=true` a _lot_ more debugging info will be printed to the browser console. See [`.env.example`](./.env.example) for other environment variables you can play with.

### Adding New Scorers
To add a new metric for scoring toots you must:

1. Add an entry to the `ScoreName` enum
1. Create a new subclass of [`Scorer`](src/scorer/scorer.ts)
1. Add a default weight for your scorer to [`DEFAULT_WEIGHTS`](src/scorer/weight_presets.ts)
1. Instantiate an instance of your new `Scorer` in the appropriate array in [`TheAlgorithm`](src/index.ts) (`featureScorers` if it's a self contained score that requires only the information in a single toot, `feedScorers` if it's a scorer that requires the entire set of timeline toots to score a toot)

### Deploying Changes
For changes to propagate you must run `npm run build` to generate changes to files in `dist/` and then check those files into git.

### Developing Against a Local Project
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
(The test suite is kind of useless unfortnately.)
~~`npm run test`~~

### Miscellaneous
Use `// @ts-ignore` if you run into Typescript warnings (because your project might also use `masto`)

```bash
npm run build
```
in `fedialgo` directory after changes and they will automatically be detected.

There's a pre-commit git hook that runs `npm run build` but unfortunately it doesn't seem to actually run _before_ the commit :(

### Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)


# TODO
1. Support [domain level blocks](https://docs.joinmastodon.org/methods/domain_blocks/)
1. Make use of the fact that you can see who favourited a post: https://docs.joinmastodon.org/methods/statuses/#favourited_by

### What's slow:
According to Chrome profiler it's the retrieval of the user's favourites that is the biggest bottleneck at initial load time. Took ~10 seconds, getting user's old toots took ~5s.
