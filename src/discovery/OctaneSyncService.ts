import AutomatedTest from "../dto/uft/AutomatedTest";
import {
  createScmResourceFile,
  deleteScmResourceFile,
  makeTestNotExecutableInOctane,
  sendCreateTestEventToOctane,
  sendUpdateTestEventToOctane,
  updateScmResourceFile,
} from "./octaneClient";
import Logger from "../utils/logger";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";

const LOGGER: Logger = new Logger("OctaneSyncService.ts");

const sendTestEventsToOctane = async (
  octaneSDKConnection: any,
  octaneApi: string,
  modifiedTests: AutomatedTest[],
  repoRootID: string,
): Promise<void> => {
  try {
    for (const test of modifiedTests) {
      LOGGER.debug(
        "the change type of test " + test.name + " is: " + test.changeType,
      );
      if (test.changeType === "deleted") {
        if (test.id) {
          await makeTestNotExecutableInOctane(octaneSDKConnection, test.id);
        }
      } else if (test.changeType === "modified") {
        if (test.id) {
          await sendUpdateTestEventToOctane(
            octaneSDKConnection,
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
          octaneSDKConnection,
          octaneApi,
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
};

const sendDataTableEventsToOctane = async (
  octaneSDKConnection: any,
  octaneApi: string,
  modifiedDataTables: ScmResourceFile[],
  repoRootID: string,
): Promise<void> => {
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
          octaneSDKConnection,
          octaneApi,
          dataTable.name,
          dataTable.relativePath,
          repoRootID,
        );
      } else if (dataTable.changeType === "modified") {
        if (dataTable.id) {
          await updateScmResourceFile(
            octaneSDKConnection,
            octaneApi,
            dataTable.id,
            dataTable.name,
            dataTable.relativePath,
          );
        }
      } else if (dataTable.changeType === "deleted") {
        if (dataTable.id) {
          await deleteScmResourceFile(
            octaneSDKConnection,
            octaneApi,
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
};

export { sendTestEventsToOctane, sendDataTableEventsToOctane };
