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

const programName = "program1";
let TEST_ENVIRONMENT: ITestEnvironment<ITestPropertiesSchema>;
let regionName: string;
let csdGroup: string;
let host: string;
let port: number;
let user: string;
let password: string;
let protocol: string;
let rejectUnauthorized: boolean;

describe("CICS discard transaction command", () => {
  beforeAll(async () => {
    TEST_ENVIRONMENT = await TestEnvironment.setUp({
      testName: "discard_transaction",
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

  const deleteTransaction = async (transactionName: string) => {
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
      `/${CicsCmciConstants.CICS_SYSTEM_MANAGEMENT}/${CicsCmciConstants.CICS_DEFINITION_TRANSACTION}/${cmciProperties.regionName}` +
        `?CRITERIA=(NAME=${transactionName})&PARAMETER=CSDGROUP(${cmciProperties.csdGroup})`
    );
  };

  it("should be able to display the help", () => {
    const output = runCliScript(__dirname + "/__scripts__/discard_transaction_help.sh", TEST_ENVIRONMENT, []);
    expect(output.stderr.toString()).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toMatchSnapshot();
  });

  it("should be able to successfully discard a transaction with basic options", async () => {
    // Get a random transaction name
    const transactionNameSuffixLength = 3;
    const transactionName = "X" + generateRandomAlphaNumericString(transactionNameSuffixLength);

    // Define the transaction
    let output = runCliScript(__dirname + "/../../define/transaction/__scripts__/define_transaction.sh", TEST_ENVIRONMENT, [
      transactionName,
      programName,
      csdGroup,
      regionName,
    ]);
    let stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");

    // Install defined transaction
    output = runCliScript(__dirname + "/../../install/transaction/__scripts__/install_transaction.sh", TEST_ENVIRONMENT, [
      transactionName,
      csdGroup,
      regionName,
    ]);
    stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");

    output = runCliScript(__dirname + "/__scripts__/discard_transaction.sh", TEST_ENVIRONMENT, [transactionName, regionName]);
    stderr = output.stderr.toString();
    expect(stderr).toEqual("");
    expect(output.status).toEqual(0);
    expect(output.stdout.toString()).toContain("success");

    await deleteTransaction(transactionName);
  });

  it("should get a syntax error if transaction name is omitted", () => {
    const output = runCliScript(__dirname + "/__scripts__/discard_transaction.sh", TEST_ENVIRONMENT, ["", "FAKERGN"]);
    const stderr = output.stderr.toString();
    expect(stderr).toContain("Syntax");
    expect(stderr).toContain("Missing Positional Argument");
    expect(stderr).toContain("transactionName");
    expect(output.status).toEqual(1);
  });

  it("should be able to successfully discard a transaction with profile options", async () => {
    // Get a random transaction name
    const transactionNameSuffixLength = 3;
    const transactionName = "X" + generateRandomAlphaNumericString(transactionNameSuffixLength);

    // Define the transaction
    let output = runCliScript(__dirname + "/../../define/transaction/__scripts__/define_transaction_fully_qualified.sh", TEST_ENVIRONMENT, [
      transactionName,
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

    // Install defined transaction
    output = runCliScript(__dirname + "/../../install/transaction/__scripts__/install_transaction_fully_qualified.sh", TEST_ENVIRONMENT, [
      transactionName,
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

    output = runCliScript(__dirname + "/__scripts__/discard_transaction_fully_qualified.sh", TEST_ENVIRONMENT, [
      transactionName,
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

    await deleteTransaction(transactionName);
  });
});
