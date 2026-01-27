import AutomatedTest from "../dto/uft/AutomatedTest";
import * as path from "node:path";
import {
  convertToHtml,
  getAPITestDoc,
  getDescriptionForAPITest,
  getDescriptionForGUITest,
  getGUITestDoc,
} from "../utils/utils";

const ROOT_TESTS_DIR = process.env.BUILD_SOURCESDIRECTORY || "";

const createAutomatedTestsFromGUI = async (
  pathToTest: string,
  testType: string,
): Promise<AutomatedTest> => {
  const test = await createTest(pathToTest, testType);
  const document = await getGUITestDoc(pathToTest);
  let description: string | null;
  description = getDescriptionForGUITest(document);
  description = convertToHtml(description);
  test.description = description || "";

  return test;
};

const createAutomatedTestFromAPI = async (
  pathToTest: string,
  testType: string,
): Promise<AutomatedTest> => {
  const test = await createTest(pathToTest, testType);
  const documentForApiTest = await getAPITestDoc(pathToTest);
  let description = getDescriptionForAPITest(documentForApiTest);
  description = convertToHtml(description);
  test.description = description || "";

  return test;
};

const createTest = async (pathToTest: string, testType: string) => {
  const testName = path.basename(pathToTest);
  const className = getClassName(pathToTest);
  const packageName = getPackageName(className);

  const test: AutomatedTest = {
    name: testName,
    packageName: packageName,
    className: className,
    uftOneTestType: testType,
    isExecutable: true,
  };

  return test;
};

const getClassName = (pathToTest: string): string => {
  let className: string;

  className = path.relative(ROOT_TESTS_DIR, pathToTest);
  const parts = className.split(path.sep);
  className = parts.join("/");
  return className;
};

const getPackageName = (className: string): string => {
  let packageName: string;

  const parts = className.split("/");
  parts.pop();
  packageName = parts.join("/");

  return packageName;
};

export { createAutomatedTestsFromGUI, createAutomatedTestFromAPI };
