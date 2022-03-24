# migrate-ts

A modified version of [ts-migrate](https://github.com/airbnb/ts-migrate) designed to work in the zola projects.

## To use:

Run the script

```
npx migrate-ts migrate ./ --sources "<relative filename>" [flags]
```

## Flags

`--ignore`: ignore all ts errors using ts-expect-error comments

`--reignore`: remove all ts-ignore and ts-expect-error comments

`--rename`: rename js and jsx files to ts/tsx

# Examples:

Migrate a single javascript file

```
 npx ts-migrate migrate ./ --sources "./src/pages/LegacyComponent.jsx" --rename
```

Migrate a folder of js files

```
npx ts-migrate migrate ./ --sources "./src/pages/*.jsx" --rename
```

Migrate a folder of js files and add ignore comments

```
npx ts-migrate migrate ./ --sources "./src/pages/*.jsx" --rename --ignore
```

Migrate a single ts file and re-add ignore comments

```
npx ts-migrate migrate ./ --sources "./src/pages/tsFile.ts" --ignore --reignore
```

# License

MIT, see [LICENSE](https://github.com/rbowes/migrate-ts/blob/master/LICENCE) for details.
