import AutomatedTest from "../dto/uft/AutomatedTest";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";
import {
  getClassNameAtSync,
  getPackageNameAtSync,
  getTestNameAtSync,
  removeFalsePositiveDataTablesAtUpdate,
} from "./utils";
import * as path from "path";
import {
  createAutomatedTestFromAPI,
  createAutomatedTestsFromGUI,
} from "../discovery/CreateAutomatedTests";
import Logger from "./logger";
import SyncResults from "../discovery/SyncResults";

const LOGGER = new Logger("fileTypeUtils.ts");

const GUI_TEST_TYPE = "GUI";
const API_TEST_TYPE = "API";
const TSP_FILE_EXTENSION = ".tsp";
const ST_FILE_EXTENSION = ".st";

const determineFileAndChangeType = async (
  modifiedFiles: string[],
  discoveredTests: AutomatedTest[],
  existingTests: AutomatedTest[],
): Promise<any> => {
  const rootFolder = process.env.BUILD_SOURCESDIRECTORY || "";
  const modifiedTestsMap: {
    oldValue: AutomatedTest;
    newValue: AutomatedTest;
  }[] = [];
  const testsToDelete: AutomatedTest[] = [];
  const addedTests: AutomatedTest[] = [];
  const removedDataTables: ScmResourceFile[] = [];
  const modifiedDataTables: {
    oldValue: ScmResourceFile;
    newValue: ScmResourceFile;
  }[] = [];
  const addedDataTables: ScmResourceFile[] = [];
  const re = /\.(xlsx|xls)$/;

  for (let i = 0; i < modifiedFiles.length; ) {
    const status = modifiedFiles[i++];

    if (!status) continue;

    if (status.startsWith("R")) {
      const oldPath = modifiedFiles[i++] ?? "";
      const newPath = modifiedFiles[i++] ?? "";

      if (
        (oldPath && oldPath.match(/\.(st|tsp)$/)) ||
        (newPath && newPath.match(/\.(st|tsp)$/))
      ) {
        const classNameOld = getClassNameAtSync(oldPath);
        const oldTest: AutomatedTest = {
          name: getTestNameAtSync(oldPath),
          packageName: getPackageNameAtSync(classNameOld),
          className: classNameOld,
        };

        const classNameNew = getClassNameAtSync(newPath);
        const newTest: AutomatedTest = {
          name: getTestNameAtSync(newPath),
          packageName: getPackageNameAtSync(classNameNew),
          className: classNameNew,
        };

        modifiedTestsMap.push({ oldValue: oldTest, newValue: newTest });
        LOGGER.debug(`Mapped: ${oldPath} → ${newPath}`);
      } else if (
        (oldPath && re.test(oldPath.toLowerCase())) ||
        (newPath && re.test(newPath.toLowerCase()))
      ) {
        const oldDataTable: ScmResourceFile = {
          name: path.basename(oldPath),
          relativePath: oldPath,
        };
        const newDataTable: ScmResourceFile = {
          name: path.basename(newPath),
          relativePath: newPath,
        };

        const filteredModifiedDataTables =
          await removeFalsePositiveDataTablesAtUpdate(discoveredTests, [
            newDataTable,
          ]);
        if (filteredModifiedDataTables.length === 0) {
          LOGGER.debug(
            "The modified data table is a false positive. " + newDataTable.name,
          );
          continue;
        }

        modifiedDataTables.push({
          oldValue: oldDataTable,
          newValue: newDataTable,
        });
        LOGGER.debug(`Mapped data table: ${oldPath} → ${newPath}`);
      }
      continue;
    }

    if (status === "D") {
      const deletedFile = modifiedFiles[i++] ?? "";
      if (deletedFile && deletedFile.match(/\.(st|tsp)$/)) {
        const className = getClassNameAtSync(deletedFile);
        const testToDelete: AutomatedTest = {
          name: getTestNameAtSync(deletedFile),
          packageName: getPackageNameAtSync(className),
          className: className,
          isExecutable: false,
        };

        testsToDelete.push(testToDelete);
      } else if (deletedFile && re.test(deletedFile.toLowerCase())) {
        const deletedDataTable: ScmResourceFile = {
          name: path.basename(deletedFile),
          relativePath: deletedFile,
        };

        const filteredRemovedDataTables =
          await removeFalsePositiveDataTablesAtUpdate(existingTests, [
            deletedDataTable,
          ]);
        if (filteredRemovedDataTables.length === 0) {
          LOGGER.debug(
            "The removed data table is a false positive. " +
              deletedDataTable.name,
          );
          continue;
        }

        removedDataTables.push(deletedDataTable);
      }
      continue;
    }

    if (status === "A") {
      const addedFile = modifiedFiles[i++];
      if (addedFile && addedFile.match(/\.(st|tsp)$/)) {
        const addedFileRenamed =
          rootFolder + "\\" + addedFile.replace(/\//g, "\\");
        if (addedFile.endsWith(TSP_FILE_EXTENSION)) {
          const addGUITest = await createAutomatedTestsFromGUI(
            path.dirname(addedFileRenamed),
            GUI_TEST_TYPE,
          );
          addedTests.push(addGUITest);
        } else if (addedFile.endsWith(ST_FILE_EXTENSION)) {
          const addAPITest = await createAutomatedTestFromAPI(
            path.dirname(addedFileRenamed),
            API_TEST_TYPE,
          );
          addedTests.push(addAPITest);
        }
      } else if (addedFile && re.test(addedFile.toLowerCase())) {
        const newDataTable: ScmResourceFile = {
          name: path.basename(addedFile),
          relativePath: addedFile,
        };
        addedDataTables.push(newDataTable);
      }
    }
  }
  return new SyncResults(
    addedTests,
    addedDataTables,
    modifiedTestsMap,
    modifiedDataTables,
    testsToDelete,
    removedDataTables,
  );
};

export { determineFileAndChangeType };
