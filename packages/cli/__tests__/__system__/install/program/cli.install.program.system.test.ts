/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 *
 */

import { ITestEnvironment, TestEnvironment, runCliScript } from "@zowe/cli-test-utils";
import { Session } from "@zowe/imperative";
import { CicsCmciConstants, CicsCmciRestClient } from "../../../../src";
import { ITestPropertiesSchema } from "../../../__src__/ITestPropertiesSchema";
import { generateRandomAlphaNumericString } from "../../../__src__/TestUtils";

let TEST_ENVIRONMENT: ITestEnvironment<ITestPropertiesSchema>;
let regionName: string;
let csdGroup: string;
let host: string;
let port: number;
let user: string;
let password: string;
let protocol: string;
let rejectUnauthorized: boolean;

describe("CICS install program command", () => {
  beforeAll(async () => {
    TEST_ENVIRONMENT = await TestEnvironment.setUp({
      testName: "install_program",
      installPlugin: true,
      tempProfileTypes: ["cics"],
    });
    csdGroup = TEST_ENVIRONMENT.systemTestProperties.cmci.csdGroup;
    regionName = TEST_ENVIRONMENT.systemTestProperties.cmci.regionName;
    host = TEST_ENVIRONMENT.systemTestProperties.cics.host;
    port = TEST_ENVIRONMENT.systemTestProperties.cics.port;
    user = TEST_ENVIRONMENT.systemTestProperties.cics.user;
    password = TEST_ENVIRONMENT.systemTestProperties.cics.password;
    protocol = TEST_ENVIRONMENT.systemTestProperties.cics.protocol;
    rejectUnauthorized = TEST_ENVIRONMENT.systemTestProperties.cics.rejectUnauthorized;
  });

  afterAll(async () => {
    await TestEnvironment.cleanUp(TEST_ENVIRONMENT);
  });

  const deleteProgram = async (programName: string) => {
    const cicsProperties = TEST_ENVIRONMENT.systemTestProperties.cics;
    const cmciProperties = TEST_ENVIRONMENT.systemTestProperties.cmci;
    const session = new Session({
      type: "basic",
      hostname: cicsProperties.host,
      port: cicsProperties.port,
      user: cicsProperties.user,
      password: cicsProperties.password,
      rejectUnauthorized: cicsProperties.rejectUnauthorized || false,
      protocol: (cicsProperties.protocol as any) || "https",
    });

    return CicsCmciRestClient.deleteExpectParsedXml(
      session,
      `/${CicsCmciConstants.CICS_SYSTEM_MANAGEMENT}/CICSDefinitionProgram/${cmciProperties.regionName}` +
        `?CRITERIA=(NAME=${programName})&PARAMETER=CSDGROUP(${cmciProperties.csdGroup})`
    );
  };

  const discardProgram = async (programName: string) => {
    const cicsProperties = TEST_ENVIRONMENT.systemTestProperties.cics;
    const cmciProperties = TEST_ENVIRONMENT.systemTestProperties.cmci;
    const deleteSession = new Session({
      type: "basic",
      hostname: cicsProperties.host,
      port: cicsProperties.port,
      user: cicsProperties.user,
      password: cicsProperties.password,
      rejectUnauthorized: cicsProperties.rejectUnauthorized || false,
      protocol: (cicsProperties.protocol as any) || "https",
    });

    return CicsCmciRestClient.deleteExpectParsedXml(
      deleteSession,
      `/${CicsCmciConstants.CICS_SYSTEM_MANAGEMENT}/CICSProgram/${cmciProperties.regionName}` + `?CRITERIA=(PROGRAM=${programName})`
    );
  };

  it("should be able to display the help", () => {
    const output = runCliScript(__dirname + "/__scripts__/install_program_help.sh", TEST_ENVIRONMENT, []);
    expect(output.stderr.toString()).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toMatchSnapshot();
  });

  it("should be able to successfully install a program with basic options", async () => {
    // first define the program
    const programNameSuffixLength = 4;
    const programName = "AAA" + generateRandomAlphaNumericString(programNameSuffixLength);
    let output = runCliScript(__dirname + "/../../define/program/__scripts__/define_program.sh", TEST_ENVIRONMENT, [
      programName,
      csdGroup,
      regionName,
    ]);
    let stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");

    output = runCliScript(__dirname + "/__scripts__/install_program.sh", TEST_ENVIRONMENT, [programName, csdGroup, regionName]);
    stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");
    await discardProgram(programName);
    await deleteProgram(programName);
  });

  it("should get a syntax error if program name is omitted", () => {
    const output = runCliScript(__dirname + "/__scripts__/install_program.sh", TEST_ENVIRONMENT, ["", "FAKEGRP", "FAKERGN"]);
    const stderr = output.stderr.toString();
    expect(stderr).toContain("Syntax");
    expect(stderr).toContain("program");
    expect(stderr).toContain("name");
    expect(output.status).toEqual(1);
  });

  it("should get a syntax error if CSD group is omitted", () => {
    const output = runCliScript(__dirname + "/__scripts__/install_program.sh", TEST_ENVIRONMENT, ["FAKEPGM", "", "FAKERGN"]);
    const stderr = output.stderr.toString();
    expect(stderr).toContain("Syntax");
    expect(stderr).toContain("csdGroup");
    expect(output.status).toEqual(1);
  });

  it("should be able to successfully install a program with profile options", async () => {
    // first define the program
    const programNameSuffixLength = 4;
    const programName = "AAA" + generateRandomAlphaNumericString(programNameSuffixLength);
    let output = runCliScript(__dirname + "/../../define/program/__scripts__/define_program_fully_qualified.sh", TEST_ENVIRONMENT, [
      programName,
      csdGroup,
      regionName,
      host,
      port,
      user,
      password,
      protocol,
      rejectUnauthorized,
    ]);
    let stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");

    output = runCliScript(__dirname + "/__scripts__/install_program_fully_qualified.sh", TEST_ENVIRONMENT, [
      programName,
      csdGroup,
      regionName,
      host,
      port,
      user,
      password,
      protocol,
      rejectUnauthorized,
    ]);
    stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");
    await discardProgram(programName);
    await deleteProgram(programName);
  });
});
