import { Octane, Query } from "@microfocus/alm-octane-js-rest-sdk";
import Logger from "../utils/logger";
import { ScmResourceFile } from "../dto/uft/ScmResourceFile";
import AutomatedTest from "../dto/uft/AutomatedTest";

const LOGGER = new Logger("octaneClient.ts");

const escapeSpecialChars = (input: string): string => {
  return input.replace(/[+\-!(){}[\]^"~*?:\\/]/g, "\\$&");
};

const getTestRunnerId = async (
  octaneConnection: any,
  octaneApi: string,
): Promise<string> => {
  try {
    let pipelineName;
    if (process.env.BUILD_DEFINITIONNAME) {
      pipelineName = escapeSpecialChars(process.env.BUILD_DEFINITIONNAME);
    }
    LOGGER.debug("The pipeline name is: " + pipelineName);
    const testRunner = await octaneConnection.executeCustomRequest(
      `${octaneApi}/executors?query=\"ci_job EQ {name EQ ^${pipelineName}*^}\"`,
      Octane.operationTypes.get,
    );
    return testRunner.data[0].id;
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while getting test runner id from Octane: " +
        (error as Error).message,
    );
    return "";
  }
};

const getScmRepo = async (
  octaneConnection: any,
  octaneApi: string,
): Promise<string> => {
  try {
    const repoUrl = process.env.REPOURL || "";
    const scmRepos = await octaneConnection.executeCustomRequest(
      `${octaneApi}/scm_repositories/?query=\"repository EQ {url EQ ^${repoUrl}^}\"`,
      Octane.operationTypes.get,
    );

    return scmRepos.data[0].id;
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while getting scm repository from Octane: " +
        (error as Error).message,
    );
    return "";
  }
};

const getExistingTestsInScmRepo = async (
  octaneConnection: any,
  scmRepositoryId: string,
): Promise<AutomatedTest[]> => {
  try {
    const existingTests = await octaneConnection
      .get(Octane.entityTypes.tests)
      .fields(
        "id",
        "executable",
        "name",
        "package",
        "class_name",
        "description",
      )
      .query(
        Query.field("scm_repository")
          .equal(Query.field("id").equal(scmRepositoryId))
          .and(
            Query.field("testing_tool_type").equal(
              Query.field("id").equal("list_node.testing_tool_type.uft"),
            ),
          )
          .build(),
      )
      .execute();

    const automatedTests: AutomatedTest[] = [];
    for (const testData of existingTests.data) {
      const automatedTest: AutomatedTest = {
        id: testData.id,
        name: testData.name,
        packageName: testData.package,
        className: testData.class_name,
        description: testData.description,
        isExecutable: testData.executable,
      };
      automatedTests.push(automatedTest);
    }
    return automatedTests;
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while getting existing tests in scm repository from Octane: " +
        (error as Error).message,
    );
    return [];
  }
};

const getExistingUFTTests = async (
  octaneConnection: any,
): Promise<AutomatedTest[]> => {
  try {
    const existingUftTests = await octaneConnection
      .get(Octane.entityTypes.tests)
      .fields(
        "id",
        "executable",
        "name",
        "package",
        "class_name",
        "description",
      )
      .query(
        Query.field("testing_tool_type")
          .equal(Query.field("id").equal("list_node.testing_tool_type.uft"))
          .build(),
      )
      .execute();
    const automatedTests: AutomatedTest[] = [];
    for (const testData of existingUftTests.data) {
      const automatedTest: AutomatedTest = {
        id: testData.id,
        name: testData.name,
        packageName: testData.package,
        className: testData.class_name,
        description: testData.description,
        isExecutable: testData.executable,
      };
      automatedTests.push(automatedTest);
    }
    return automatedTests;
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while getting existing UFT tests from Octane: " +
        (error as Error).message,
    );
    return [];
  }
};

const sendCreateTestEventToOctane = async (
  octaneConnection: any,
  octaneApi: string,
  name: string,
  packageName: string,
  className: string,
  description: string | undefined,
  scmRepositoryId: string,
): Promise<void> => {
  try {
    const body = {
      testing_tool_type: {
        type: "list_node",
        id: "list_node.testing_tool_type.uft",
      },
      subtype: "test_automated",
      name: name,
      package: packageName,
      class_name: className,
      description: description,
      scm_repository: {
        type: "scm_repository",
        id: scmRepositoryId,
      },
      executable: true,
      test_runner: {
        type: "executor",
        id: await getTestRunnerId(octaneConnection, octaneApi),
      },
    };
    await octaneConnection.create(Octane.entityTypes.tests, body).execute();
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while sending create test event to Octane: " +
        (error as Error).message,
    );
  }
};

