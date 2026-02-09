#!/usr/bin/env node

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

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Logger from "./utils/logger";
import { getConfig, initConfig } from "./config/config";
import Arguments from "./utils/arguments";
import Discovery from "./discovery/Discovery";
import tl = require("azure-pipelines-task-lib");
import { verifyPath } from "./utils/utils";
import { convertTests } from "./index";

const LOGGER: Logger = new Logger("main.ts");

let args: Arguments;

const main = async () => {
  try {
    loadArguments();
    initConfig(args);

    const actionType = args.action;
    const isFullScan = args.isFullScan;
    const path = args.path;
    const octaneUrl = args.octaneUrl;
    const sharedSpace = args.sharedSpace;
    const workspace = args.workspace;
    const clientId = args.clientId;
    const clientSecret = args.clientSecret;

    if (!actionType) {
      tl.setResult(
        tl.TaskResult.Failed,
        "You have to specify an action to execute: convertTests or discoverTests.",
      );
    }

    if (actionType === "convertTests") {
      const framework = getConfig().framework;
      const rootDirectory = process.env.BUILD_SOURCESDIRECTORY || "";
      const convertedTests = convertTests(
        args.testsToRun,
        framework,
        rootDirectory,
      );
      if (convertedTests) {
        tl.setVariable("testsToRunConverted", convertedTests);
      }
    } else if (actionType === "discoverTests") {
      LOGGER.info("The path is: " + path);
      await verifyPath(path);
      if (
        !path &&
        !isFullScan &&
        !octaneUrl &&
        !sharedSpace &&
        !workspace &&
        !clientId &&
        !clientSecret
      ) {
        tl.setResult(
          tl.TaskResult.Failed,
          "You have to specify all Octane connection parameters, the path to the repository to discover UFT tests from and whether full scan or sync is required.",
        );
        return;
      }
      await discoverTests(
        path,
        isFullScan,
        octaneUrl,
        sharedSpace,
        workspace,
        clientId,
        clientSecret,
      );
    }
  } catch (error) {
    tl.setResult(tl.TaskResult.Failed, (error as Error).message);
  }
};

const discoverTests = async (
  path: string,
  isFullScan: boolean,
  octaneUrl: string,
  sharedSpace: string,
  workspace: string,
  clientId: string,
  clientSecret: string,
) => {
  const discovery = new Discovery(
    isFullScan,
    octaneUrl,
    sharedSpace,
    workspace,
    clientId,
    clientSecret,
  );
  await discovery.startDiscovery(path);
};

const loadArguments = () => {
  args = yargs(hideBin(process.argv))
    .option("framework", {
      type: "string",
      demandOption: false,
      describe: "Specify the framework",
    })
    .option("testsToRun", {
      type: "string",
      demandOption: false,
      describe: "Specify the tests to run",
    })
    .option("customFramework", {
      type: "string",
      default: "",
      describe: "JSON object containing the format rules used for conversion",
    })
    .option("logLevel", {
      type: "number",
      default: 0,
      describe: "Set the log level (1-5)",
    })
    .option("action", {
      type: "string",
      demandOption: true,
      default: "convertTests",
      describe:
        "Specify the action you want to execute, convertTests or discoverTests",
    })
    .option("isFullScan", {
      type: "boolean",
      demandOption: false,
      describe: "Specify whether full scan or sync is required",
    })
    .option("path", {
      type: "string",
      default: "Specify the path to the repository to discover UFT tests from",
    })
    .option("octaneUrl", {
      type: "string",
      default: "",
      describe: "Specify the Octane server URL",
    })
    .option("sharedSpace", {
      type: "string",
      default: "",
      describe: "Specify the Octane shared space id",
    })
    .option("workspace", {
      type: "string",
      default: "",
      describe: "Specify the Octane workspace id",
    })
    .option("clientId", {
      type: "string",
      default: "",
      describe: "Specify the Octane client id",
    })
    .option("clientSecret", {
      type: "string",
      default: "",
      describe: "Specify the Octane client secret",
    })
    .parseSync() as Arguments;
};

main();
