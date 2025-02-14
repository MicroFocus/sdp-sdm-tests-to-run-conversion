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

import CustomFramework from "./dto/CustomFramework";
import Replacement from "./dto/Replacement";

/**
 * Parses a JSON string for custom test framework configuration, extracting settings for
 * test formatting, delimiters, optional prefixes/suffixes, and transformation rules.
 *
 * @param configString - JSON string representing framework configuration.
 * @returns `CustomFrameworkConfig` - Parsed configuration object.
 * @throws `Error` - If JSON parsing fails or required fields are missing.
 */
const parseCustomFramework = (configString: string): CustomFramework => {
  let parsedConfig;

  try {
    parsedConfig = JSON.parse(configString);
  } catch (error) {
    throw new Error(
      "Invalid JSON format: Unable to parse custom framework configuration string.",
    );
  }

  const customFrameworkConfig: CustomFramework = {
    testPattern: parseRequiredField(parsedConfig, "testPattern"),
    testDelimiter: parseRequiredField(parsedConfig, "testDelimiter"),
    ...parseOptionalFields(parsedConfig),
    replacements: parseReplacements(parsedConfig.replacements),
  };

  return customFrameworkConfig;
};

const parseReplacements = (replacements: any): Replacement[] | undefined => {
  if (!Array.isArray(replacements)) return undefined;
  return replacements.map(parseReplacement);
};

const parseReplacement = (replacement: any): Replacement => {
  if (
    typeof replacement.type !== "string" ||
    typeof replacement.target !== "string"
  ) {
    throw new Error(
      "Invalid replacement object in custom framework configuration.",
    );
  }

  const parsedReplacement: Replacement = {
    type: replacement.type,
    target: replacement.target,
  };

  if (
    replacement.type === "replaceString" ||
    replacement.type === "replaceRegex" ||
    replacement.type === "replaceRegexFirst"
  ) {
    if (typeof replacement.string === "string")
      parsedReplacement.string = replacement.string;
    if (typeof replacement.replacement === "string")
      parsedReplacement.replacement = replacement.replacement;
    if (
      replacement.type !== "replaceString" &&
      typeof replacement.regex === "string"
    ) {
      parsedReplacement.regex = replacement.regex;
    }
  }

  if (replacement.type === "joinString") {
    if (typeof replacement.suffix === "string")
      parsedReplacement.suffix = replacement.suffix;
    if (typeof replacement.prefix === "string")
      parsedReplacement.prefix = replacement.prefix;
  }

  return parsedReplacement;
};

const parseRequiredField = (config: any, fieldName: string): string => {
  if (typeof config[fieldName] !== "string" || !config[fieldName]) {
    throw new Error(
      `Invalid or missing '${fieldName}' in custom framework configuration.`,
    );
  }
  return config[fieldName];
};

const parseOptionalFields = (config: any): Partial<CustomFramework> => {
  return {
    prefix: config.prefix || "",
    suffix: config.suffix || "",
    allowDuplication: config.allowDuplication !== false,
  };
};

export default parseCustomFramework;
