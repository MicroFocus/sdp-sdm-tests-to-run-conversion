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

import Test from "./dto/Test";
import Logger from "./utils/logger";

const LOGGER: Logger = new Logger("testsToRunParser.ts");

const parseTestsToRun = (testsToRun: string): Test[] => {
  let TEST_PARTS_MINIMAL_SIZE = 3;
  let PARAMETER_SIZE = 2;

  testsToRun = testsToRun.slice(testsToRun.indexOf(":") + 1);

  if (testsToRun) {
    const testsList = testsToRun.split(";");
    let parsedTestsToRun = new Array<Test>();

    testsList?.forEach((testToRun) => {
      const testSplit = testToRun.split("|");
      if (testSplit.length < TEST_PARTS_MINIMAL_SIZE) {
        throw Error(
          `Test '${testToRun}' does not contains all required components.`,
        );
      }

      const testToRunData: Test = {
        packageName: testSplit[0],
        className: testSplit[1],
        testName: testSplit[2],
      };

      if (testSplit.length > TEST_PARTS_MINIMAL_SIZE) {
        testToRunData.parameters = {};

        for (let i = TEST_PARTS_MINIMAL_SIZE; i < testSplit.length; i++) {
          let paramSplit = testSplit[i].split("=");
          if (paramSplit.length != PARAMETER_SIZE) {
            throw Error(
              `Expected ${PARAMETER_SIZE} parameters but only found ${paramSplit.length}`,
            );
          } else {
            testToRunData.parameters[paramSplit[0]] = paramSplit[1];
          }
        }
      }

      LOGGER.debug(`Found test to run: ${JSON.stringify(testToRunData)}`);

      parsedTestsToRun.push(testToRunData);
    });

    return parsedTestsToRun;
  }

  return [];
};

export default parseTestsToRun;
