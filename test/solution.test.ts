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

import * as fetchMock from "fetch-mock";
import { CustomArrayLikeMatchers, CustomMatchers } from './customMatchers';

import * as solution from "../src/solution";
import { IFullItem } from "../src/fullItem";


import { ItemFailResponse, ItemDataOrResourceFailResponse,
  ItemSuccessResponseWMAWithoutUndesirableProps,
  ItemResourcesSuccessResponseNone, ItemResourcesSuccessResponseOne,
  ItemSuccessResponseDashboard, ItemDataSuccessResponseDashboard,
  ItemSuccessResponseWebmap, ItemDataSuccessResponseWebmap,
  ItemSuccessResponseWMA, ItemDataSuccessResponseWMA,
  ItemSuccessResponseService, ItemDataSuccessResponseService,
  ItemSuccessResponseGroup
} from "./mocks/fullItemQueries";
import { FeatureServiceSuccessResponse,
  FeatureServiceLayer0SuccessResponse, FeatureServiceLayer1SuccessResponse
} from "./mocks/featureService";
import { SolutionWMA, SolutionEmptyGroup } from "./mocks/solutions";

import { UserSession } from "@esri/arcgis-rest-auth";
import { IUserRequestOptions } from "@esri/arcgis-rest-auth";
import { TOMORROW } from "./lib/utils";

//--------------------------------------------------------------------------------------------------------------------//

