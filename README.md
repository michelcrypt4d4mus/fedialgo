<!-- [![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml) -->

(Forked from [pkreissel's original implementation](https://github.com/pkreissel/fedialgo))

# `fedialgo`
FediAlgo in action on YouTube:

[![FediAlgo in action](https://img.youtube.com/vi/_0TaYxU1Tpk/0.jpg)](https://www.youtube.com/watch?v=_0TaYxU1Tpk)

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

// Verify mastodon login and instantiate a TheAlgorithm object
const api: mastodon.Client = await login({url: user.server, accessToken: user.access_token});
const currentUser = await api.v1.accounts.verifyCredentials()
const algorithm = await TheAlgorithm.create({api: api, user: currentUser})
```

Once you've instantiated a `TheAlgorithm` object there's three primary ways of interacting with it:

```typescript
import { Toot, WeightName, Weights } from "fedialgo";

// Get a weight-ordered timeline of 400 home timeline Toot objects combined with trending toots
let timelineFeed: Toot[] = await algorithm.getFeed(400);
// Get next 400 timeline toots. Args are numToots and maxID. Also see "Callbacks" section below
timelineFeed = await algorithm.getFeed(400, feed[0].id);

// Get and set score weightings (the things controlled by the sliders in the demo app)
const weights: Weights = await algorithm.getUserWeights();
weights[WeightName.NUM_REPLIES] = 0.5;
timelineFeed = await algorithm.updateUserWeights(weights);

// Set a filter for only German language toots
const filters = algorithm.getFilters();
filters.filterSections[PropertyName.LANGUAGE].updateValidOptions("de", true);
const filteredFeed = algorithm.updateFilters(filters);

// Set a filter for only toots with at least 3 replies
filters.numericFilters[WeightName.NUM_REPLIES].value = 3;
const filteredFeed = algorithm.updateFilters(filters);
```

### Timeline Callback
You can optionally pass a `setFeedInApp()` callback to `TheAlgorithm.create()` that will be called whenever the feed is changed. The initial fetch of timeline toots will get `Config.numTootsInFirstFetch` timeline elements after which `TheAlgorithm` will start pulling batches of toots in the background and integrating them into the timeline.

The callback will be invoked when:

* An incremental batch of toots is retrieved from the server and integrated into the timeline
* A call is made to `algorithm.updateUserWeights()` or `algorithm.updateFilters()`.

An example involving React component state:

```typescript
import { useState } from React;
import { TheAlgorithm, Toot } from "fedialgo";

const api = await login({url: user.server, accessToken: user.access_token});
const currentUser = await api.v1.accounts.verifyCredentials()
const [feed, setFeed] = useState<Toot[]>([]);

// setFeed() will be invoked when the feed is changed (e.g. via updateUserWeights() or updateFilters())
const algorithm = await TheAlgorithm.create({api: api, user: currentUser, setFeedInApp: setFeed})
```

### `Toot` API
The timeline is returned as an array of `Toot` objects which are a minimal extension of the mastodon API's `Status` object with a few more properties and some helper methods. Check [`toot.ts`](./src/api/objects/toot.ts) for details.

### Package Configuration
Package configuration options can be found in [`src/config.ts`](src/config.ts). You can't change these via the API currently.

### ~~Learn Weights~~
**DOES NOT CURRENTLY WORK!** can be enabled only by manually changing the value of `weightLearningEnabled` variable in this codebase.

You can also let the algorithm learn the weights from the user's behaviour. This is done by passing the scores of the posts to the algorithm. The algorithm will then adjust the weights accordingly. This is quite simple, but still has impact on the feed. For example you could choose to adjust the weight after each click on a post, after a reblog, or after a link click.

```typescript
const scores = status.scores
const newWeights = await algoObj.learnWeights(scores)
```


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


# Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
