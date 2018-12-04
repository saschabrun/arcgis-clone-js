/*
 | Copyright 2018 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

import { IItemHash } from "./fullItemHierarchy";
import { IFullItem } from "./fullItem";

//-- Exports ---------------------------------------------------------------------------------------------------------//

/**
 * A recursive structure describing the hierarchy of a collection of AGOL items.
 */
export interface IHierarchyEntry {
  /**
   * AGOL item id
   */
  id: string,
  /**
   * Item's dependencies
   */
  dependencies: IHierarchyEntry[]
}

export function getTopLevelItemIds (
  items: IItemHash
): string[] {
  // Find the top-level nodes. Start with all nodes, then remove those that other nodes depend on
  let topLevelItemCandidateIds:string[] = Object.keys(items);
  Object.keys(items).forEach(function (id) {
    ((items[id] as IFullItem).dependencies || []).forEach(function (dependencyId) {
      let iNode = topLevelItemCandidateIds.indexOf(dependencyId);
      if (iNode >= 0) {
        // Node is somebody's dependency, so remove the node from the list of top-level nodes
        // If iNode == -1, then it's a shared dependency and it has already been removed
        topLevelItemCandidateIds.splice(iNode, 1);
      }
    });
  });
  return topLevelItemCandidateIds;
}

/**
 * Extracts item hierarchy structure from a Solution's items list.
 *
 * @param items Hash of JSON descriptions of items
 * @returns JSON structure reflecting dependency hierarchy of items; shared dependencies are
 * repeated; each element of the structure contains the AGOL id of an item and a list of ids of the
 * item's dependencies
 */
export function getItemHierarchy (
  items: IItemHash
): IHierarchyEntry[] {
  let hierarchy:IHierarchyEntry[] = [];

  // Find the top-level nodes. Start with all nodes, then remove those that other nodes depend on
  let topLevelItemIds = getTopLevelItemIds(items);

  // Hierarchically list the children of specified nodes
  function itemChildren(children:string[], hierarchy:IHierarchyEntry[]): void {
    // Visit each child
    children.forEach(function (id) {
      let child:IHierarchyEntry = {
        id: id,
        dependencies: []
      };

      // Fill in the child's dependencies array with any of its children
      let dependencyIds = (items[id] as IFullItem).dependencies;
      if (Array.isArray(dependencyIds) && dependencyIds.length > 0) {
        itemChildren(dependencyIds, child.dependencies);
      }

      hierarchy.push(child);
    });
  }

  itemChildren(topLevelItemIds, hierarchy);
  return hierarchy;
}