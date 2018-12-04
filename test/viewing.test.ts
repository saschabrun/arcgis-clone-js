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
 | See the License for the specific language governing permissions andn
 | limitations under the License.
 */

import * as viewing from "../src/viewing";
import { IFullItem } from "../src/fullItem";
import { IItemHash } from "../src/fullItemHierarchy";

//--------------------------------------------------------------------------------------------------------------------//

describe("Module `viewing`: supporting solution item display in AGOL", () => {

  describe("get item hierarchies", () => {

    const MOCK_ITEM_PROTOTYPE:IFullItem = {
      type: "",
      item: {}
    };

    it("item without dependencies", () => {
      // hierarchy:
      // - abc
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: []
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc
      });

      expect(results).toEqual(expected);
    });

    it("item with empty list of dependencies", () => {
      // hierarchy:
      // - abc
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";

      abc.dependencies = [];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: []
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc
      });

      expect(results).toEqual(expected);
    });

    it("item with single dependency", () => {
      // hierarchy:
      // - abc
      //   - def
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";

      abc.dependencies = ["def"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: [{
          id: "def",
          dependencies: []
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def
      });

      expect(results).toEqual(expected);
    });

    it("item with two dependencies", () => {
      // hierarchy:
      // - abc
      //   - def
      //   - ghi
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";

      abc.dependencies = ["def", "ghi"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: [{
          id: "def",
          dependencies: []
        }, {
          id: "ghi",
          dependencies: []
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi
      });

      expect(results).toEqual(expected);
    });

    it("item with two-level dependencies", () => {
      // hierarchy:
      // - abc
      //   - ghi
      //     - def
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";

      abc.dependencies = ["ghi"];
      ghi.dependencies = ["def"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: [{
          id: "ghi",
          dependencies: [{
            id: "def",
            dependencies: []
          }]
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi
      });

      expect(results).toEqual(expected);
    });

    it("two top-level items, one with two dependencies", () => {
      // hierarchy:
      // - abc
      // - jkl
      //   - ghi
      //   - def
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";
      let jkl = {...MOCK_ITEM_PROTOTYPE};
      jkl.item.id = "jkl";

      jkl.dependencies = ["ghi", "def"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: []
      }, {
        id: "jkl",
        dependencies: [{
          id: "ghi",
          dependencies: []
        }, {
          id: "def",
          dependencies: []
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi,
        "jkl": jkl
      });

      expect(results).toEqual(expected);
    });

    it("two top-level items with the same two dependencies", () => {
      // hierarchy:
      // - abc
      //   - def
      //   - ghi
      // - jkl
      //   - ghi
      //   - def
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";
      let jkl = {...MOCK_ITEM_PROTOTYPE};
      jkl.item.id = "jkl";

      abc.dependencies = ["def", "ghi"];
      jkl.dependencies = ["ghi", "def"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: [{
          id: "def",
          dependencies: []
        }, {
          id: "ghi",
          dependencies: []
        }]
      }, {
        id: "jkl",
        dependencies: [{
          id: "ghi",
          dependencies: []
        }, {
          id: "def",
          dependencies: []
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi,
        "jkl": jkl
      });

      expect(results).toEqual(expected);
    });

    it("three top-level items, one with two dependencies, one with three-level dependencies", () => {
      // hierarchy:
      // - def
      //   - mno
      //     - abc
      // - jkl
      // - pqr
      //   - ghi
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";
      let jkl = {...MOCK_ITEM_PROTOTYPE};
      jkl.item.id = "jkl";
      let mno = {...MOCK_ITEM_PROTOTYPE};
      mno.item.id = "mno";
      let pqr = {...MOCK_ITEM_PROTOTYPE};
      pqr.item.id = "pqr";

      pqr.dependencies = ["ghi"];
      mno.dependencies = ["abc"];
      def.dependencies = ["mno"];

      let expected:viewing.IHierarchyEntry[] = [{
        id: "def",
        dependencies: [{
          id: "mno",
          dependencies: [{
            id: "abc",
            dependencies: []
          }]
        }]
      }, {
        id: "jkl",
        dependencies: []
      }, {
        id: "pqr",
        dependencies: [{
          id: "ghi",
          dependencies: []
        }]
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi,
        "jkl": jkl,
        "mno": mno,
        "pqr": pqr
      });

      expect(results).toEqual(expected);
    });

    it("only top-level items--no dependencies", () => {
      // hierarchy:
      // - abc
      // - jkl
      // - ghi
      // - def
      let abc = {...MOCK_ITEM_PROTOTYPE};
      abc.item.id = "abc";
      let def = {...MOCK_ITEM_PROTOTYPE};
      def.item.id = "def";
      let ghi = {...MOCK_ITEM_PROTOTYPE};
      ghi.item.id = "ghi";
      let jkl = {...MOCK_ITEM_PROTOTYPE};
      jkl.item.id = "jkl";

      let expected:viewing.IHierarchyEntry[] = [{
        id: "abc",
        dependencies: []
      }, {
        id: "def",
        dependencies: []
      }, {
        id: "ghi",
        dependencies: []
      }, {
        id: "jkl",
        dependencies: []
      }];

      let results:viewing.IHierarchyEntry[] = viewing.getItemHierarchy({
        "abc": abc,
        "def": def,
        "ghi": ghi,
        "jkl": jkl
      });

      expect(results).toEqual(expected);
    });

  });

});