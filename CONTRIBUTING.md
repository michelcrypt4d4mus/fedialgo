## Developer Setup
If necessary install the dev dependencies with `npm install --include=dev`.

## Developing Against a Local Project
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
If you set the environment variable `FEDIALGO_DEBUG=true` a _lot_ more debugging info will be printed to the browser console. See [`.env.example`](./.env.example) for other environment variables you can play with.

### Adding New Scorers
To add a new metric for scoring toots you must:

1. Add an entry to the `ScoreName` enum
1. Create a new subclass of [`Scorer`](src/scorer/scorer.ts)
1. Add a default weight for your scorer to [`DEFAULT_WEIGHTS`](src/scorer/weight_presets.ts)
1. Instantiate an instance of your new `Scorer` in the appropriate array in [`TheAlgorithm`](src/index.ts) (`featureScorers` if it's a self contained score that requires only the information in a single toot, `feedScorers` if it's a scorer that requires the entire set of timeline toots to score a toot)

### Deploying Changes
For changes to propagate you must run `npm run build` to generate changes to files in `dist/` and then check those files into git (it's terrible, I know).

To deploy documentation changes run [`./deploy_documentation.sh`](./deploy_documentation.sh).

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

## Resources
* [`masto.js` documentation](https://neet.github.io/masto.js)
* [Compiling and bundling TypeScript libraries with Webpack](https://marcobotto.com/blog/compiling-and-bundling-typescript-libraries-with-webpack/)
