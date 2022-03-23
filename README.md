# migrate-ts

A modified version of [ts-migrate](https://github.com/airbnb/ts-migrate) designed to work in the zola projects.

## To use:

Install the package

```
npm i migrate-ts -D
```

Add the cli to your package.json scripts

```
...
  "scripts": {
    "migrate-ts": "migrate-ts",
...
```

Run the script

```
npm run migrate-ts -- migrate ./ --sources "<relative filename>" [flags]
```

# Examples:

Migrate a single javascript file

```
 npm run ts-migrate -- migrate ./ --sources "./src/pages/LegacyComponent.jsx" --rename
```

Migrate a folder of js files

```
npm run ts-migrate -- migrate ./ --sources "./src/pages/*.jsx" --rename
```

Migrate a folder of js files and add ignore comments

```
npm run ts-migrate -- migrate ./ --sources "./src/pages/*.jsx" --rename --ignore
```

Migrate a single ts file and re-add ignore comments

```
npm run ts-migrate -- migrate ./ --sources "./src/pages/tsFile.ts" --ignore --reignore
```

# License

MIT, see [LICENSE](https://github.com/rbowes/migrate-ts/blob/master/LICENCE) for details.
