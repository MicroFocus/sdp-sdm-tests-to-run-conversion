export interface ScmResourceFile {
  id?: string;
  relativePath: string;
  name: string;
  scmRepositoryId?: string;
  changeType?: string;
}