const sendUpdateTestEventToOctane = async (
  octaneConnection: any,
  testId: string,
  name: string,
  packageName: string,
  description: string | undefined,
  className: string,
  isExecutable: boolean | undefined,
): Promise<void> => {
  try {
    const body = {
      data: [
        {
          subtype: "test_automated",
          id: testId,
          name: name,
          package: packageName,
          description: description,
          class_name: className,
          executable: isExecutable,
        },
      ],
    };
    await octaneConnection.update(Octane.entityTypes.tests, body).execute();
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while sending update test event to Octane: " +
        (error as Error).message,
    );
  }
};

const makeTestNotExecutableInOctane = async (
  octaneConnection: any,
  testId: string,
): Promise<void> => {
  try {
    const body = {
      data: [
        {
          id: testId,
          executable: false,
        },
      ],
    };
    await octaneConnection.update(Octane.entityTypes.tests, body).execute();
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while making test not executable in Octane: " +
        (error as Error).message,
    );
  }
};

const createScmResourceFile = async (
  octaneConnection: any,
  octaneApi: string,
  name: string,
  relativePath: string,
  scmRepoId: string,
): Promise<void> => {
  try {
    const body = {
      data: [
        {
          name: name,
          relative_path: relativePath,
          scm_repository: {
            type: "scm_repository",
            id: scmRepoId,
          },
        },
      ],
    };

    await octaneConnection.executeCustomRequest(
      `${octaneApi}/scm_resource_files`,
      Octane.operationTypes.create,
      body,
    );
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while creating scm resource file in Octane: " +
        (error as Error).message,
    );
  }
};

const updateScmResourceFile = async (
  octaneConnection: any,
  octaneApi: string,
  scmResourceFileId: string,
  name: string,
  relativePath: string,
): Promise<void> => {
  try {
    const body = {
      data: [
        {
          id: scmResourceFileId,
          name: name,
          relative_path: relativePath,
        },
      ],
    };

    await octaneConnection.executeCustomRequest(
      `${octaneApi}/scm_resource_files`,
      Octane.operationTypes.update,
      body,
    );
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while updating scm resource file in Octane: " +
        (error as Error).message,
    );
  }
};

const deleteScmResourceFile = async (
  octaneConnection: any,
  octaneApi: string,
  scmResourceFileId: string,
): Promise<void> => {
  try {
    await octaneConnection.executeCustomRequest(
      `${octaneApi}/scm_resource_files/?query=\"(id=^${scmResourceFileId}^)\"`,
      Octane.operationTypes.delete,
    );
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while deleting scm resource file in Octane: " +
        (error as Error).message,
    );
  }
};

const getScmResourceFilesFromOctane = async (
  octaneConnection: any,
  octaneApi: string,
  repoId: string,
): Promise<ScmResourceFile[]> => {
  try {
    const resourceFiles: ScmResourceFile[] = [];
    const allResourceFiles = await octaneConnection.executeCustomRequest(
      `${octaneApi}/scm_resource_files?/?query=\"scm_repository EQ {id EQ ^${repoId}^}\"&fields=name,relative_path,scm_repository`,
      Octane.operationTypes.get,
    );

    for (const fileData of allResourceFiles.data) {
      const scmResourceFile: ScmResourceFile = {
        id: fileData.id,
        name: fileData.name,
        relativePath: fileData.relative_path,
        scmRepositoryId: fileData.scm_repository.id,
      };
      resourceFiles.push(scmResourceFile);
    }
    return resourceFiles;
  } catch (error: any) {
    LOGGER.error(
      "Error occurred while getting scm resource files from Octane: " +
        (error as Error).message,
    );
    return [];
  }
};

export {
  getTestRunnerId,
  getScmRepo,
  getExistingTestsInScmRepo,
  getExistingUFTTests,
  sendCreateTestEventToOctane,
  sendUpdateTestEventToOctane,
  makeTestNotExecutableInOctane,
  createScmResourceFile,
  updateScmResourceFile,
  deleteScmResourceFile,
  getScmResourceFilesFromOctane,
};
