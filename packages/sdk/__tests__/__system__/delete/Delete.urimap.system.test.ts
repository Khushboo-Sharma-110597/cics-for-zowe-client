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

import { ITestEnvironment, TestEnvironment } from "@zowe/cli-test-utils";
import { Session } from "@zowe/imperative";
import { IURIMapParms, defineUrimapClient, defineUrimapPipeline, defineUrimapServer, deleteUrimap } from "../../../src";
import { ITestPropertiesSchema } from "../../__src__/ITestPropertiesSchema";
import { generateRandomAlphaNumericString } from "../../__src__/TestUtils";

let testEnvironment: ITestEnvironment<ITestPropertiesSchema>;
let regionName: string;
let csdGroup: string;
let session: Session;
let certificate: string;

describe("CICS Delete URImap", () => {
  beforeAll(async () => {
    testEnvironment = await TestEnvironment.setUp({
      testName: "cics_cmci_delete_urimap",
      tempProfileTypes: ["cics"],
    });
    csdGroup = testEnvironment.systemTestProperties.cmci.csdGroup;
    regionName = testEnvironment.systemTestProperties.cmci.regionName;
    const cicsProperties = testEnvironment.systemTestProperties.cics;
    certificate = testEnvironment.systemTestProperties.urimap.certificate;

    session = new Session({
      user: cicsProperties.user,
      password: cicsProperties.password,
      hostname: cicsProperties.host,
      port: cicsProperties.port,
      type: "basic",
      rejectUnauthorized: cicsProperties.rejectUnauthorized || false,
      protocol: (cicsProperties.protocol as any) || "https",
    });
  });

  afterAll(async () => {
    await TestEnvironment.cleanUp(testEnvironment);
  });

  const options: IURIMapParms = {} as any;

  it("should delete a URIMap of type server from CICS", async () => {
    let error;
    let response;

    const urimapNameSuffixLength = 4;
    const urimapName = "AAAA" + generateRandomAlphaNumericString(urimapNameSuffixLength);

    options.name = urimapName;
    options.path = "fake";
    options.host = "fake";
    options.scheme = "https";
    options.programName = "AAAA1234";
    options.csdGroup = csdGroup;
    options.regionName = regionName;
    options.authenticate = undefined;
    options.certificate = undefined;
    options.tcpipservice = "TESTSVC";
    await defineUrimapServer(session, options);

    try {
      response = await deleteUrimap(session, options);
    } catch (err) {
      error = err;
    }

    expect(error).toBeFalsy();
    expect(response).toBeTruthy();
    expect(response.response.resultsummary.api_response1).toBe("1024");
  });

  it("should delete a URIMap of type pipeline from CICS", async () => {
    let error;
    let response;

    const urimapNameSuffixLength = 4;
    const urimapName = "AAAA" + generateRandomAlphaNumericString(urimapNameSuffixLength);

    options.name = urimapName;
    options.path = "fake";
    options.host = "fake";
    options.scheme = "https";
    options.pipelineName = "AAAB1234";
    options.csdGroup = csdGroup;
    options.regionName = regionName;
    options.authenticate = undefined;
    options.certificate = undefined;
    options.tcpipservice = "TESTSVC";
    await defineUrimapPipeline(session, options);

    try {
      response = await deleteUrimap(session, options);
    } catch (err) {
      error = err;
    }

    expect(error).toBeFalsy();
    expect(response).toBeTruthy();
    expect(response.response.resultsummary.api_response1).toBe("1024");
  });

  it("should delete a URIMap of type client from CICS", async () => {
    let error;
    let response;

    const urimapNameSuffixLength = 3;
    const urimapName = "X" + generateRandomAlphaNumericString(urimapNameSuffixLength);

    options.name = urimapName;
    options.path = "fake";
    options.host = "fake";
    options.scheme = "https";
    options.csdGroup = csdGroup;
    options.regionName = regionName;
    options.authenticate = "BASIC";
    options.certificate = certificate;
    options.tcpipservice = undefined;
    await defineUrimapClient(session, options);

    try {
      response = await deleteUrimap(session, options);
    } catch (err) {
      error = err;
    }

    expect(error).toBeFalsy();
    expect(response).toBeTruthy();
    expect(response.response.resultsummary.api_response1).toBe("1024");
  });

  it("should fail to delete a URIMap from CICS with invalid CICS region", async () => {
    let error;
    let response;

    const urimapNameSuffixLength = 3;
    const urimapName = "X" + generateRandomAlphaNumericString(urimapNameSuffixLength);

    options.name = urimapName;
    options.path = "fake";
    options.host = "fake";
    options.scheme = "https";
    options.csdGroup = csdGroup;
    options.regionName = "fake";
    options.authenticate = undefined;
    options.certificate = undefined;
    options.tcpipservice = "TESTSVC";

    try {
      response = await deleteUrimap(session, options);
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
    expect(response).toBeFalsy();
    expect(error.message).toContain("Did not receive the expected response from CMCI REST API");
    expect(error.message).toContain("INVALIDPARM");
  });

  it("should fail to delete a URIMap that does not exist", async () => {
    let error;
    let response;

    const urimapName = "XXXXFAKE";

    options.name = urimapName;
    options.path = "fake";
    options.host = "fake";
    options.scheme = "https";
    options.csdGroup = csdGroup;
    options.regionName = regionName;
    options.authenticate = undefined;
    options.certificate = undefined;
    options.tcpipservice = "TESTSVC";

    try {
      response = await deleteUrimap(session, options);
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
    expect(response).toBeFalsy();
    expect(error.message).toContain("Did not receive the expected response from CMCI REST API");
    expect(error.message).toContain("NODATA");
  });
});
