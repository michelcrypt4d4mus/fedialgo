# Developer Setup
If necessary install the dev dependencies with `npm install --include=dev`.

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

### Debugging
If you set the environment variable `FEDIALGO_DEBUG=true` a _lot_ more debugging info will be printed to the browser console. You can set this and other environment variables permanently by creating a `.env` file. See [`.env.example`](./.env.example) for other environment variables you can play with.


# Building and Deploying
For changes to propagate you must run `npm run build` to generate changes to files in `dist/` and then check those files into git (it's terrible, I know).

```bash
npm run build
```

There's a pre-commit git hook that runs `npm run build` whenever you `git commit` but unfortunately it doesn't seem to actually run _before_ the commit `:(`

#### Documentation Changes
To deploy documentation changes run [`./deploy_documentation.sh`](./deploy_documentation.sh).


# Adding New Scorers
To add a new metric for scoring toots you must:

1. Add an entry to the `ScoreName` enum
1. Create a new subclass of [`Scorer`](src/scorer/scorer.ts)
1. Add a default weight for your scorer to [`DEFAULT_WEIGHTS`](src/scorer/weight_presets.ts)
1. Instantiate an instance of your new `Scorer` in the appropriate array in [`TheAlgorithm`](src/index.ts) (`tootScorers` if it's a self contained score that requires only the information in a single toot, `feedScorers` if it's a scorer that requires the entire set of timeline toots to score a toot)


# Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
