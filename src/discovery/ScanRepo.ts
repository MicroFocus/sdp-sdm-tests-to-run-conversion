import * as path from "path";
import * as fs from "fs";
import AutomatedTest from "../dto/uft/AutomatedTest";
import Logger from "../utils/logger";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";
import DiscoveryResults from "./DiscoveryResults";
import {
  createAutomatedTestsFromGUI,
  createAutomatedTestFromAPI,
} from "./CreateAutomatedTests";

const LOGGER = new Logger("ScanRepo.ts");

const UFT_GUI_TEST_EXTENSION = ".tsp";
const UFT_API_TEST_EXTENSION = ".st";
const UFT_GUI_TEST_TYPE = "GUI";
const UFT_API_TEST_TYPE = "API";
const NOT_UFT_TEST_TYPE = "Unknown test type";
const XLSX = ".xlsx";
const XLS = ".xls";

export default class ScanRepo {
  private readonly workDir: string = "";
  private tests: AutomatedTest[] = [];
  private scmResourceFiles: ScmResourceFile[] = [];

  constructor(workDir: string) {
    this.workDir = workDir;
  }

  async scanRepo(pathToRepo: string): Promise<DiscoveryResults> {
    const items = await fs.promises.readdir(pathToRepo);
    let testType: string;
    let dataTableNames: string[];

    try {
      dataTableNames = await this.isDataTable(items);
      if (dataTableNames) {
        const dataTable = await this.createScmResourceFile(
          dataTableNames,
          pathToRepo,
        );
        this.scmResourceFiles.push(...dataTable);
      }
      testType = await this.getTestType(items);
      if (testType === UFT_GUI_TEST_TYPE) {
        const automatedTests = await createAutomatedTestsFromGUI(
          pathToRepo,
          testType,
        );
        this.tests.push(automatedTests);
      } else if (testType === UFT_API_TEST_TYPE) {
        const foundApiTests = await createAutomatedTestFromAPI(
          pathToRepo,
          testType,
        );
        this.tests.push(foundApiTests);
      } else {
        const subDirPromises = items.map(async (item) => {
          const itemPath = path.join(pathToRepo, item);
          const stats = await fs.promises.lstat(itemPath);
          if (stats.isDirectory() || stats.isSymbolicLink()) {
            if (stats.isSymbolicLink()) {
              LOGGER.warn(
                `${itemPath} is a symlink and symlinks are not supported and will be ignored.`,
              );
              return;
            }
            await this.scanRepo(itemPath);
          }
        });
        await Promise.all(subDirPromises);
      }
    } catch (e) {
      throw new Error("Error while scanning the repo: " + (e as Error).message);
    }

    return new DiscoveryResults(this.tests, this.scmResourceFiles);
  }

  private async getTestType(paths: string[]) {
    for (const p of paths) {
      const ext = path.extname(p).toLowerCase();
      if (ext === UFT_GUI_TEST_EXTENSION) {
        return UFT_GUI_TEST_TYPE;
      } else if (ext === UFT_API_TEST_EXTENSION) {
        return UFT_API_TEST_TYPE;
      }
    }
    return NOT_UFT_TEST_TYPE;
  }

  private async isDataTable(paths: string[]): Promise<string[]> {
    const foundDataTables: string[] = [];
    for (const p of paths) {
      const ext = path.extname(p).toLowerCase();
      if (ext === XLSX || ext === XLS) {
        foundDataTables.push(p);
      }
    }
    return foundDataTables;
  }

  private async createScmResourceFile(
    dataTableNames: string[],
    pathToDataTable: string,
  ): Promise<ScmResourceFile[]> {
    const dataTables: ScmResourceFile[] = [];
    let relativePath = path
      .relative(this.workDir, pathToDataTable)
      .replace(/\\/g, "/");
    if (relativePath) {
      relativePath = relativePath + "/";
    }
    for (const dataTableName of dataTableNames) {
      const dataTable: ScmResourceFile = {
        name: dataTableName,
        relativePath: relativePath + dataTableName,
      };
      dataTables.push(dataTable);
    }

    return dataTables;
  }
}
