export default interface AutomatedTest {
  id?: string;
  name: string;
  packageName: string;
  className: string;
  uftOneTestType?: string;
  description?: string;
  changeType?: string;
  scmRepositoryId?: string;
  isExecutable?: boolean;
}
