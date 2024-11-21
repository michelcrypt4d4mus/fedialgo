# fedialgo
This is untested early alpha so might be due to massive unannounced changes.

[![Fedialgo Build and Test](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml/badge.svg)](https://github.com/pkreissel/fedialgo/actions/workflows/CI.yaml)
Fedialgo is an typescript module, that can be used to produce an algorithmic fediverse experience. This will replace the project "fedifeed" and make it possible to implement the idea into all kinds of other projects. It uses React Native Async Storage, so it should also work in React Native Projects, but havent tested it yet.

##
Install directly from github:
```console
npm install github:pkreissel/fedialgo
```

## Local Install
Clone the repo and cd into it.

Run:
```console
npm install
npm link
```
Then in your local project:
```console
npm link fedialgo
```
Use // @ts-ignore if you run into Typescript warnings (because your project might also use masto)
```console
npm run build
```
in `fedialgo` directory after changes and they will automatically be detected

### Demo App
`fedialgo` is just a node package. You don't use it on its own in the form in this repo; it has to be imported into some other app. Thankfully there's a simple demo app that spins up a webserver, pulls your feed and scores it with the algorithm in this repo, and then presents it to your browser at `http://localhost:3000/` over in [the `foryoufeed` repo](https://github.com/pkreissel/foryoufeed).

## Package Usage

### Weight An Account's Feed:
```typescript
import TheAlgorithm from "fedialgo"
import { login, mastodon } from "masto";

const api: mastodon.Client = await login({
                    url: user.server,
                    accessToken: user.access_token,
                });
const currUser = await api.v1.accounts.verifyCredentials()
const algo = new TheAlgorithm(api, currUser)
const feed = await algo.getFeed()
```

### Adjust Weights:
The algorithm uses features and their weights to determine the order of the posts.
You could e.g. show the weights to the user, who can then decide to change them.

```typescript
let weights = await algo.getWeights()
weights["fav"] = 0.5 // change the weight of the feature "fav" to 0.5
let newWeights = weights
const newFeed = await algoObj.setWeights(newWeights)
```

### Learn Weights
You can also let the algorithm learn the weights from the user's behaviour. This is done by passing the scores of the posts to the algorithm. The algorithm will then adjust the weights accordingly. This is quite simple, but still has impact on the feed. For example you could choose to adjust the weight after each click on a post, after a reblog, or after a link click.

```typescript
const scores = status.scores
const newWeights = await algoObj.weightAdjust(scores)
```

# Contributing
### Developer Setup
If necessary install the dev dependencies with `npm install --include=dev`.

#### Running Test Suite
`npm run test`

### TODO
1. Add scorers for:
   * number of replies
   * number of favorites
   * number (and size?) of `mediaAttachments`
   * movies vs. images
