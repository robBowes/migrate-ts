/* eslint-disable */
import { createProject, Project, ts as tsm } from "@ts-morph/bootstrap";
import ts from "typescript";
import path from "path";
import log from "loglevel";
import MigrateConfig from "./MigrateConfig";
import PerfTimer from "../utils/PerfTimer";
import { PluginParams } from "../../types";

interface MigrateParams {
  rootDir: string;
  tsConfigDir?: string;
  config: MigrateConfig;
  sources?: string | string[];
}

export default async function migrate({
  rootDir,
  tsConfigDir = rootDir,
  config,
  sources,
}: MigrateParams): Promise<number> {
  let exitCode = 0;
  log.warn(
    `TypeScript version: ${ts.version}, ts-morph version is ${tsm.version} `
  );
  const serverInitTimer = new PerfTimer();

  // Normalize sources to be an array of full paths.
  if (sources !== undefined) {
    sources = Array.isArray(sources) ? sources : [sources];
    sources = sources.map((source) => path.join(rootDir, source));
    log.warn(
      `Ignoring sources from tsconfig.json, using the ones provided manually instead.`
    );
  }

  const tsConfigFilePath = path.join(tsConfigDir, "tsconfig.json");
  const project = await createProject({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: sources !== undefined,
    skipFileDependencyResolution: true,
  });
  // If we passed in our own sources, let's add them to the project.
  // If not, let's just get all the sources in the project.
  if (sources) {
    await project.addSourceFilesByPaths(sources);
  }

  log.warn(`Initialized tsserver project in ${serverInitTimer.elapsedStr()}.`);

  log.warn("Start...");
  const pluginsTimer = new PerfTimer();
  const updatedSourceFiles = new Set<string>();
  const originalSourceFilesToMigrate = new Set<string>(
    getSourceFilesToMigrate(project).map((file) => file.fileName)
  );

  for (let i = 0; i < config.plugins.length; i += 1) {
    const { plugin, options: pluginOptions } = config.plugins[i];

    const pluginLogPrefix = `[${plugin.name}]`;
    const pluginTimer = new PerfTimer();
    log.warn(
      `${pluginLogPrefix} Plugin ${i + 1} of ${config.plugins.length}. Start...`
    );

    const sourceFiles = getSourceFilesToMigrate(project).filter(
      ({ fileName }) => originalSourceFilesToMigrate.has(fileName)
    );

    for (const sourceFile of sourceFiles) {
      const { fileName } = sourceFile;
      const fileTimer = new PerfTimer();
      const relFile = path.relative(rootDir, sourceFile.fileName);
      const fileLogPrefix = `${pluginLogPrefix}[${relFile}]`;

      const getLanguageService = () => project.getLanguageService();

      const params: PluginParams<unknown> = {
        fileName,
        rootDir,
        sourceFile,
        text: sourceFile.text,
        options: pluginOptions,
        getLanguageService,
      };
      try {
        const newText = await plugin.run(params);
        if (typeof newText === "string" && newText !== sourceFile.text) {
          project.updateSourceFile(fileName, newText);
          updatedSourceFiles.add(sourceFile.fileName);
        }
      } catch (pluginErr) {
        log.error(`${fileLogPrefix} Error:\n`, pluginErr);
        exitCode = -1;
      }
      log.warn(`${fileLogPrefix} Finished in ${fileTimer.elapsedStr()}.`);
    }

    log.warn(`${pluginLogPrefix} Finished in ${pluginTimer.elapsedStr()}.`);
  }

  log.warn(
    `Finished in ${pluginsTimer.elapsedStr()}, for ${
      config.plugins.length
    } plugin(s).`
  );

  const writeTimer = new PerfTimer();

  log.warn(`Writing ${updatedSourceFiles.size} updated file(s)...`);
  const writes = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const fileName of updatedSourceFiles) {
    const sourceFile = project.getSourceFileOrThrow(fileName);
    writes.push(
      project.fileSystem.writeFile(sourceFile.fileName, sourceFile.text)
    );
  }
  await Promise.all(writes);

  log.warn(
    `Wrote ${
      updatedSourceFiles.size
    } updated file(s) in ${writeTimer.elapsedStr()}.`
  );

  return exitCode;
}

function getSourceFilesToMigrate(project: Project) {
  return project
    .getSourceFiles()
    .filter(({ fileName }) => !/(\.d\.ts|\.json)$|node_modules/.test(fileName));
}

export { MigrateConfig };
