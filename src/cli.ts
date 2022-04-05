#!/usr/bin/env node

/* eslint-disable no-await-in-loop, no-restricted-syntax */
import path from "path";
// import log from 'loglevel';
import yargs from "yargs";

// import ts from 'typescript';
// import { readFileSync } from 'fs';
import {
  addConversionsPlugin,
  declareMissingClassPropertiesPlugin,
  eslintFixPlugin,
  explicitAnyPlugin,
  hoistClassStaticsPlugin,
  jsDocPlugin,
  memberAccessibilityPlugin,
  reactClassLifecycleMethodsPlugin,
  reactClassStatePlugin,
  reactDefaultPropsPlugin,
  reactPropsPlugin,
  reactShapePlugin,
  stripTSIgnorePlugin,
  tsIgnorePlugin,
  Plugin,
} from "./ts-migrate-plugins";
import { migrate, MigrateConfig } from "./index";
import renameFunction from "./rename";

const availablePlugins = {
  addConversionsPlugin,
  declareMissingClassPropertiesPlugin,
  eslintFixPlugin,
  explicitAnyPlugin,
  hoistClassStaticsPlugin,
  jsDocPlugin,
  memberAccessibilityPlugin,
  reactClassLifecycleMethodsPlugin,
  reactClassStatePlugin,
  reactDefaultPropsPlugin,
  reactPropsPlugin,
  reactShapePlugin,
  stripTSIgnorePlugin,
  tsIgnorePlugin,
};
const renameSources = (sources: string | string[]) => {
  const mapper = (source: string) => source.replace(".jsx", ".tsx").replace(".js", ".ts");
  return Array.isArray(sources) ? sources.map(mapper) : mapper(sources);
};

