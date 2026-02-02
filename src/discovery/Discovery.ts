import ScanRepo from "./ScanRepo";
import { OctaneConnectionUtils } from "../utils/octaneConnectionUtils";
import Logger from "../utils/logger";
import AutomatedTest from "../dto/uft/AutomatedTest";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";
import {
  getScmRepo,
  getScmResourceFilesFromOctane,
  getExistingTestsInScmRepo,
  getExistingUFTTests,
} from "./octaneClient";
import {
  removeFalsePositiveDataTables,
  removeFalsePositiveDataTablesAtUpdate,
} from "../utils/utils";
import { readFileSync } from "fs";
import {
  sendDataTableEventsToOctane,
  sendTestEventsToOctane,
} from "./OctaneSyncService";
import { determineFileAndChangeType } from "../utils/fileTypeUtils";
import { detectDataTableChanges, detectTestChanges } from "./ChangeDetector";

const LOGGER = new Logger("Discovery.ts");

export default class Discovery {
  private readonly isFullScan: boolean;
  private readonly octaneUrl: string;
  private readonly sharedSpace: string;
  private readonly workspace: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private octaneSDKConnection: object;
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

    await this.getModifiedTestsAndDataTables(
      discoveredTests,
      filteredScmResourceFiles,
    );
  }

  private async getModifiedFiles(): Promise<string[]> {
    const path = process.env.MODIFIED_FILES_PATH;

    if (!path) {
      return [];
    }

    const gitOutput = readFileSync(path, "utf8");
    return gitOutput.split("\0").filter(Boolean);
  }

  private async getModifiedTestsAndDataTables(
    discoveredTests: AutomatedTest[],
    discoveredScmResourceFiles: ScmResourceFile[],
  ): Promise<void> {
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

    const existingDataTables = await getScmResourceFilesFromOctane(
      this.octaneSDKConnection,
      this.octaneApi,
      repoID,
    );

    let changedTests: AutomatedTest[];
    let changedDataTables: ScmResourceFile[];

    const modifiedFilesArray = await this.getModifiedFiles();
    LOGGER.debug("The modified files array is: " + modifiedFilesArray);

    const changedTestsAndScmResourceFiles = await determineFileAndChangeType(
      modifiedFilesArray,
      discoveredTests,
      existingTests,
    );

    const modifiedTestsMap =
      changedTestsAndScmResourceFiles.getAllModifiedTests();
    const testsToDelete = changedTestsAndScmResourceFiles.getAllDeletedTests();
    const addedTests = changedTestsAndScmResourceFiles.getAllAddedTests();
    const removedDataTables =
      changedTestsAndScmResourceFiles.getAllDeletedScmResourceFiles();
    const modifiedDataTables =
      changedTestsAndScmResourceFiles.getAllModifiedScmResourceFiles();
    const addedDataTables =
      changedTestsAndScmResourceFiles.getAllAddedScmResourceFiles();

    changedTests = await detectTestChanges(
      discoveredTests,
      existingTests,
      addedTests,
      modifiedTestsMap,
      testsToDelete,
    );

    const filteredAddedDataTables = await removeFalsePositiveDataTablesAtUpdate(
      discoveredTests,
      addedDataTables,
    );
    changedDataTables = await detectDataTableChanges(
      filteredAddedDataTables,
      removedDataTables,
      modifiedDataTables,
      discoveredScmResourceFiles,
      existingDataTables,
    );

    await sendTestEventsToOctane(
      this.octaneSDKConnection,
      this.octaneApi,
      changedTests,
      repoID,
    );
    await sendDataTableEventsToOctane(
      this.octaneSDKConnection,
      this.octaneApi,
      changedDataTables,
      repoID,
    );
  }
}
