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

import { ProgressLocation, TreeItem, TreeItemCollapsibleState, window, workspace } from "vscode";
import { toEscapedCriteriaString } from "../../utils/filterUtils";
import { getFolderIcon } from "../../utils/iconUtils";
import { ProfileManagement } from "../../utils/profileManagement";
import { CICSPlexTree } from "../CICSPlexTree";
import { CICSRegionTree } from "../CICSRegionTree";
import { CICSRegionsContainer } from "../CICSRegionsContainer";
import { CICSTree } from "../CICSTree";
import { CICSTaskTreeItem } from "../treeItems/CICSTaskTreeItem";
import { TextTreeItem } from "../treeItems/utils/TextTreeItem";
import { ViewMore } from "../treeItems/utils/ViewMore";

export class CICSCombinedTaskTree extends TreeItem {
  children: (CICSTaskTreeItem | ViewMore)[] | [TextTreeItem] | null;
  parentPlex: CICSPlexTree;
  activeFilter: string | undefined;
  currentCount: number;
  incrementCount: number;
  constant: string;

  constructor(
    parentPlex: CICSPlexTree,
    public iconPath = getFolderIcon(false)
  ) {
    super("All Tasks", TreeItemCollapsibleState.Collapsed);
    this.contextValue = `cicscombinedtasktree.`;
    this.parentPlex = parentPlex;
    this.children = [new TextTreeItem("Use the search button to display tasks", "applyfiltertext.")];
    this.activeFilter = undefined;
    this.currentCount = 0;
    this.incrementCount = +`${workspace.getConfiguration().get("zowe.cics.allTasks.recordCountIncrement")}`;
    this.constant = "CICSTask";
  }

  public async loadContents(tree: CICSTree) {
    await window.withProgress(
      {
        title: "Loading Task",
        location: ProgressLocation.Notification,
        cancellable: true,
      },
      async (_, token) => {
        token.onCancellationRequested(() => {});
        try {
          let criteria;
          if (this.activeFilter) {
            criteria = toEscapedCriteriaString(this.activeFilter, "tranid");
          }
          let count;
          const cacheTokenInfo = await ProfileManagement.generateCacheToken(
            this.parentPlex.getProfile(),
            this.getSession(),
            this.parentPlex.getPlexName(),
            this.constant,
            criteria,
            this.getParent().getGroupName()
          );
          if (cacheTokenInfo) {
            const recordsCount = cacheTokenInfo.recordCount;
            if (recordsCount) {
              let allTasks;
              if (recordsCount <= this.incrementCount) {
                allTasks = await ProfileManagement.getCachedResources(
                  this.parentPlex.getProfile(),
                  this.getSession(),
                  cacheTokenInfo.cacheToken,
                  this.constant,
                  1,
                  recordsCount
                );
              } else {
                allTasks = await ProfileManagement.getCachedResources(
                  this.parentPlex.getProfile(),
                  this.getSession(),
                  cacheTokenInfo.cacheToken,
                  this.constant,
                  1,
                  this.incrementCount
                );
                count = recordsCount;
              }
              this.addTasksUtil([], allTasks, count);
              this.iconPath = getFolderIcon(true);
              tree._onDidChangeTreeData.fire(undefined);
            } else {
              this.children = [];
              this.iconPath = getFolderIcon(true);
              tree._onDidChangeTreeData.fire(undefined);
              window.showInformationMessage(`No tasks found`);
              this.label = `All Tasks${this.activeFilter ? ` (${this.activeFilter}) ` : " "}[${recordsCount}]`;
            }
          }
        } catch (error) {
          window.showErrorMessage(
            `Something went wrong when fetching tasks - ${JSON.stringify(error, Object.getOwnPropertyNames(error)).replace(/(\\n\t|\\n|\\t)/gm, " ")}`
          );
        }
      }
    );
  }

  /**
   * Add tasks as children to the combined task tree
   */
  public addTasksUtil(newChildren: (CICSTaskTreeItem | ViewMore)[], allTasks: any, count: number | undefined) {
    for (const task of allTasks) {
      const regionsContainer = this.parentPlex.children.filter((child) => child instanceof CICSRegionsContainer)?.[0];
      if (regionsContainer == null) {
        continue;
      }
      const parentRegion = regionsContainer
        .getChildren()!
        .filter((child) => child instanceof CICSRegionTree && child.getRegionName() === task.eyu_cicsname)?.[0] as CICSRegionTree;
      const taskTree = new CICSTaskTreeItem(task, parentRegion, this);
      // Show run status if run status isn't SUSPENDED (assuming SUSPENDED is default runstatus)
      taskTree.setLabel(
        taskTree.label
          .toString()
          .replace(task.task, `${task.task} - ${task.tranid} (${task.eyu_cicsname})${task.runstatus !== "SUSPENDED" ? ` (${task.runstatus})` : ""}`)
      );
      newChildren.push(taskTree);
    }
    if (!count) {
      count = newChildren.length;
    }
    this.currentCount = newChildren.length;
    this.label = `All Tasks ${this.activeFilter ? `(${this.activeFilter}) ` : " "}[${this.currentCount} of ${count}]`;
    if (count !== this.currentCount) {
      newChildren.push(new ViewMore(this, Math.min(this.incrementCount, count - this.currentCount)));
    }
    this.children = newChildren;
  }

  public async addMoreCachedResources(tree: CICSTree) {
    await window.withProgress(
      {
        title: "Loading more tasks",
        location: ProgressLocation.Notification,
        cancellable: false,
      },
      async () => {
        const cacheTokenInfo = await ProfileManagement.generateCacheToken(
          this.parentPlex.getProfile(),
          this.getSession(),
          this.parentPlex.getPlexName(),
          this.constant,
          this.getParent().getGroupName()
        );
        if (cacheTokenInfo) {
          // record count may have updated
          const recordsCount = cacheTokenInfo.recordCount;
          const count = recordsCount;
          const allTasks = await ProfileManagement.getCachedResources(
            this.parentPlex.getProfile(),
            this.getSession(),
            cacheTokenInfo.cacheToken,
            this.constant,
            this.currentCount + 1,
            this.incrementCount
          );
          if (allTasks) {
            // @ts-ignore
            this.addTasksUtil(this.getChildren() ? this.getChildren().filter((child) => child instanceof CICSTaskTreeItem) : [], allTasks, count);
            tree._onDidChangeTreeData.fire(undefined);
          }
        }
      }
    );
  }

  public clearFilter() {
    this.activeFilter = undefined;
    this.label = `All Tasks`;
    this.contextValue = `cicscombinedtasktree.unfiltered`;
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
  }

  public setFilter(newFilter: string) {
    this.activeFilter = newFilter;
    this.label = `All Tasks (${this.activeFilter})`;
    this.contextValue = `cicscombinedtasktree.filtered`;
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
  }

  public getChildren() {
    return this.children ? this.children.filter((child) => !(child instanceof TextTreeItem)) : [];
  }

  public getActiveFilter() {
    return this.activeFilter;
  }

  public getParent() {
    // direct parent
    return this.parentPlex;
  }

  public getSession() {
    return this.getParent().getSession();
  }
}