// eslint-disable-next-line no-unused-expressions
yargs
  .command(
    "rename [options] <folder>",
    "Rename files in folder from JS/JSX to TS/TSX",
    (cmd) =>
      cmd
        .positional("folder", { type: "string" })
        .string("sources")
        .alias("sources", "s")
        .describe("sources", "Path to a subset of your project to rename.")
        .example(
          "$0 rename /frontend/foo",
          "Rename all the files in /frontend/foo"
        )
        .example(
          '$0 rename /frontend/foo -s "bar/**/*"',
          "Rename all the files in /frontend/foo/bar"
        )
        .require(["folder"]),
    (args) => {
      const rootDir = path.resolve(process.cwd(), args.folder);
      const { sources } = args;
      const exitCode = renameFunction({ rootDir, sources });
      process.exit(exitCode);
    }
  )
  .command(
    ["migrate [sources...]", '$0'],
    "Fix TypeScript errors, using codemods",
    (cmd) =>
      cmd
        .string("sources")
        .string("plugin")
        .boolean("rename")
        .boolean("ignore")
        .boolean("reignore")
        .alias("sources", "s")
        .alias("ignore", "i")
        .alias("rename", "r")
        .describe(
          "sources",
          "Path to a subset of your project to rename (globs are ok)."
        )
        .example(
          "migrate /frontend/foo",
          "Migrate all the files in /frontend/foo"
        )
        .example(
          '$0 migrate /frontend/foo -s "bar/**/*" -s "node_modules/**/*.d.ts"',
          "Migrate all the files in /frontend/foo/bar, accounting for ambient types from node_modules."
        ),
    async (args) => {
      const rootDir = path.resolve(process.cwd());
      console.log(args, rootDir);
      const { ignore, rename, reignore } = args;
      // eslint-disable-next-line prefer-destructuring
      let sources: string | string[] = args.sources;

      if (rename) {
        const renameExitCode = renameFunction({ rootDir, sources });
        if (renameExitCode !== 0) {
          process.exit(renameExitCode);
        }
          sources = renameSources(sources);
      }
      console.log(sources);

      const anyAlias = "TSFixMe";
      const anyFunctionAlias = "TSFixMeFunction";
      const config = new MigrateConfig();

      if (args.plugin) {
        config.addPlugin(availablePlugins[args.plugin], { anyAlias });
        const exitCode = await migrate({ rootDir, config, sources });
        process.exit(exitCode);
      }

      if (reignore) {
        config.addPlugin(stripTSIgnorePlugin, {});
      }
      // .addPlugin(hoistClassStaticsPlugin, { anyAlias })
      config
        .addPlugin(reactPropsPlugin, {
          anyAlias,
          anyFunctionAlias,
          // shouldUpdateAirbnbImports: true,
        })
        .addPlugin(reactClassStatePlugin, { anyAlias })
        .addPlugin(reactClassLifecycleMethodsPlugin, { force: true })
        // .addPlugin(reactDefaultPropsPlugin, {
        //   useDefaultPropsHelper,
        // })
        // .addPlugin(reactShapePlugin, {
        //   anyAlias,
        //   anyFunctionAlias,
        // })
        .addPlugin(declareMissingClassPropertiesPlugin, { anyAlias })
        .addPlugin(jsDocPlugin, { anyAlias, typeMap: undefined })
        .addPlugin(explicitAnyPlugin, { anyAlias })
        .addPlugin(addConversionsPlugin, { anyAlias })
        // We need to run eslint-fix before ts-ignore because formatting may affect where
        // the errors are that need to get ignored.
        .addPlugin(eslintFixPlugin, {});

      if (ignore) {
        //
        // // We need to run eslint-fix again after ts-ignore to fix up formatting.
        //
        config.addPlugin(tsIgnorePlugin, {});
      }

      const exitCode = await migrate({ rootDir, config, sources });
      process.exit(exitCode);
    }
  )
  .command(
    "reignore <folder>",
    "Remove then re-add ts-ignore comments",
    (cmd) => cmd.positional("folder", { type: "string" }).require(["folder"]),
    async (args) => {
      const rootDir = path.resolve(process.cwd(), args.folder);

      const changedFiles = new Map<string, string>();
      function withChangeTracking(plugin: Plugin<unknown>): Plugin<unknown> {
        return {
          name: plugin.name,
          async run(params) {
            const prevText = params.text;
            const nextText = await plugin.run(params);
            const seen = changedFiles.has(params.fileName);
            if (!seen && nextText != null && nextText !== prevText) {
              changedFiles.set(params.fileName, prevText);
            }
            return nextText;
          },
        };
      }
      // const eslintFixChangedPlugin: Plugin = {
      //   name: 'eslint-fix-changed',
      //   async run(params) {
      //     if (!changedFiles.has(params.fileName)) return undefined;
      //     if (changedFiles.get(params.fileName) === params.text) return undefined;
      //     return eslintFixPlugin.run(params);
      //   },
      // };

      const config = new MigrateConfig()
        .addPlugin(withChangeTracking(stripTSIgnorePlugin), {})
        .addPlugin(withChangeTracking(tsIgnorePlugin), {});
      // .addPlugin(eslintFixChangedPlugin, {});

      const exitCode = await migrate({ rootDir, config });

      process.exit(exitCode);
    }
  )
  .example("$0 --help", "Show help")
  .example("$0 migrate --help", "Show help for the migrate command")
  .example(
    "$0 init frontend/foo",
    "Create tsconfig.json file at frontend/foo/tsconfig.json"
  )
  .example(
    "$0 init:extended frontend/foo",
    "Create extended from the base tsconfig.json file at frontend/foo/tsconfig.json"
  )
  .example(
    "$0 rename frontend/foo",
    "Rename files in frontend/foo from JS/JSX to TS/TSX"
  )
  .example(
    '$0 rename frontend/foo --s "bar/baz"',
    "Rename files in frontend/foo/bar/baz from JS/JSX to TS/TSX"
  )
  .demandCommand(1, "Must provide a command.")
  .help("h")
  .alias("h", "help")
  .alias("i", "init")
  .alias("m", "migrate")
  .alias("rn", "rename")
  .alias("ri", "reignore")
  .wrap(Math.min(yargs.terminalWidth(), 100)).argv;
