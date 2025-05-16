<!-- [![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml) -->

(Forked from [pkreissel's original implementation](https://github.com/pkreissel/fedialgo))

# `fedialgo`

* Try the demo [here](https://michelcrypt4d4mus.github.io/fedialgo_demo_app_foryoufeed/)!

Video of the FediAlgo demo in action [on YouTube](https://www.youtube.com/watch?v=tR35bUHzJdk).

Fedialgo is a `node.js` package that can be used to produce an algorithmic fediverse experience. This will replace the project "fedifeed" and make it possible to implement the idea into all kinds of other projects. It should (hopefully) also work in React Native Projects but that's untested.

### Usable Demo
You can try FediAlgo out just by pointing your browser at [here](https://fedialgo.thms.uk/) thanks to @nanos.

# Installation
### The Demo App
`fedialgo` is just a `node.js` package. You don't use it on its own; it can only function when used inside of a larger application.

If you're not developing your own app there's a simple demo app that can spin up a webserver, score and order a curated "For You" style Mastodon feed, and present it to your browser at `http://localhost:3000/`. The demo app is incredibly easy to setup; you can find it over in the [`fedialgo_demo_app_foryoufeed`](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed) repo.

### In A `node.js` Project
You can install from github with `npm`:

```bash
npm install --save github:michelcrypt4d4mus/fedialgo
```

Or with `yarn`:

```bash
yarn add https://github.com/michelcrypt4d4mus/fedialgo
```

If you're using the library in a browser you may also need the `buffer` package if you get a `Buffer is not a function` error:
```bash
npm install --save buffer
```

And then put this in your main entrypoint (e.g. `App.tsx` or something like that):

```typescript
import { Buffer } from 'buffer'; // Required for class-transformer to work
(window as any).Buffer = Buffer;
```

# Usage
The demo app's [`Feed`](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed/blob/master/src/pages/Feed.tsx) component demonstrates the latest and greatest way to use Fedialgo but here's a quick overview of how to get up and running:

```typescript
import TheAlgorithm from "fedialgo"
import { createRestAPIClient, mastodon } from "masto";
import { stringifyQuery } from 'ufo';

// Register an Application with the Mastodon server and authenticate the user to it.
// You can do this manually or programatically via OAuth. There's some documentation on doing
// it manually at https://github.com/neet/masto.js/?tab=readme-ov-file#quick-start
// Doing it programatically requires going through the OAuth flow.
const mastodonServer = "mastodon.social"
const api = createRestAPIClient({url: mastodonServer});

// Register your app
const app = await api.v1.apps.create({
    clientName: "my_app,
    redirectUris: MY_OAUTH_REDIRECT_URL,  // The URL where your app will accept OAuth callbacks
    scopes: "read",  // FediAlgo requires only read access
    website: mastodonServer,
});


// Go through the OAuth flow
const oauthURL = `${mastodonServer}/oauth/authorize?` + stringifyQuery({
    client_id: app.clientId,
    redirect_uri: MY_OAUTH_REDIRECT_URL,
    response_type: 'code',
    scope: "read,
});


const currentUser = await api.v1.accounts.verifyCredentials()

// Instantiate a TheAlgorithm object
const algorithm = await TheAlgorithm.create({
    api: api,
    user: currentUser,
    locale: "en-GB",     // optional (available in navigator.language in browser)
})
```

Optionally (though you are encouraged to use FediAlgo this way) you can set up a callback for FediAlgo to use
to manage the state of the timeline in your app. In React this might look like:

```typescript
import { useState } from React;
const [timeline, setTimeline] = useState<Toot[]>([]);

const algorithm = await TheAlgorithm.create({
    api: api,
    user: currentUser,
    setTimelineInApp: setTimeline  // optional but encouraged
});
```

Once you've instantiated a `TheAlgorithm` object there's three primary ways of interacting with it:

```typescript
import { BooleanFilterName, Toot, WeightName, Weights } from "fedialgo";

// Trigger the feed builder. FediAlgo will start doing stuff asynchronously. If you passed setTimelineInApp
// in the constructor all you need to do is monitor the state of whatever variable contains the timeline
// (in the React example above that variable would be 'timeline').
let timeline: Toot[];
algorithm.triggerFeedUpdate();

// algorithm.getTimeline() returns the current weight-ordered/filtered array of Toot objects
// Note there won't be anything in there until the timeilne is at least partially done being built!
let timeline: Toot[] = algorithm.getTimeline();
// If you wanted to wait until the feed was fully constructed, wait for the Promise:
algorithm.triggerFeedUpdate().then(() => timeline = algorithm.getTimeline());

// Check if loading is in progress before calling, otherwise you might get thrown an exception
if (!algorithm.isLoading()) algorithm.triggerFeedUpdate();

// Get and set score weightings (the things controlled by the sliders in the demo app)
const weights: Weights = await algorithm.getUserWeights();
weights[WeightName.NUM_REPLIES] = 0.5;
timelineFeed = await algorithm.updateUserWeights(weights);

// Choose a preset weight configuration
const weightPresetNames = Object.keys(algorithm.weightPresets);
timelineFeed = await algorithm.updateUserWeightsToPreset(weightPresetNames[0]);

// The names of the weights that can be adjusted are exported as the WeightName enum. Additional properties (description, minimum value, etc) can be found at algorithm.weightInfo.
for (const key in WeightName) console.log(`Weight '${key}' info: ${algorithm.weightInfo[key]}`);

// Set a filter for only German language toots
const filters = algorithm.getFilters();
filters.filterSections[BooleanFilterName.LANGUAGE].updateValidOptions("de", true);
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
algorithm.trendingData.tags.foreach((tag) => console.log(`Tag '${tag.name}' tooted by ${tag.numAccounts} accounts`));

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

### Debugging
If you set the environment variable `FEDIALGO_DEBUG=true` a _lot_ more debugging info will be printed to the browser console. See [`.env.example`](./.env.example) for other environment variables you can play with.

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
~~`npm run test`~~

### Miscellaneous
Use // @ts-ignore if you run into Typescript warnings (because your project might also use `masto`)

```bash
npm run build
```
in `fedialgo` directory after changes and they will automatically be detected.

There's a pre-commit git hook that runs `npm run build` but unfortunately it doesn't seem to actually run _before_ the commit :(


# TODO
1. Add scoring for links similar to `onlyLinks` filter
1. Make use of the fact that you can see who favourited a post: https://docs.joinmastodon.org/methods/statuses/#favourited_by

### What's slow:
Some recent stats from a LOAD_TEST

* Loaded + completely scored 2,708 toots for timeline in 204.1 seconds (1,594 home timeline toots covering 12 hours)
* [RecentNotifications] Completing fetch at page 6, 80 in page, 480 records so far in 13.6 seconds
* [RecentUserToots] Completing fetch at page 12, 40 in page, 480 records so far in 14.8 seconds
* [FavouritedToots] Completing fetch at page 12, 40 in page, 480 records so far in 14.2 seconds
* [HomeTimeline] Completing fetch at page 41, 0 in page, 1594 records so far in 111.2 seconds


# Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
