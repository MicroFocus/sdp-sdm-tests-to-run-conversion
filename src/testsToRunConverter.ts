/*
 * Copyright 2016-2024 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getConfig } from "./config/config";
import Framework from "./dto/Framework";
import Test from "./dto/Test";
import Logger from "./utils/logger";

const LOGGER: Logger = new Logger("testsToRunConverter.ts");

const CUSTOM_FRAMEWORK_PACKAGE_PLACEHOLDER = "%packageName%";
const CUSTOM_FRAMEWORK_CLASS_PLACEHOLDER = "%className%";
const CUSTOM_FRAMEWORK_TEST_PLACEHOLDER = "%testName%";

const convertTestsToRun = (testsToRun: Test[]): string => {
  const framework = getConfig().framework;
  if (!framework) {
    throw Error("Could not get framework from config.");
  }

  switch (framework) {
    case Framework.JUnit:
    case Framework.MavenSurefire:
    case Framework.TestNG:
      return convertJUnitTestsToRun(testsToRun);
    case Framework.Cucumber:
      return convertCucumberTestsToRun(testsToRun);
    case Framework.CucumberBDD:
      return convertCucumberBDDTestsToRun(testsToRun);
    case Framework.Custom:
      return convertCustomTestsToRun(testsToRun);
    default:
      throw Error(`Unsupported framework: ${framework}`);
  }
};

const convertJUnitTestsToRun = (testsToRun: Test[]): string => {
  LOGGER.info(`Converting testsToRun to JUnit/Maven Surefire/TestNG format...`);

  let convertedTestsMap: { [key: string]: string } = {};
  testsToRun.forEach((testToRun) => {
    const fullPath = testToRun.packageName
      ? testToRun.packageName + "." + testToRun.className
      : testToRun.className;
    if (convertedTestsMap[fullPath]) {
      convertedTestsMap[fullPath] =
        `${convertedTestsMap[fullPath]}+${testToRun.testName}`;
    } else {
      convertedTestsMap[fullPath] = testToRun.testName;
    }
  });

  const convertedTestsToRun = Object.keys(convertedTestsMap)
    .map((key) => key + "#" + convertedTestsMap[key])
    .join(",");

  LOGGER.debug(
    `Successfully converted the tests to run: ${convertedTestsToRun}`,
  );

  return convertedTestsToRun;
};

const convertCucumberTestsToRun = (testsToRun: Test[]): string => {
  LOGGER.info(`Converting testsToRun to Cucumber format...`);

  const convertedTestsToRun = testsToRun
    .filter(
      (testToRun) =>
        testToRun.parameters && testToRun.parameters["featureFilePath"],
    )
    .map(
      (testToRun) => '\\"' + testToRun.parameters!["featureFilePath"] + '\\"',
    )
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" ");

  LOGGER.debug(
    `Successfully converted the tests to run: ${convertedTestsToRun}`,
  );

  return convertedTestsToRun;
};

const convertCucumberBDDTestsToRun = (testsToRun: Test[]): string => {
  LOGGER.info(`Converting testsToRun to Cucumber format...`);

  const convertedFeatures = testsToRun
    .filter(
      (testToRun) =>
        testToRun.parameters && testToRun.parameters["featureFilePath"],
    )
    .map((testToRun) => `'${testToRun.parameters!["featureFilePath"]}'`)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" ");

  const convertedTests = testsToRun
    .map((testToRun) => testToRun.testName.replace("'", "."))
    .map((testName) => `--name '^${testName}$'`)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" ");

  const convertedTestsToRun = `${convertedFeatures} ${convertedTests}`;

  LOGGER.debug(
    `Successfully converted the tests to run: ${convertedTestsToRun}`,
  );

  return convertedTestsToRun;
};

const convertCustomTestsToRun = (testsToRun: Test[]): string => {
  LOGGER.info(`Converting testsToRun to a custom format...`);

  const config = getConfig();
  const customTestPattern = config.customTestPattern;
  const customTestDelimiter = config.customTestDelimiter;
  const customTestListPrefix = config.customTestListPrefix
    ? config.customTestListPrefix
    : "";
  const customTestListSuffix = config.customTestListSuffix
    ? config.customTestListSuffix
    : "";

  LOGGER.debug(`Using the following test pattern: '${customTestPattern}'`);

  if (!customTestPattern || !customTestDelimiter) {
    throw Error(
      "To convert the tests to run for a custom framework, the --testPattern and --testDelimiter parameters are mandatory.",
    );
  }

  let convertedTestsToRun = testsToRun
    .map((testToRun) =>
      replaceCustomFrameworkPlaceholders(customTestPattern, testToRun),
    )
    .join(customTestDelimiter);

  convertedTestsToRun = `${customTestListPrefix}${convertedTestsToRun}${customTestListSuffix}`;

  LOGGER.debug(
    `Successfully converted the tests to run: ${convertedTestsToRun}`,
  );

  return convertedTestsToRun;
};

const replaceCustomFrameworkPlaceholders = (
  pattern: string,
  testToRun: Test,
): string => {
  return pattern
    .replace(CUSTOM_FRAMEWORK_PACKAGE_PLACEHOLDER, testToRun.packageName)
    .replace(CUSTOM_FRAMEWORK_CLASS_PLACEHOLDER, testToRun.className)
    .replace(CUSTOM_FRAMEWORK_TEST_PLACEHOLDER, testToRun.testName);
};

export default convertTestsToRun;
