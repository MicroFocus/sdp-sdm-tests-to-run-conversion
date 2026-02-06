import AutomatedTest from "../dto/uft/AutomatedTest";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";

export default class SyncResults {
  private readonly _addedTests: AutomatedTest[];
  private readonly _addedScmResourceFiles: ScmResourceFile[];
  private readonly _modifiedTests: {
    oldValue: AutomatedTest;
    newValue: AutomatedTest;
  }[];
  private readonly _modifiedScmResourceFiles: {
    oldValue: ScmResourceFile;
    newValue: ScmResourceFile;
  }[];
  private readonly _deletedTests: AutomatedTest[];
  private readonly _deletedScmResourceFiles: ScmResourceFile[];

  constructor(
    addedTests: AutomatedTest[],
    addedScmResourceFiles: ScmResourceFile[],
    modifiedTests: { oldValue: AutomatedTest; newValue: AutomatedTest }[],
    modifiedScmResourceFiles: {
      oldValue: ScmResourceFile;
      newValue: ScmResourceFile;
    }[],
    deletedTests: AutomatedTest[],
    deletedScmResourceFiles: ScmResourceFile[],
  ) {
    this._addedTests = addedTests;
    this._addedScmResourceFiles = addedScmResourceFiles;
    this._modifiedTests = modifiedTests;
    this._modifiedScmResourceFiles = modifiedScmResourceFiles;
    this._deletedTests = deletedTests;
    this._deletedScmResourceFiles = deletedScmResourceFiles;
  }

  public getAllAddedTests(): AutomatedTest[] {
    return this._addedTests;
  }

  public getAllModifiedTests(): {
    oldValue: AutomatedTest;
    newValue: AutomatedTest;
  }[] {
    return this._modifiedTests;
  }

  public getAllDeletedTests(): AutomatedTest[] {
    return this._deletedTests;
  }

  public getAllAddedScmResourceFiles(): ScmResourceFile[] {
    return this._addedScmResourceFiles;
  }

  public getAllModifiedScmResourceFiles(): {
    oldValue: ScmResourceFile;
    newValue: ScmResourceFile;
  }[] {
    return this._modifiedScmResourceFiles;
  }

  public getAllDeletedScmResourceFiles(): ScmResourceFile[] {
    return this._deletedScmResourceFiles;
  }
}
