import { initConfig } from "../src/config/config";
import convertTestsToRun from "../src/testsToRunConverter";
import parseTestsToRun from "../src/testsToRunParser";
import Arguments from "../src/utils/arguments";

describe("Conversion Tests", () => {
  it("Test JUnit/Maven Surefire/TestNG conversion with multiple tests in same class", () => {
    const expectedResult =
      "com.example.app.CalculatorTest#testAdd_whenPositiveNumbers+testAdd_whenNegativeNumbers+testSub_whenPositiveNumbers";
    const testsToRun =
      "v1:com.example.app|CalculatorTest|testAdd_whenPositiveNumbers;com.example.app|CalculatorTest|testAdd_whenNegativeNumbers;com.example.app|CalculatorTest|testSub_whenPositiveNumbers";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "junit",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test JUnit/Maven Surefire/TestNG conversion with multiple tests in multiple classes", () => {
    const expectedResult =
      "com.example.app.CalculatorTest#testAdd_whenPositiveNumbers+testAdd_whenNegativeNumbers+testSub_whenPositiveNumbers,com.example.app.BooleanCalculatorTest#testOr_whenOneTrue+testAnd_whenBothTrue";
    const testsToRun =
      "v1:com.example.app|CalculatorTest|testAdd_whenPositiveNumbers;com.example.app|CalculatorTest|testAdd_whenNegativeNumbers;com.example.app|CalculatorTest|testSub_whenPositiveNumbers;com.example.app|BooleanCalculatorTest|testOr_whenOneTrue;com.example.app|BooleanCalculatorTest|testAnd_whenBothTrue";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "junit",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test Cucumber conversion with multiple tests in same class", () => {
    const expectedResult =
      '\\"src\\test\\resources\\features\\calculator.feature\\"';
    const testsToRun =
      "v1:||Test Add with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Add with Negative Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Sub with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "cucumber",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test Cucumber conversion with multiple tests in multiple classes", () => {
    const expectedResult =
      '\\"src\\test\\resources\\features\\calculator.feature\\" \\"src\\test\\resources\\features\\boolean_calculator.feature\\"';
    const testsToRun =
      "v1:||Test Add with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Add with Negative Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Sub with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Or with One True|featureFilePath=src\\test\\resources\\features\\boolean_calculator.feature;||Test Or with Both False|featureFilePath=src\\test\\resources\\features\\boolean_calculator.feature";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "cucumber",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test Cucumber BDD Scenario conversion with multiple tests in same class", () => {
    const expectedResult =
      "'src\\test\\resources\\features\\calculator.feature' --name '^Test Add with Positive Numbers$' --name '^Test Add with Negative Numbers$' --name '^Test Sub with Positive Numbers$'";
    const testsToRun =
      "v1:||Test Add with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Add with Negative Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Sub with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "bddScenario",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test Cucumber BDD Scenario conversion with multiple tests in multiple classes", () => {
    const expectedResult =
      "'src\\test\\resources\\features\\calculator.feature' 'src\\test\\resources\\features\\boolean_calculator.feature' --name '^Test Add with Positive Numbers$' --name '^Test Add with Negative Numbers$' --name '^Test Sub with Positive Numbers$' --name '^Test Or with One True$' --name '^Test Or with Both False$'";
    const testsToRun =
      "v1:||Test Add with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Add with Negative Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Sub with Positive Numbers|featureFilePath=src\\test\\resources\\features\\calculator.feature;||Test Or with One True|featureFilePath=src\\test\\resources\\features\\boolean_calculator.feature;||Test Or with Both False|featureFilePath=src\\test\\resources\\features\\boolean_calculator.feature";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "bddScenario",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Converts single test with custom format, prefix, suffix, and replacements", () => {
    const expectedResult =
      "start:test:com.example.app.calculatortest_renamedNUMand123.java.mytest#TESTADD\\137WHENPOSITIVENUMBERS:end";
    const testsToRun =
      "v1:com.example.app|CalculatorTest234and123.java.java|testAdd_whenPositiveNumbers";

    const customFramework = JSON.stringify({
      testPattern: "$package.$class#$testName",
      testDelimiter: ";",
      prefix: "start:",
      suffix: ":end",
      replacements: [
        {
          type: "replaceString",
          target: "$class",
          string: "CalculatorTest",
          replacement: "CalculatorTest_RENAMED",
        },
        {
          type: "replaceRegex",
          target: "$class",
          regex: ".java$",
          replacement: ".mytest",
        },
        {
          type: "toUpperCase",
          target: "$testName",
        },
        {
          type: "toLowerCase",
          target: "$class",
        },
        {
          type: "joinString",
          target: "$package",
          suffix: "",
          prefix: "test:",
        },
        {
          type: "notLatinAndDigitToOctal",
          target: "$testName",
        },
        {
          type: "replaceRegexFirst",
          target: "$class",
          regex: "[0-9]+",
          replacement: "NUM",
        },
      ],
      allowDuplication: true,
    });

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "custom",
      customFramework: customFramework,
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Converts multiple tests with custom format, prefix, suffix, and replacements", () => {
    const expectedResult =
      "start:com.example.app.CalculatorTest_RENAMED#TESTADD_WHENPOSITIVENUMBERS;com.example.app.CalculatorTest_RENAMED#TESTADD_WHENNEGATIVENUMBERS;com.example.app.CalculatorTest_RENAMED#TESTSUB_WHENPOSITIVENUMBERS;com.example.app.BooleanCalculatorTest_RENAMED#TESTOR_WHENONETRUE;com.example.app.BooleanCalculatorTest_RENAMED#TESTAND_WHENBOTHTRUE:end";
    const testsToRun =
      "v1:com.example.app|CalculatorTest|testAdd_whenPositiveNumbers;com.example.app|CalculatorTest|testAdd_whenNegativeNumbers;com.example.app|CalculatorTest|testSub_whenPositiveNumbers;com.example.app|BooleanCalculatorTest|testOr_whenOneTrue;com.example.app|BooleanCalculatorTest|testAnd_whenBothTrue";

    const customFramework = JSON.stringify({
      testPattern: "$package.$class#$testName",
      testDelimiter: ";",
      prefix: "start:",
      suffix: ":end",
      replacements: [
        {
          type: "replaceString",
          target: "$class",
          string: "CalculatorTest",
          replacement: "CalculatorTest_RENAMED",
        },
        {
          type: "toUpperCase",
          target: "$testName",
        },
      ],
      allowDuplication: true,
    });

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "custom",
      customFramework: customFramework,
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test UFT One conversion with single test", () => {
    const expectedResult =
      '<mtbx><test name="GUITest06" path="C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests/GUITests/f1/GUITest06"><parameter name="runId" value="5073" type="string"/></test></mtbx>';
    const testsToRun =
      "v1:FTToolsLauncher|file:///C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests/GUITests/f1|GUITest06|runId=5073";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "uft",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test UFT One conversion with multiple tests", () => {
    const expectedResult =
      '<mtbx><test name="GUITest06" path="C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests/GUITests/f1/GUITest06"><parameter name="runId" value="5073" type="string"/></test><test name="GUITest1" path="C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests/GUITest1"><parameter name="runId" value="5074" type="string"/></test></mtbx>';
    const testsToRun =
      "v1:FTToolsLauncher|file:///C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests/GUITests/f1|GUITest06|runId=5073;FTToolsLauncher|file:///C:/dev/actions-runner/_work/alm-octane-github-actions-tests/alm-octane-github-actions-tests|GUITest1|runId=5074";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "uft",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });
});
