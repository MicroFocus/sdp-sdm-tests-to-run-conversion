import AutomatedTest from "../dto/uft/AutomatedTest";
import Logger from "../utils/logger";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";

const LOGGER = new Logger("ChangeDetector.ts");

const detectTestChanges = async (
  discoveredTests: AutomatedTest[],
  existingTests: AutomatedTest[],
  addedTests: AutomatedTest[],
  modifiedTests: { oldValue: AutomatedTest; newValue: AutomatedTest }[],
  deletedTests: AutomatedTest[],
): Promise<AutomatedTest[]> => {
  const changedTests: AutomatedTest[] = [];

  for (const addedTest of addedTests) {
    let isExecutable = true;
    let testId;

    const testExists = existingTests.some((test) => {
      if (
        test.name === addedTest.name &&
        test.className === addedTest.className &&
        (test.packageName === addedTest.packageName ||
          test.packageName === null ||
          test.packageName === "")
      ) {
        if (!test.isExecutable) {
          isExecutable = false;
          testId = test.id;
        }
        return true;
      }
      return false;
    });

    if (testExists) {
      if (isExecutable) {
        LOGGER.info(
          "The added test already exists in Octane: " +
            JSON.stringify(addedTest) +
            ". With the id: " +
            testId,
        );
      } else {
        LOGGER.info(
          "The added test: " +
            JSON.stringify(addedTest) +
            " already exists in Octane but is not executable. Making it executable. With the id: " +
            testId,
        );
        changedTests.push({
          ...addedTest,
          changeType: "modified",
          id: testId,
          isExecutable: true,
        });
      }
    } else {
      changedTests.push({ ...addedTest, changeType: "added" });
    }
  }

  for (const test of deletedTests) {
    let testId;
    const foundTest = existingTests.some((testE) => {
      if (
        testE.name === test.name &&
        testE.className === test.className &&
        (testE.packageName === test.packageName ||
          testE.packageName === null ||
          testE.packageName === "")
      ) {
        testId = testE.id;
        return true;
      }
      return false;
    });

    if (foundTest) {
      changedTests.push({ ...test, changeType: "deleted", id: testId });
    } else {
      LOGGER.warn(
        "Could not find the existing test to delete: " + JSON.stringify(test),
      );
    }
  }

  for (const pair of modifiedTests) {
    let testId;
    const foundTest = existingTests.some((testE) => {
      if (
        testE.name === pair.oldValue.name &&
        testE.className === pair.oldValue.className &&
        (testE.packageName === pair.oldValue.packageName ||
          testE.packageName === null ||
          testE.packageName === "")
      ) {
        testId = testE.id;
        return true;
      }
      return false;
    });

    if (foundTest) {
      changedTests.push({
        ...pair.newValue,
        changeType: "modified",
        id: testId,
        isExecutable: true,
      });
    } else {
      LOGGER.warn(
        `Could not find the existing test for modification: ${pair.oldValue.name}. Adding it as new test.`,
      );
      changedTests.push({ ...pair.newValue, changeType: "added" });
    }
  }

  for (const test of discoveredTests) {
    const existsInAdded = addedTests.some(
      (addedTest: AutomatedTest) =>
        addedTest.name === test.name &&
        addedTest.className === test.className &&
        addedTest.packageName === test.packageName,
    );

    if (existsInAdded) {
      continue;
    }

    const existsInModified = modifiedTests.some(
      (pair: { oldValue: AutomatedTest; newValue: AutomatedTest }) =>
        (pair.oldValue.name === test.name &&
          pair.oldValue.className === test.className &&
          pair.oldValue.packageName === test.packageName) ||
        (pair.newValue.name === test.name &&
          pair.newValue.className === test.className &&
          pair.newValue.packageName === test.packageName),
    );

    if (existsInModified) {
      continue;
    }

    const foundTest = existingTests.find(
      (testE) =>
        testE.name === test.name &&
        testE.className === test.className &&
        (testE.packageName === test.packageName ||
          testE.packageName === null ||
          testE.packageName === ""),
    );

    if (foundTest) {
      if (!foundTest.isExecutable) {
        LOGGER.info(
          "The discovered test: " +
            JSON.stringify(test) +
            " already exists in Octane but is not executable. Making it executable. With the id: " +
            foundTest.id,
        );
        changedTests.push({
          ...test,
          changeType: "modified",
          id: foundTest.id,
          isExecutable: true,
        });
      } else {
        LOGGER.info(
          "The test already exists in Octane: " +
            JSON.stringify(foundTest) +
            " with id: " +
            foundTest.id,
        );
      }
      continue;
    }

    changedTests.push({ ...test, changeType: "added" });
  }
  LOGGER.debug("The changed tests are: " + JSON.stringify(changedTests));
  return changedTests;
};

