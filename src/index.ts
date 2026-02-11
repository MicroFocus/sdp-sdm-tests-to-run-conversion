import parseTestsToRun from "./testsToRunParser";
import convertTestsToRun from "./testsToRunConverter";
import Logger from "./utils/logger";

const LOGGER: Logger = new Logger("index.ts");

export const convertTests = (
  testsToRun: string,
  framework: string,
  rootDirectory: string,
  customFramework?: string,
) => {
  const parsedTestsToRun = parseTestsToRun(testsToRun);
  if (parseTestsToRun.length === 0) {
    LOGGER.error("No tests to run have been found.");
    return;
  }

  return convertTestsToRun(
    parsedTestsToRun,
    framework,
    rootDirectory,
    customFramework,
  );
};
