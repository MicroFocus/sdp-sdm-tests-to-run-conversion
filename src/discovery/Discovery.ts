import ScanRepo from "./ScanRepo";
import { OctaneConnectionUtils } from "../utils/octaneConnectionUtils";
import Logger from "../utils/logger";
import AutomatedTest from "../dto/uft/AutomatedTest";
import * as path from "path";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";
import {
  getScmRepo,
  sendCreateTestEventToOctane,
  sendUpdateTestEventToOctane,
  makeTestNotExecutableInOctane,
  createScmResourceFile,
  updateScmResourceFile,
  deleteScmResourceFile,
  getScmResourceFilesFromOctane,
  getExistingTestsInScmRepo,
  getExistingUFTTests,
  getTestRunnerId,
} from "./octaneClient";
import {
  getClassNameAtSync,
  getPackageNameAtSync,
  getTestNameAtSync,
  removeFalsePositiveDataTables,
  removeFalsePositiveDataTablesAtUpdate,
} from "../utils/utils";
import {
  createAutomatedTestFromAPI,
  createAutomatedTestsFromGUI,
} from "./CreateAutomatedTests";
import { readFileSync } from "fs";

const LOGGER = new Logger("Discovery.ts");

export default class Discovery {
  private readonly isFullScan: boolean;
  private readonly octaneUrl: string;
  private readonly sharedSpace: string;
  private readonly workspace: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private octaneSDKConnection: object;
  private readonly GUI_TEST_TYPE = "GUI";
  private readonly API_TEST_TYPE = "API";
  private readonly octaneApi: string;

  constructor(
    isFullScan: boolean,
    octaneUrl: string,
    sharedSpace: string,
    workspace: string,
    clientId: string,
    clientSecret: string,
  ) {
    this.isFullScan = isFullScan;
    this.octaneUrl = octaneUrl;
    this.sharedSpace = sharedSpace;
    this.workspace = workspace;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.octaneSDKConnection = {};
    this.octaneApi = `/api/shared_spaces/${sharedSpace}/workspaces/${workspace}`;
  }

  private async initializeOctaneConnection(): Promise<void> {
    try {
      const connection = OctaneConnectionUtils.getNewOctaneConnection(
        this.octaneUrl,
        this.sharedSpace,
        this.workspace,
        this.clientId,
        this.clientSecret,
      );

      await connection._requestHandler.authenticate();
      this.octaneSDKConnection = connection;
    } catch (e) {
      throw new Error(
        "Failed to initialize Octane connection. " + (e as Error).message,
      );
    }
  }

  public async startDiscovery(path: string): Promise<void> {
    await this.initializeOctaneConnection();

    const repoID = await getScmRepo(this.octaneSDKConnection, this.octaneApi);

    const scanner = new ScanRepo(path);
    const discovery = await scanner.scanRepo(path);

    const discoveredTests = discovery.getAllTests();
    if (discoveredTests.length === 0) {
      LOGGER.warn("No UFT tests have been discovered in the repository.");
    }

    const scmResourceFiles = discovery.getAllScmResourceFiles();
    if (scmResourceFiles.length === 0) {
      LOGGER.warn("No data tables have been discovered in the repository.");
    }

    const filteredScmResourceFiles = await removeFalsePositiveDataTables(
      discoveredTests,
      scmResourceFiles,
    );

    const modifiedTests = await this.getModifiedTestsAndDataTables(
      discoveredTests,
      filteredScmResourceFiles,
    );

    await this.sendTestEventsToOctane(modifiedTests, repoID);
  }

  private async getModifiedFiles(): Promise<string[]> {
    const path = process.env.MODIFIED_FILES_PATH;

    if (!path) {
      return [];
    }

    const gitOutput = readFileSync(path, "utf8");
    return gitOutput.split("\0").filter(Boolean);
  }

  private async sendTestEventsToOctane(
    modifiedTests: AutomatedTest[],
    repoRootID: string,
  ): Promise<void> {
    try {
      for (const test of modifiedTests) {
        LOGGER.debug(
          "the change type of test " + test.name + " is: " + test.changeType,
        );
        if (test.changeType === "deleted") {
          if (test.id) {
            await makeTestNotExecutableInOctane(
              this.octaneSDKConnection,
              test.id,
            );
          }
        } else if (test.changeType === "modified") {
          if (test.id) {
            await sendUpdateTestEventToOctane(
              this.octaneSDKConnection,
              test.id,
              test.name,
              test.packageName,
              test.description,
              test.className,
              test.isExecutable,
            );
          }
        } else if (test.changeType === "added") {
          await sendCreateTestEventToOctane(
            this.octaneSDKConnection,
            this.octaneApi,
            test.name,
            test.packageName,
            test.className,
            test.description,
            repoRootID,
          );
        }
      }
    } catch (e) {
      LOGGER.error(
        "Failed to send test events to Octane. " + (e as Error).message,
      );
      throw new Error(
        "Failed to send test events to Octane. " + (e as Error).message,
      );
    }
  }

