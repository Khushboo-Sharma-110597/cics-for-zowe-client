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

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { getIconFilePathFromName } from "../../utils/iconUtils";
import { CICSRegionTree } from "../CICSRegionTree";

export class CICSPipelineTreeItem extends TreeItem {
  pipeline: any;
  parentRegion: CICSRegionTree;
  directParent: any;

  constructor(
    pipeline: any,
    parentRegion: CICSRegionTree,
    directParent: any,
    public readonly iconPath = getIconFilePathFromName("pipeline")
  ) {
    super(`${pipeline.name}`, TreeItemCollapsibleState.None);

    this.pipeline = pipeline;
    this.parentRegion = parentRegion;
    this.directParent = directParent;
    this.contextValue = `cicspipeline.${pipeline.name}`;
  }

  public setLabel(newLabel: string) {
    this.label = newLabel;
  }

  public getParent() {
    return this.directParent;
  }
}
