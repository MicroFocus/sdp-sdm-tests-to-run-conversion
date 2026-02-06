import AutomatedTest from "../dto/uft/AutomatedTest";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";

export default class DiscoveryResults {
  private readonly _tests: AutomatedTest[];
  private readonly _scmResourceFiles: ScmResourceFile[];

  constructor(tests: AutomatedTest[], scmResourceFiles: ScmResourceFile[]) {
    this._tests = tests;
    this._scmResourceFiles = scmResourceFiles;
  }

  public getAllTests(): AutomatedTest[] {
    return this._tests;
  }

  public getAllScmResourceFiles(): ScmResourceFile[] {
    return this._scmResourceFiles;
  }
}
