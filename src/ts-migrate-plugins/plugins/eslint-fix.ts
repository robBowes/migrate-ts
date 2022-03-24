import { ESLint } from "eslint";
import { Plugin } from "../../../types";
import path from "path";

const cli = new ESLint({
  fix: true,
  useEslintrc: false,
  // Set ignore to false so we can lint in `tmp` for testing
  ignore: false,
  overrideConfigFile: path.resolve(
    process.env.WEB_DIR!,
    "web-marketplace",
    ".eslintrc"
  ),
  cwd: "/Users/Shared/web/web-marketplace",
});

const eslintFixPlugin: Plugin = {
  name: "eslint-fix",
  async run({ fileName, text }) {
    try {
      let newText = text;
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const [report] = await cli.lintText(newText, {
          filePath: fileName,
          // warnIgnored
        });
        // console.log(await cli.calculateConfigForFile(fileName))
        // console.log(fileName, report)

        if (!report || !report.output || report.output === newText) {
          break;
        }
        newText = report.output;
      }
      return newText;
    } catch (e) {
      console.error("Error occurred in eslint-fix plugin :(", e);
      return text;
    }
  },
};

export default eslintFixPlugin;