  private async sendDataTableEventsToOctane(
    modifiedDataTables: ScmResourceFile[],
    repoRootID: string,
  ): Promise<void> {
    try {
      for (const dataTable of modifiedDataTables) {
        LOGGER.debug(
          "The change type of data table " +
            dataTable.name +
            " is: " +
            dataTable.changeType,
        );
        if (dataTable.changeType === "added") {
          await createScmResourceFile(
            this.octaneSDKConnection,
            this.octaneApi,
            dataTable.name,
            dataTable.relativePath,
            repoRootID,
          );
        } else if (dataTable.changeType === "modified") {
          if (dataTable.id) {
            await updateScmResourceFile(
              this.octaneSDKConnection,
              this.octaneApi,
              dataTable.id,
              dataTable.name,
              dataTable.relativePath,
            );
          }
        } else if (dataTable.changeType === "deleted") {
          if (dataTable.id) {
            await deleteScmResourceFile(
              this.octaneSDKConnection,
              this.octaneApi,
              dataTable.id,
            );
          }
        }
      }
    } catch (e) {
      LOGGER.error(
        "Failed to send scm resource files events to Octane. " +
          (e as Error).message,
      );
      throw new Error(
        "Failed to scm resource files test events to Octane. " +
          (e as Error).message,
      );
    }
  }

  private async getModifiedTestsAndDataTables(
    discoveredTests: AutomatedTest[],
    discoveredScmResourceFiles: ScmResourceFile[],
  ): Promise<AutomatedTest[]> {
    const repoID = await getScmRepo(this.octaneSDKConnection, this.octaneApi);

    let existingTests: AutomatedTest[];

    if (this.isFullScan) {
      existingTests = await getExistingUFTTests(this.octaneSDKConnection);
    } else {
      existingTests = await getExistingTestsInScmRepo(
        this.octaneSDKConnection,
        repoID,
      );
    }

    const changedTests: AutomatedTest[] = [];
    const rootFolder = process.env.BUILD_SOURCESDIRECTORY || "";

    const modifiedFilesArray = await this.getModifiedFiles();
    LOGGER.debug("The modified files array is: " + modifiedFilesArray);
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

    for (let i = 0; i < modifiedFilesArray.length; ) {
      const status = modifiedFilesArray[i++];

      if (!status) continue;

      if (status.startsWith("R")) {
        const oldPath = modifiedFilesArray[i++] ?? "";
        const newPath = modifiedFilesArray[i++] ?? "";

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
          (oldPath && oldPath.match(/\.(xlsx|xls)$/)) ||
          (newPath && newPath.match(/\.(xlsx|xls)$/))
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
              "The modified data table is a false positive. " +
                newDataTable.name,
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
        const deletedFile = modifiedFilesArray[i++] ?? "";
        if (deletedFile && deletedFile.match(/\.(st|tsp)$/)) {
          const className = getClassNameAtSync(deletedFile);
          const testToDelete: AutomatedTest = {
            name: getTestNameAtSync(deletedFile),
            packageName: getPackageNameAtSync(className),
            className: className,
            isExecutable: false,
          };

          testsToDelete.push(testToDelete);
        } else if (deletedFile && deletedFile.match(/\.(xlsx|xls)$/)) {
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
        const addedFile = modifiedFilesArray[i++];
        if (addedFile && addedFile.match(/\.(st|tsp)$/)) {
          const addedFileRenamed =
            rootFolder + "\\" + addedFile.replace(/\//g, "\\");
          if (addedFile.endsWith(".tsp")) {
            const addGUITest = await createAutomatedTestsFromGUI(
              path.dirname(addedFileRenamed),
              this.GUI_TEST_TYPE,
            );
            addedTests.push(addGUITest);
          } else if (addedFile.endsWith(".st")) {
            const addAPITest = await createAutomatedTestFromAPI(
              path.dirname(addedFileRenamed),
              this.API_TEST_TYPE,
            );
            addedTests.push(addAPITest);
          }
        } else if (addedFile && addedFile.match(/\.(xlsx|xls)$/)) {
          const newDataTable: ScmResourceFile = {
            name: path.basename(addedFile),
            relativePath: addedFile,
          };
          addedDataTables.push(newDataTable);
        }
      }
    }

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

    for (const test of testsToDelete) {
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

    for (const pair of modifiedTestsMap) {
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
        (addedTest) =>
          addedTest.name === test.name &&
          addedTest.className === test.className &&
          addedTest.packageName === test.packageName,
      );

      if (existsInAdded) {
        continue;
      }

      const existsInModified = modifiedTestsMap.some(
        (pair) =>
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

    const filteredAddedDataTables = await removeFalsePositiveDataTablesAtUpdate(
      discoveredTests,
      addedDataTables,
    );

    await this.getModifiedScmResourceFiles(
      filteredAddedDataTables,
      removedDataTables,
      modifiedDataTables,
      discoveredScmResourceFiles,
    );
    return changedTests;
  }

  private async getModifiedScmResourceFiles(
    addedDataTables: ScmResourceFile[],
    deletedDataTables: ScmResourceFile[],
    modifiedDataTables: {
      oldValue: ScmResourceFile;
      newValue: ScmResourceFile;
    }[],
    discoveredDataTables: ScmResourceFile[],
  ) {
    const repoID = await getScmRepo(this.octaneSDKConnection, this.octaneApi);

    const existingDataTables = await getScmResourceFilesFromOctane(
      this.octaneSDKConnection,
      this.octaneApi,
      repoID,
    );
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
          "Could not find the data table to delete: " +
            JSON.stringify(dataTable),
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
    await this.sendDataTableEventsToOctane(changedDataTables, repoID);
  }
}