const detectDataTableChanges = async (
  addedDataTables: ScmResourceFile[],
  deletedDataTables: ScmResourceFile[],
  modifiedDataTables: {
    oldValue: ScmResourceFile;
    newValue: ScmResourceFile;
  }[],
  discoveredDataTables: ScmResourceFile[],
  existingDataTables: ScmResourceFile[],
): Promise<ScmResourceFile[]> => {
  const changedDataTables: ScmResourceFile[] = [];

  for (const dataTable of addedDataTables) {
    let dataTableId;
    const exists = existingDataTables.some((existingDataTable) => {
      if (
        existingDataTable.name === dataTable.name &&
        existingDataTable.relativePath === dataTable.relativePath
      ) {
        dataTableId = existingDataTable.id;
        return true;
      }
      return false;
    });
    if (exists) {
      LOGGER.info(
        "The added data table already exists in Octane: " +
          JSON.stringify(dataTable) +
          ". With the id: " +
          dataTableId,
      );
      continue;
    }
    changedDataTables.push({ ...dataTable, changeType: "added" });
  }

  for (const dataTable of deletedDataTables) {
    let dataTableId;
    const dataTableToDelete = existingDataTables.some((existingDataTable) => {
      if (
        existingDataTable.name === dataTable.name &&
        existingDataTable.relativePath === dataTable.relativePath
      ) {
        dataTableId = existingDataTable.id;
        return true;
      }
      return false;
    });
    if (dataTableToDelete) {
      changedDataTables.push({
        ...dataTable,
        id: dataTableId,
        changeType: "deleted",
      });
    } else {
      LOGGER.warn(
        "Could not find the data table to delete: " + JSON.stringify(dataTable),
      );
    }
  }

  for (const dataTable of modifiedDataTables) {
    let dataTableId;
    const existingDataTable = existingDataTables.some((existingDataTable) => {
      if (
        existingDataTable.name === dataTable.oldValue.name &&
        existingDataTable.relativePath === dataTable.oldValue.relativePath
      ) {
        dataTableId = existingDataTable.id;
        return true;
      }
      return false;
    });
    if (existingDataTable) {
      changedDataTables.push({
        ...dataTable.newValue,
        id: dataTableId,
        changeType: "modified",
      });
    } else {
      LOGGER.info(
        "Could not find the existing data table for modification: " +
          JSON.stringify(dataTable.oldValue) +
          ". Adding it as new data table.",
      );
      changedDataTables.push({ ...dataTable.newValue, changeType: "added" });
    }
  }

  for (const dataTable of discoveredDataTables) {
    const existsInAdded = addedDataTables.some(
      (addedDataTable) =>
        addedDataTable.name === dataTable.name &&
        addedDataTable.relativePath === dataTable.relativePath,
    );

    if (existsInAdded) {
      continue;
    }

    const existsInModified = modifiedDataTables.some(
      (pair) =>
        (pair.oldValue.name === dataTable.name &&
          pair.oldValue.relativePath === dataTable.relativePath) ||
        (pair.newValue.name === dataTable.name &&
          pair.newValue.relativePath === dataTable.relativePath),
    );

    if (existsInModified) {
      continue;
    }

    const foundDataTable = existingDataTables.find(
      (existingDataTable) =>
        existingDataTable.name === dataTable.name &&
        existingDataTable.relativePath === dataTable.relativePath,
    );

    if (foundDataTable) {
      LOGGER.info(
        "The data table already exists in Octane: " +
          JSON.stringify(foundDataTable) +
          " with id: " +
          foundDataTable.id,
      );
      continue;
    }

    changedDataTables.push({ ...dataTable, changeType: "added" });
  }

  LOGGER.debug(
    "The changed data tables are final: " + JSON.stringify(changedDataTables),
  );
  return changedDataTables;
};

export { detectTestChanges, detectDataTableChanges };
