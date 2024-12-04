## 1. Introduction 🚀

This is a command-line tool desinged to convert a list of test details received from **OpenText Core Software Delivery Platform** to a format accepted by common frameworks. The tool allows defining custom conversion flow for other frameworks that are not supported by default.

---

## 2. Table of Contents

- [1. Introduction](#1-introduction)
- [2. Table of Contents](#2-table-of-contents)
- [3. Description](#3-description)
  - [3.1. Supported Frameworks](#31-supported-frameworks)
- [4. Getting Started](#4-getting-started)
  - [4.1. Running the tool](#41-running-the-tool)
    - [4.1.1. Run using NPX](#411-run-using-npx)
    - [4.1.2. Parameters](#412-parameters)
    - [4.2. Running within GitHub Actions](#42-running-the-tool-with-github-actions)
- [5. Custom Framework](#5-custom-framework)
  - [5.1. Structure of the customFramework JSON](#51-structure-of-the-customFramework-json)
  - [5.2. Simple Example](#52-simple-example)
  - [5.3. Optional Keys](#53-optional-keys)
  - [5.4. Complex Example](#54-complex-example)

---

## 3. Description

### 3.1. Supported Frameworks

The tool supports the following test frameworks out-of-the-box, as well as custom configurations for unsupported frameworks:

- Cucumber
- Cucumber with BDD Scenario
- JUnit
- Maven Surefire
- TestNG
- Custom (define your custom framework configuration - [see more](#5-custom-framework))

---

## 4. Getting Started

### 4.1. Running the tool

#### 4.1.1. Run using NPX

The tool have been released as a NPX command: [@opentext/tests-to-run-conversion-tool](https://www.npmjs.com/package/@opentext/tests-to-run-conversion-tool)

Run the following command to convert the value of the `--testsToRun` parameter received from **OpenText Core Software Delivery Platform** to a format specified by the `--framework` parameter.

```bash
npx @opentext/tests-to-run-conversion-tool --framework="<framework_name>" --testsToRun="<test_definitions>" [--customFramework="<json_format_rules>"]
```

#### 4.1.2. Parameters

1. `--testsToRun` - a list of automated tests to run, usualy received from **OpenText Core Software Delivery Platform**.
2. `--framework` - the framework to which the `--testsToRun` parameter will be converted. Available options are:
   - JUnit: `junit`
   - Maven Surefire: `mvnSurefire`
   - TestNG: `testNG`
   - Cucumber: `cucumber`
   - Cucumber - BDD scenario: `bddScenario`
   - Custom framework: `custom`
3. `--customFramework` _(optional)_ - a JSON object serialized to string which contains the format rules used for conversion. To configure a custom framework see the section [5. Custom Framework](#5-custom-framework).
4. `--logLevel` _(optional)_ - the level to log at. The available options are:
   - `0` - Disabled
   - `1` - Debug
   - `2` - Trace
   - `3` - Info
   - `4` - Warn
   - `5` - Error

> [!CAUTION]
> The `logLevel` parameter should only be used while debugging. Remove or set it to `0` if you're not debugging this tool.

### 4.2. Running the tool with GitHub Actions

This example workflow demonstrates how to integrate a test conversion tool (`@opentext/tests-to-run-conversion-tool`) into a GitHub Actions pipeline to determine and execute specific tests dynamically. In the following example, the workflow will run some automated tests using the **Maven Surefire** framework.

#### Workflow Overview

1. **Convert `testsToRun` Parameter**:

   - Use the tool as an NPX command to process the `testsToRun` input.
   - The tool outputs a list of test identifiers.
   - The output is stored in an environment variable for later use.

2. **Set Up Java**:

   - Use the `setup-java` action to prepare the environment with JDK 21.

3. **Run Tests**:
   - Use Maven to run the tests specified by the conversion tool output.

#### Workflow Configuration

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Checkout code
      - name: Checkout code
        uses: actions/checkout@v4

      # Step 1: Convert testsToRun parameter
      - name: Convert testsToRun parameter
        id: convert_tests
        run: |
          # Run the npx command and capture its output
          output=$(npx @opentext/tests-to-run-conversion-tool --framework="junit" --testsToRun="${{ github.event.inputs.testsToRun }}" --logLevel=0)

          # Save the output to an environment variable
          echo "converted_tests=$output" >> $GITHUB_ENV
          echo "::set-output name=converted_tests::$output"

      # Step 2: Set up Java environment
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "21"

      # Step 3: Run the tests
      - name: Run JUnit Tests
        run: mvn test -Dtest=${{ steps.convert_tests.outputs.converted_tests }}
```

---

## 5. Custom Framework

If your framework isn't supported by default, you can define a custom configuration. Use the `--customFramework` parameter in the command call to provide the configuration, specifying a pattern to convert the `testsToRun` value into the required format for your framework.

### 5.1. Structure of the `customFramework` JSON

To configure a custom framework, you'll need to provide a JSON object with specific keys. At a minimum, the following two keys are required:

- `testPattern`: Defines the structure of the tests based on Package, Class name, and Test name.
- `testDelimiter`: A character or string that separates tests in the testsToRun parameter.

In the custom configuration, you can define a pattern using the following placeholders:

- `$package`: Represents the package name of the test.
- `$class`: Represents the class name of the test.
- `$testName`: Represents the name of the individual test.

### 5.2. Simple Example

For example, if you want to generate a JUnit report structured like this:

```bash
"com.example:Calculator#addTwoNumbers, com.example:Calculator#subtractTwoNumbers"
```

You would define your custom framework JSON like this:

```json
{
  "testPattern": "$package:$class#$testName",
  "testDelimiter": ", "
}
```

### 5.3. Optional Keys

You can also include the following optional keys:

- `prefix` and `suffix`: Strings that will be added at the beginning and end of the test names.

- `replacements`: An array of replacement objects that modify string values for **package**, **class name**, and **test name**.

#### Replacement Types

The replacement objects can be of various types:

1. `replaceString`: Replaces every occurrence of a specified string.

```json
{
  "type": "replaceString",
  "target": "$class",
  "string": "<stringToReplace>",
  "replacement": "<replacementString>"
}
```

2. `replaceRegex`: Replaces every occurrence of a regex pattern.

```json
{
  "type": "replaceRegex",
  "target": "$class",
  "regex": "<regexToReplace>",
  "replacement": "<replacementString>"
}
```

3. `replaceRegexFirst`: Replaces only the first occurrence of a regex pattern.

```json
{
  "type": "replaceRegexFirst",
  "target": "$class",
  "regex": "<regexToReplace>",
  "replacement": "<replacementString>"
}
```

4. `notLatinAndDigitToOctal`: Converts non-latin or digit characters to octal representation.

```json
{
  "type": "notLatinAndDigitToOctal",
  "target": "$class"
}
```

5. `joinString`: Adds a prefix and/or suffix to the target.

```json
{
  "type": "joinString",
  "target": "$class",
  "suffix": "<suffixToAdd>",
  "prefix": "<prefixToAdd>"
}
```

6. `toUpperCase` and `toLowerCase`: Converts the target to upper or lower case, respectively.

```json
{
  "type": "toUpperCase",
  "target": "$class"
}
```

7. `allowDuplication`: A boolean value (default is true) that allows or disallows duplicate values in the testsToRun parameter.

```json
{
  "allowDuplication": true
}
```

### 5.4. Complex Example

Using the same JUnit report structure, if you need to adjust the format of the class name and include additional transformations:

```json
{
  "testPattern": "$package:$class#$testName",
  "testDelimiter": ", ",
  "replacements": [
    {
      "type": "replaceString",
      "target": "$class",
      "string": ".",
      "replacement": "\\"
    },
    {
      "type": "replaceRegex",
      "target": "$class",
      "regex": "(\\b\\\\\\b)(?!.*\\1)",
      "replacement": ".mytest:"
    }
  ]
}
```

> [!NOTE]
> When specifying escape characters in the JSON, ensure that each escape character is doubled (e.g., \\\\ instead of \\).