describe("Module `solution`: generation, publication, and cloning of a solution item", () => {

  const MOCK_ITEM_PROTOTYPE:IFullItem = {
    type: "",
    item: null
  };

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;  // default is 5000 ms

  // Set up a UserSession to use in all these tests
  const MOCK_USER_SESSION = new UserSession({
    clientId: "clientId",
    redirectUri: "https://example-app.com/redirect-uri",
    token: "fake-token",
    tokenExpires: TOMORROW,
    refreshToken: "refreshToken",
    refreshTokenExpires: TOMORROW,
    refreshTokenTTL: 1440,
    username: "casey",
    password: "123456",
    portal: "https://myorg.maps.arcgis.com/sharing/rest"
  });

  const MOCK_USER_REQOPTS:IUserRequestOptions = {
    authentication: MOCK_USER_SESSION
  };

  beforeEach(() => {
    jasmine.addMatchers(CustomMatchers);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  describe("create solution", () => {

    it("for single item containing WMA & feature service", done => {
      let baseSvcURL = "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/";
      fetchMock
      .mock("path:/sharing/rest/content/items/wma1234567890", ItemSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/data", ItemDataSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .mock("path:/sharing/rest/content/items/map1234567890", ItemSuccessResponseWebmap, {})
      .mock("path:/sharing/rest/content/items/map1234567890/data", ItemDataSuccessResponseWebmap, {})
      .mock("path:/sharing/rest/content/items/map1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .mock("path:/sharing/rest/content/items/svc1234567890", ItemSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/data", ItemDataSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/resources", ItemResourcesSuccessResponseNone, {})
      .post(baseSvcURL + "FeatureServer?f=json", FeatureServiceSuccessResponse)
      .post(baseSvcURL + "FeatureServer/0?f=json", FeatureServiceLayer0SuccessResponse)
      .post(baseSvcURL + "FeatureServer/1?f=json", FeatureServiceLayer1SuccessResponse)
      solution.createSolution("wma1234567890", MOCK_USER_REQOPTS)
      .then(
        response => {
          expect(response).toEqual(SolutionWMA);
          done();
        },
        error => {
          done.fail(error);
        }
      );
    });

    it("for single item not containing WMA or feature service", done => {
      let baseSvcURL = "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/";
      fetchMock
      .mock("path:/sharing/rest/content/items/grp1234567890", ItemFailResponse, {})
      .mock("path:/sharing/rest/community/groups/grp1234567890", ItemSuccessResponseGroup, {})
      .mock(
        "https://myorg.maps.arcgis.com/sharing/rest/content/groups/grp1234567890" +
        "?f=json&start=0&num=100&token=fake-token",
        '{"total":0,"start":1,"num":0,"nextStart":-1,"items":[]}', {});
      solution.createSolution("grp1234567890", MOCK_USER_REQOPTS)
      .then(
        response => {
          expect(response).toEqual(SolutionEmptyGroup);
          done();
        },
        error => {
          done.fail(error);
        }
      );
    });

  });

  describe("view solution", () => {

  });

  describe("publish solution", () => {

  });

  describe("supporting routine: get cloning order", () => {

    it("sorts an item and its dependencies 1", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi", "def"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
    });

    it("sorts an item and its dependencies 2", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi", "def"];
      def.dependencies = ["ghi"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "def"});
    });

    it("sorts an item and its dependencies 3", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi"];
      ghi.dependencies = ["def"];

      let results:string[] = solution.topologicallySortItems({
        "abc": abc,
        "def": def,
        "ghi": ghi,
      });
      expect(results.length).toEqual(3);
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "ghi", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "abc"});
      (expect(results) as CustomArrayLikeMatchers).toHaveOrder({predecessor: "def", successor: "ghi"});
    });

    it("reports a multi-item cyclic dependency graph", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      abc.dependencies = ["ghi"];
      def.dependencies = ["ghi"];
      ghi.dependencies = ["abc"];

      expect(function () {
        let results:string[] = solution.topologicallySortItems({
          "abc": abc,
          "def": def,
          "ghi": ghi,
        });
      }).toThrowError(Error, "Cyclical dependency graph detected");
    });

    it("reports a single-item cyclic dependency graph", () => {
      let abc = {...MOCK_ITEM_PROTOTYPE};
      let def = {...MOCK_ITEM_PROTOTYPE};
      let ghi = {...MOCK_ITEM_PROTOTYPE};

      def.dependencies = ["def"];

      expect(function () {
        let results:string[] = solution.topologicallySortItems({
          "abc": abc,
          "def": def,
          "ghi": ghi,
        });
      }).toThrowError(Error, "Cyclical dependency graph detected");
    });

  });

  describe("supporting routine: remove undesirable properties", () => {

    it("remove properties", () => {
      let abc = {...ItemSuccessResponseWMA};

      let abcCopy = solution.removeUndesirableItemProperties(abc);
      expect(abc).toEqual(ItemSuccessResponseWMA);
      expect(abcCopy).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);
    });

    it("shallow copy if properties already removed", () => {
      let abc = {...ItemSuccessResponseWMAWithoutUndesirableProps};

      let abcCopy = solution.removeUndesirableItemProperties(abc);
      expect(abc).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);
      expect(abcCopy).toEqual(ItemSuccessResponseWMAWithoutUndesirableProps);

      abcCopy.id = "WMA123";
      expect(abc.id).toEqual("wma1234567890");
    });

    it("checks for item before attempting to access its properties", () => {
      let result = solution.removeUndesirableItemProperties(null);
      expect(result).toBeNull();
    });

  });

  describe("supporting routine: timestamp", () => {

    it("should return time 1541440408000", () => {
      let expected = 1541440408000;
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(expected));
      expect(solution.getTimestamp()).toEqual(expected.toString());
      jasmine.clock().uninstall();
    });

  });

  describe("supporting routine: update WMA URL", () => {

    let orgSession:solution.IOrgSession = {
      orgUrl: "https://myOrg.maps.arcgis.com",
      portalUrl: "https://www.arcgis.com",
      authentication: MOCK_USER_SESSION
    };

    let abc = {...MOCK_ITEM_PROTOTYPE};
    abc.item = {...ItemSuccessResponseWMA};
    abc.item.url = solution.aPlaceholderServerName + "/apps/CrowdsourcePolling/index.html?appid=";

    it("success", done => {
      fetchMock
      .post("https://myorg.maps.arcgis.com/sharing/rest/content/users/casey/items/wma1234567890/update",
      '{"success":true,"id":"wma1234567890"}');
      solution.updateWebMappingApplicationURL(abc, orgSession)
      .then(response => {
        expect(response).toEqual("wma1234567890");
        done();
      });
    });

    it("failure", done => {
      fetchMock
      .post("https://myorg.maps.arcgis.com/sharing/rest/content/users/casey/items/wma1234567890/update",
      "Unable to update web mapping app: wma1234567890");
      solution.updateWebMappingApplicationURL(abc, orgSession)
      .then(
        fail,
        error => {
          expect(error).toEqual("Unable to update web mapping app: wma1234567890");
          done();
        }
      );
    });

  });

});
