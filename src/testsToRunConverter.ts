/*
 * Copyright 2016-2025 Open Text.
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

import { js2xml } from "xml-js";
import parseCustomFramework from "./customFrameworkParser";
import Framework from "./dto/Framework";
import Replacement from "./dto/Replacement";
import Test from "./dto/Test";
import Logger from "./utils/logger";
import UftTestParameter from "./dto/uft/UftTestParameter";
import ExternalDataTable from "./dto/uft/ExternalDataTable";
import ConvertedUftTest from "./dto/uft/ConvertedUftTests";

const LOGGER: Logger = new Logger("testsToRunConverter.ts");

const CUSTOM_FRAMEWORK_PACKAGE_PLACEHOLDER = "$package";
const CUSTOM_FRAMEWORK_CLASS_PLACEHOLDER = "$class";
const CUSTOM_FRAMEWORK_TEST_PLACEHOLDER = "$testName";

const convertTestsToRun = (
  testsToRun: Test[],
  framework: string,
  rootDirectory: string,
  customFramework?: string,
): string => {
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
    case Framework.UFT:
      return convertUftTestsToRun(testsToRun, rootDirectory);
    case Framework.Custom:
      if (!customFramework) {
        throw new Error(
          "Missing 'customFramework' argument for converting custom framework.",
        );
      }
      return convertCustomTestsToRun(testsToRun, customFramework);
    default:
      throw Error(
        `Unsupported framework: '${framework}'. See the list of available parameters at https://github.com/MicroFocus/sdp-sdm-tests-to-run-conversion?tab=readme-ov-file#412-parameters.`,
      );
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

const convertUftTestsToRun = (
  testsToRun: Test[],
  rootDirectory: string,
): string => {
  LOGGER.info(`Converting testsToRun to UFT One format...`);

  const uftTestsToRun = testsToRun.map((testToRun) => {
    let parameters: UftTestParameter[] = [];
    let externalDataTable: ExternalDataTable | undefined;
    if (testToRun.parameters) {
      Object.entries(testToRun.parameters).forEach(([key, value]) => {
        if (key === "dataTable") {
          value = value.replace(/\//g, "\\");
          externalDataTable = {
            _attributes: {
              path: rootDirectory + "\\" + value,
            },
          };
        } else {
          parameters.push({
            _attributes: {
              name: key,
              value: value,
              type: "string",
            },
          });
        }
      });
    }

    const convertedTests: ConvertedUftTest = {
      _attributes: {
        name: testToRun.testName,
        path: rootDirectory + "\\" + testToRun.className.replace(/\//g, "\\"),
      },
      parameter: parameters,
    };
    if (externalDataTable) {
      convertedTests.DataTable = externalDataTable;
    }
    return convertedTests;
  });

  const convertedTestsToRun = js2xml(
    {
      mtbx: {
        test: uftTestsToRun,
      },
    },
    { compact: true },
  );

  LOGGER.debug(
    `Successfully converted the tests to run: ${convertedTestsToRun}`,
  );

  return convertedTestsToRun;
};

const convertCustomTestsToRun = (
  testsToRun: Test[],
  customFramework: string,
): string => {
  LOGGER.info(`Converting testsToRun to a custom format...`);

  if (!customFramework) {
    throw new Error(
      `Missing 'customFramework' argument for converting custom framework.`,
    );
  }
  const frameworkConfig = parseCustomFramework(customFramework);
  const customTestPattern = frameworkConfig.testPattern;
  const customTestDelimiter = frameworkConfig.testDelimiter;
  const customTestListPrefix = frameworkConfig.prefix || "";
  const customTestListSuffix = frameworkConfig.suffix || "";

  LOGGER.debug(`Using the following test pattern: '${customTestPattern}'`);

  if (!customTestPattern || !customTestDelimiter) {
    throw Error(
      "To convert the tests to run for a custom framework, the testPattern and testDelimiter parameters are mandatory.",
    );
  }

  const allowedTestsToRun = frameworkConfig.allowDuplication
    ? testsToRun
    : Array.from(new Set(testsToRun.map((test) => JSON.stringify(test)))).map(
        (test) => JSON.parse(test),
      );

  let convertedTestsToRun = allowedTestsToRun
    .map((testToRun) =>
      replaceCustomFrameworkPlaceholders(
        customTestPattern,
        testToRun,
        frameworkConfig.replacements,
      ),
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
  replacements?: Replacement[],
): string => {
  const packageName = applyReplacements(
    testToRun.packageName,
    replacements,
    "$package",
  );
  const className = applyReplacements(
    testToRun.className,
    replacements,
    "$class",
  );
  const testName = applyReplacements(
    testToRun.testName,
    replacements,
    "$testName",
  );

  let result = pattern
    .replace(CUSTOM_FRAMEWORK_PACKAGE_PLACEHOLDER, packageName)
    .replace(CUSTOM_FRAMEWORK_CLASS_PLACEHOLDER, className)
    .replace(CUSTOM_FRAMEWORK_TEST_PLACEHOLDER, testName);

  return result;
};

const applyReplacements = (
  input: string,
  replacements: Replacement[] | undefined,
  target: string,
): string => {
  if (!replacements) return input;

  return replacements.reduce((modifiedInput, replacement) => {
    if (replacement.target !== target) return modifiedInput;

    switch (replacement.type) {
      case "replaceString":
        return modifiedInput.replace(
          new RegExp(replacement.string!, "g"),
          replacement.replacement!,
        );
      case "replaceRegex":
        return modifiedInput.replace(
          new RegExp(replacement.regex!, "g"),
          replacement.replacement!,
        );
      case "replaceRegexFirst":
        return modifiedInput.replace(
          new RegExp(replacement.regex!),
          replacement.replacement!,
        );
      case "notLatinAndDigitToOctal":
        return modifiedInput.replace(
          /[^a-zA-Z0-9]/g,
          (char) => `\\${char.charCodeAt(0).toString(8)}`,
        );
      case "joinString":
        return `${replacement.prefix || ""}${modifiedInput}${replacement.suffix || ""}`;
      case "toUpperCase":
        return modifiedInput.toUpperCase();
      case "toLowerCase":
        return modifiedInput.toLowerCase();
      default:
        return modifiedInput;
    }
  }, input);
};

export default convertTestsToRun;
