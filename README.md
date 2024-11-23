(Forked from [pkreissel's original implementation](https://github.com/pkreissel/fedialgo))

# `fedialgo`
This is untested early alpha so might be due to massive unannounced changes.

<!-- [![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml) -->
Fedialgo is an typescript module, that can be used to produce an algorithmic fediverse experience. This will replace the project "fedifeed" and make it possible to implement the idea into all kinds of other projects. It uses React Native Async Storage, so it should also work in React Native Projects, but havent tested it yet.


# Installation
### The Demo App
`fedialgo` is just a node package. You don't use it on its own in the form in this repo; it's just a library package and can only function when used inside of a larger `node.js` app.

Thankfully there's a simple demo app that can spin up a webserver, score your Mastodon feed with the `fedialgo`, and presents it to your browser at `http://localhost:3000/` over in [the `fedialgo_demo_app_foryoufeed` repo](https://github.com/michelcrypt4d4mus/fedialgo_demo_app_foryoufeed).

### In A `node.js` Project
You can install from github with `npm`:

```bash
npm install github:michelcrypt4d4mus/fedialgo
```

#### Weight An Account's Feed:
```typescript
import { login, mastodon } from "masto";
import { TheAlgorithm } from "fedialgo"

const api: mastodon.Client = await login({
                    url: user.server,
                    accessToken: user.access_token,
                });
const currUser = await api.v1.accounts.verifyCredentials()
const algo = new TheAlgorithm(api, currUser)
const feed = await algo.getFeed()
```

#### Adjust Weights:
The algorithm uses properties of a toot and the user configured weights to determine the order that toots will appear in your timeline.
You could e.g. show the weights to the user, who can then decide to change them.

```typescript
let weights = await algo.getScoreWeights()
weights["fav"] = 0.5 // change the weight of the feature "fav" to 0.5
let newWeights = weights
const newFeed = await algoObj.setScoreWeights(newWeights)
```

#### Learn Weights
You can also let the algorithm learn the weights from the user's behaviour. This is done by passing the scores of the posts to the algorithm. The algorithm will then adjust the weights accordingly. This is quite simple, but still has impact on the feed. For example you could choose to adjust the weight after each click on a post, after a reblog, or after a link click.

```typescript
const scores = status.scores
const newWeights = await algoObj.weightAdjust(scores)
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
1. Add scorers for:
   * number (and size?) of `mediaAttachments`
   * movies vs. images


# Resources
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
