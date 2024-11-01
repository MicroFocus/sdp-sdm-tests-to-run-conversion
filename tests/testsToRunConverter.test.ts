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

  it("Test custom conversion with single test", () => {
    const expectedResult =
      "start:com.example.app.CalculatorTest#testAdd_whenPositiveNumbers:end";
    const testsToRun =
      "v1:com.example.app|CalculatorTest|testAdd_whenPositiveNumbers";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "custom",
      customTestPattern: "%packageName%.%className%#%testName%",
      customTestDelimiter: ";",
      customTestListPrefix: "start:",
      customTestListSuffix: ":end",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });

  it("Test custom conversion with multiple tests", () => {
    const expectedResult =
      "start:com.example.app.CalculatorTest#testAdd_whenPositiveNumbers;com.example.app.CalculatorTest#testAdd_whenNegativeNumbers;com.example.app.CalculatorTest#testSub_whenPositiveNumbers;com.example.app.BooleanCalculatorTest#testOr_whenOneTrue;com.example.app.BooleanCalculatorTest#testAnd_whenBothTrue:end";
    const testsToRun =
      "v1:com.example.app|CalculatorTest|testAdd_whenPositiveNumbers;com.example.app|CalculatorTest|testAdd_whenNegativeNumbers;com.example.app|CalculatorTest|testSub_whenPositiveNumbers;com.example.app|BooleanCalculatorTest|testOr_whenOneTrue;com.example.app|BooleanCalculatorTest|testAnd_whenBothTrue";

    const args: Arguments = {
      testsToRun: testsToRun,
      logLevel: 1,
      framework: "custom",
      customTestPattern: "%packageName%.%className%#%testName%",
      customTestDelimiter: ";",
      customTestListPrefix: "start:",
      customTestListSuffix: ":end",
    };
    initConfig(args);

    const parsedTestsToRun = parseTestsToRun(testsToRun);
    const actualResult = convertTestsToRun(parsedTestsToRun);

    expect(actualResult).toBe(expectedResult);
  });
});
