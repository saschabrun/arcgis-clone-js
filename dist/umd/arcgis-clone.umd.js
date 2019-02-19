/* @preserve
* arcgis-clone-js - v0.4.0 - Apache-2.0
* Copyright (c) 2018-2019 Esri, Inc.
* Tue Feb 19 2019 09:02:14 GMT-0800 (Pacifique)
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.arcgisClone = global.arcgisClone || {})));
}(this, (function (exports) { 'use strict';

  /*    Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */

  /**
   * Return the value of a deep property, using a path.
   */
  const getWithDefault = (obj, path, defaultValue = undefined) => path
    .split('.')
    .reduce((o, p) => o ? o[p] : defaultValue, obj);

  /*    Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */

  /**
   * Simply Map over the props of an object
   */
  function mapValues (obj, fn) {
    let keys = Object.keys(obj);
    // console.info(`keys: ${keys}`);
    var newObject = keys.reduce(function(acc, currentKey) {
      // console.log(`   acc: ${JSON.stringify(acc)} curKey: ${currentKey}`);
      acc[currentKey] = fn(obj[currentKey], currentKey, obj);
      return acc;
    }, {});
    // console.info(`  output: ${JSON.stringify(newObject)}`);
    return newObject;
  }

  /*    Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */

  const isDate = (v) => v instanceof Date;

  const isFunction = (v) => typeof v === 'function';

  const isObject = (v) => typeof v === 'object';

  const isRegExp = (v) => v instanceof RegExp;

  function deepMapValues(object, callback, propertyPath) {
    propertyPath = propertyPath || '';
    if(Array.isArray(object)){
      return object.map(deepMapValuesIteratee);
    }
    else if(object && isObject(object) && !isDate(object) && !isRegExp(object) && !isFunction(object)){
      return Object.assign({}, object, mapValues(object, deepMapValuesIteratee));
    }
    else {
      let output = callback(object, propertyPath);
      return output;
    }

    function deepMapValuesIteratee(value, key){
      var valuePath = propertyPath ? propertyPath + '.' + key : key;
      return deepMapValues(value, callback, valuePath);
    }
  }

  /*    Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */

  const isObject$1 = (v) => typeof v === 'object';

  /**
   * Trim a tree decorated with `{{delete:NNN}}`
   */
  function arborist (object, propertyPath) {
    propertyPath = propertyPath || '';

    if(Array.isArray(object)){
      // filter out any nulls...
      let arrResults = object.map(iteratee).filter((entry) => {
        // need to ensure entry is actually NULL vs just falsey
        return entry !== null && entry !== undefined;
      });
      return pruneArray(arrResults);

    } if(object && isObject$1(object) ) {

      return pruneObject(mapValues(object, iteratee));

    } else {

      return getPropertyValue(object, propertyPath);
    }

    function iteratee(value, key){
      var valuePath = propertyPath ? propertyPath + '.' + key: key;
      return arborist(value, valuePath);
    }
  }

  /**
   * Prune an array
   * For all the entries in the array...
   *    if the entry is a naked string and contains `{{delete:NNN}}`
   *      get maximum NNN value
   *    then
   *      if maxN === 0
   *        return an empty array
   *      if maxN > 0
   *        return `{{delete:maxN-1}}`
   *    else
   *      return array
   */
  function pruneArray (arrResults) {
    let res = arrResults;
    // is any entry a string w/ {{delete}}?
    let maxLevel = arrResults.reduce((maxLevel, e) => {
      if (isString(e) && hasDelete(e)) {
        let lvl = getLevel(e);
        if (lvl > maxLevel) {
          maxLevel = lvl;
        }
      }
      return maxLevel;
    }, -1);

    if (maxLevel > -1) {
      if (maxLevel === 0) {
        res = [];
      } else {
        res = `{{delete:${maxLevel - 1}}}`;
      }
    }

    return res;
  }


  function pruneObject (objResults) {
    // console.log(`   pruneObject:: working on ${JSON.stringify(objResults)}`);
    let startVal = {obj: {}, maxLevel: -1 };
    let res;
    // cook a new clone object, and track the maxLevel
    let reduction = Object.keys(objResults).reduce((acc, key) => {
      let val = objResults[key];
      if (isString(val) && hasDelete(val)) {
        let lvl = getLevel(val);
        if (lvl > acc.maxLevel) {
          acc.maxLevel = lvl;
        }
      } else {
        // only add the prop if it's not a `{{delete:NNN}}`
        acc.obj[key] = val;
      }
      return acc;
    }, startVal);
    // if -1, we return entire object...
    // if 0 we just remove the prop...
    // if 1 we return undefined...
    // if > 1 we return the deleteVal
    if (reduction.maxLevel > 0 ) {
      if (reduction.maxLevel === 1) {
        res = undefined;
      } else {
        res = `{{delete:${reduction.maxLevel - 1}}}`;
      }
    } else {
      res = reduction.obj;
    }

    // console.log(`     returning ${JSON.stringify(res)}`);
    return res;
  }

  /**
   * Get a value for a property, handling the `{{delete:NNN}}` syntax
   */
  function getPropertyValue (val){
    let output = val;

    if (typeof val === 'string') {
      if (hasDelete(val)) {
        output = getDeleteValue(val);
      }
    }
    return output;
  }

  /**
   * Given a string with `{{delete:NNN}}`
   * if NNN === 0 return undefined
   * else return `{{delete:NNN - 1}}`
   */
  function getDeleteValue (val) {
    let output = val;
    let level = getLevel(val);
    if (level === 0) {
      output = undefined;
    } else {
      output = `{{delete:${level}}}`;
    }
    return output;
  }

  /**
   * Extract the level from a `{{delete:NNN}}`
   */
  const getLevel = (value) => parseInt(value.replace(/{|}/g, '').split(':')[1]);

  /**
   * Simple check if a value has `{{delete` in it
   */
  function hasDelete (value) {
    if (value && typeof value === 'string') {
      return value.indexOf('{{delete') > -1;
    } else {
      return false;
    }
  }

  const isString = (v) => typeof v === 'string';

  /*   Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */

  /**
   * Optional Transform
   * Supports a declarative syntax for optional template properties
   *
   * {{some.object.key:optional:2}}
   *
   * In this example, if defined, the value of `some.object.key` is used.
   * If not defined, then the optional transform is utilized
   * and a post-processing step is executed which will remove two parent levels
   * from the output structure
   */

  function optionalTransform(key, value, settings, level = 0) {
    // console.log(`optional: ${key}, ${value}, ${level}`);
    let val = value;
    if (!value) {
      val = `{{delete:${level}}}`;
    }
    return val;
  }

  /*    Copyright (c) 2017-2019 Esri Inc.
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at
         http://www.apache.org/licenses/LICENSE-2.0
     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License. */
  const HANDLEBARS = /{{\s*?[\w].*?}}/g;

  const isString$1 = (v) => typeof v === 'string';

  function _swap(parameter, settings, transforms) {
    let value;
    // console.info(`_swap: param: ${parameter}`);
    // Parameters can optionally call transform functions
    // e.g. "{{ipsum:translateLatin}}"
    // so extract {{<parameter>:<transformFunction>:<key||value>}}
    let transformCheck = parameter.split(':');
    if (transformCheck.length > 1) {
      // we have a request to use a transform...
      let key = transformCheck[0];
      let fn = transformCheck[1];
      // we default to using the value...
      let param = null;
      if (transformCheck[2]){
        param = transformCheck[2];
      }
      if(transforms && transforms[fn] && typeof transforms[fn] === 'function') {
        // get the value from the param
        value = getWithDefault(settings, key);
        // transform it...
        value = transforms[fn](key, value, settings, param);
      } else {
        throw new Error(`Attempted to apply non-existant transform ${fn} on ${key} with params ${parameter}`);
      }
    } else {
      // we just get the value
      value = getWithDefault(settings, parameter);
    }
    return value;
  }

  /**
   * Does a propertyPath exist on a target
   */
  function _propertyPathExists (propertyPath, target) {
    // remove any transforms
    let cleanPath = propertyPath.split(':')[0];
    let value = getWithDefault(target, cleanPath, null);
    if (value !== null && value !== undefined) {
      return true;
    } else {
      return false;
    }
  }

  // Combine a Template with Settings
  function adlib (template, settings, transforms = null) {
    transforms = transforms || {};
    if (transforms.optional) {
      throw new Error('Please do not pass in an `optional` transform; adlib provides that internally.');
    } else {
      transforms.optional = optionalTransform;
    }

    let res = deepMapValues(template, function(templateValue, templatePath){
      // Only string templates
      if (!isString$1(templateValue)) {
        return templateValue;
      }

      // When we match "{{layer.fields..}}"
      var settingsValue;

      let hbsEntries = templateValue.match(HANDLEBARS);

      if (hbsEntries && hbsEntries.length) {
        // console.log(`Got a ${hbsEntries.length} handlebar entries...`);
        let isStaticValue = false;
        // iterate over the entries...
        let values = hbsEntries.map((entry) => {
          // console.info(`Matched ${entry}...`);
          // strip off the curlies and trim any leading/trailing whitespace...
          let path = entry.replace(/{|}/g, '').trim();
          // check for || which indicate a hiearchy
          if (path.indexOf('||') > -1) {
            var paths = path.split('||').map(path => path.trim());
            let numberOfPaths = paths.length;
            // here we check each option, in order, and return the first with a value in the hash, OR the last
            path = paths.find((pathOption, idx) => {
              // console.info(`Checking to see if ${pathOption} is in settings hash...`);
              let exists = _propertyPathExists(pathOption, settings);
              if (!exists) {
                if ((idx + 1) === numberOfPaths) {
                  // console.info(`Got to last entry, and still did not find anything... assuming ${pathOption} is a static value...`);
                  isStaticValue = true;
                  // check if we can convert this into a number...
                  if (!isNaN(pathOption)) {
                    pathOption = parseInt(pathOption);
                  }
                  return pathOption;
                } else {
                  return false;
                }
              } else {
                return pathOption;
              }
            });
          }
          // setup the return value...
          let result = {
            key: entry,
            value: path
          };
          // if we have a valid object path, value comes from _swap
          if (!isStaticValue) {
            result.value = _swap(path, settings, transforms) || entry;
          }
          // console.info(`Value: ${JSON.stringify(result)}`);
          return result;
        });

        values.forEach((v) => {
          // console.log(`Comparing ${templateValue} with ${v.key}`)
          if (templateValue === v.key) {
            // console.log(`template matches key, returning ${v.value}`);
            // if the value is a string...
            if (typeof v.value === 'string') {
              // and it's numeric-ish
              if(!isNaN(v.value)) {
                // and has a . in it...
                if (v.value.indexOf('.') > -1) {
                  // parse as a float...
                  v.value = parseFloat(v.value);
                } else {
                  // parse as an int
                  v.value = parseInt(v.value);
                }
              }
            }
            settingsValue = v.value;
          } else {
            // a little extra regex dance to match the '||' because '|'
            // is a Very Special Regex Character and we need to super
            // escape them for the regex to work
            // console.log(`KEY ${v.key}`);
            // console.log(`TEMPLATE ${templateValue}`);
            templateValue = templateValue.replace(v.key, v.value);
            // console.log(`template did not match key, interpolating value ${v.value} into template to produce ${templateValue}`);
          }
        });

        // if we have a value, let's return that...
        if (settingsValue) {
          // console.log(`We found a value so we return it ${settingsValue}`);
          return settingsValue;
        } else {
          // console.log(`We did not find a value so we return the template ${templateValue}`);
          // but if we don't, lets return the template itself
          return templateValue;
        }
      } else {
        // console.log(`We did not find a hbs match, so we return the template ${templateValue}`);
        // no match, return the templateValue...
        return templateValue;
      }
    });
    return arborist(res);
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
          function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
      return extendStatics(d, b);
  };

  function __extends(d, b) {
      extendStatics(d, b);
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
  * Apache-2.0 */
  /**
   * Checks parameters to see if we should use FormData to send the request
   * @param params The object whose keys will be encoded.
   * @return A boolean indicating if FormData will be required.
   */
  function requiresFormData(params) {
      return Object.keys(params).some(function (key) {
          var value = params[key];
          if (!value) {
              return false;
          }
          var type = value.constructor.name;
          switch (type) {
              case "Array":
                  return false;
              case "Object":
                  return false;
              case "Date":
                  return false;
              case "Function":
                  return false;
              case "Boolean":
                  return false;
              case "String":
                  return false;
              case "Number":
                  return false;
              default:
                  return true;
          }
      });
  }
  /**
   * Converts parameters to the proper representation to send to the ArcGIS REST API.
   * @param params The object whose keys will be encoded.
   * @return A new object with properly encoded values.
   */
  function processParams(params) {
      var newParams = {};
      Object.keys(params).forEach(function (key) {
          var param = params[key];
          if (!param &&
              param !== 0 &&
              typeof param !== "boolean" &&
              typeof param !== "string") {
              return;
          }
          var type = param.constructor.name;
          var value;
          // properly encodes objects, arrays and dates for arcgis.com and other services.
          // ported from https://github.com/Esri/esri-leaflet/blob/master/src/Request.js#L22-L30
          // also see https://github.com/Esri/arcgis-rest-js/issues/18:
          // null, undefined, function are excluded. If you want to send an empty key you need to send an empty string "".
          switch (type) {
              case "Array":
                  // Based on the first element of the array, classify array as an array of objects to be stringified
                  // or an array of non-objects to be comma-separated
                  value =
                      param[0] &&
                          param[0].constructor &&
                          param[0].constructor.name === "Object"
                          ? JSON.stringify(param)
                          : param.join(",");
                  break;
              case "Object":
                  value = JSON.stringify(param);
                  break;
              case "Date":
                  value = param.valueOf();
                  break;
              case "Function":
                  value = null;
                  break;
              case "Boolean":
                  value = param + "";
                  break;
              default:
                  value = param;
                  break;
          }
          if (value || value === 0 || typeof value === "string") {
              newParams[key] = value;
          }
      });
      return newParams;
  }

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  function encodeParam(key, value) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(value);
  }
  /**
   * Encodes the passed object as a query string.
   *
   * @param params An object to be encoded.
   * @returns An encoded query string.
   */
  function encodeQueryString(params) {
      var newParams = processParams(params);
      return Object.keys(newParams)
          .map(function (key) {
          return encodeParam(key, newParams[key]);
      })
          .join("&");
  }

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Encodes parameters in a [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) object in browsers or in a [FormData](https://github.com/form-data/form-data) in Node.js
   *
   * @param params An object to be encoded.
   * @returns The complete [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) object.
   */
  function encodeFormData(params) {
      var useFormData = requiresFormData(params);
      var newParams = processParams(params);
      if (useFormData) {
          var formData_1 = new FormData();
          Object.keys(newParams).forEach(function (key) {
              if (typeof Blob !== "undefined" && newParams[key] instanceof Blob) {
                  /* To name the Blob:
                   1. look to an alternate request parameter called 'fileName'
                   2. see if 'name' has been tacked onto the Blob manually
                   3. if all else fails, use the request parameter
                  */
                  var filename = newParams["fileName"] || newParams[key].name || key;
                  formData_1.append(key, newParams[key], filename);
              }
              else {
                  formData_1.append(key, newParams[key]);
              }
          });
          return formData_1;
      }
      else {
          return encodeQueryString(params);
      }
  }

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  // TypeScript 2.1 no longer allows you to extend built in types. See https://github.com/Microsoft/TypeScript/issues/12790#issuecomment-265981442
  // and https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
  //
  // This code is from MDN https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types.
  var ArcGISRequestError = /** @class */ (function () {
      /**
       * Create a new `ArcGISRequestError`  object.
       *
       * @param message - The error message from the API
       * @param code - The error code from the API
       * @param response - The original response from the API that caused the error
       * @param url - The original url of the request
       * @param options - The original options and parameters of the request
       */
      function ArcGISRequestError(message, code, response, url, options) {
          message = message || "UNKNOWN_ERROR";
          code = code || "UNKNOWN_ERROR_CODE";
          this.name = "ArcGISRequestError";
          this.message =
              code === "UNKNOWN_ERROR_CODE" ? message : code + ": " + message;
          this.originalMessage = message;
          this.code = code;
          this.response = response;
          this.url = url;
          this.options = options;
      }
      return ArcGISRequestError;
  }());
  ArcGISRequestError.prototype = Object.create(Error.prototype);
  ArcGISRequestError.prototype.constructor = ArcGISRequestError;

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  var NODEJS_DEFAULT_REFERER_HEADER = "@esri/arcgis-rest-js";
  /**
   * ```js
   * import { request } from '@esri/arcgis-rest-request';
   * //
   * request('https://www.arcgis.com/sharing/rest')
   *   .then(response) // response.currentVersion === 5.2
   * //
   * request('https://www.arcgis.com/sharing/rest', {
   *   httpMethod: "GET"
   * })
   * //
   * request('https://www.arcgis.com/sharing/rest/search', {
   *   params: { q: 'parks' }
   * })
   *   .then(response) // response.total => 78379
   * ```
   * Generic method for making HTTP requests to ArcGIS REST API endpoints.
   *
   * @param url - The URL of the ArcGIS REST API endpoint.
   * @param requestOptions - Options for the request, including parameters relevant to the endpoint.
   * @returns A Promise that will resolve with the data from the response.
   */
  function request(url, requestOptions) {
      if (requestOptions === void 0) { requestOptions = { params: { f: "json" } }; }
      var options = __assign({ httpMethod: "POST" }, requestOptions);
      var missingGlobals = [];
      var recommendedPackages = [];
      // don't check for a global fetch if a custom implementation was passed through
      if (!options.fetch && typeof fetch !== "undefined") {
          options.fetch = fetch.bind(Function("return this")());
      }
      else {
          missingGlobals.push("`fetch`");
          recommendedPackages.push("`isomorphic-fetch`");
      }
      if (typeof Promise === "undefined") {
          missingGlobals.push("`Promise`");
          recommendedPackages.push("`es6-promise`");
      }
      if (typeof FormData === "undefined") {
          missingGlobals.push("`FormData`");
          recommendedPackages.push("`isomorphic-form-data`");
      }
      if (!options.fetch ||
          typeof Promise === "undefined" ||
          typeof FormData === "undefined") {
          throw new Error("`arcgis-rest-request` requires global variables for `fetch`, `Promise` and `FormData` to be present in the global scope. You are missing " + missingGlobals.join(", ") + ". We recommend installing the " + recommendedPackages.join(", ") + " modules at the root of your application to add these to the global scope. See https://bit.ly/2KNwWaJ for more info.");
      }
      var httpMethod = options.httpMethod, authentication = options.authentication;
      var params = __assign({ f: "json" }, requestOptions.params);
      var fetchOptions = {
          method: httpMethod,
          // ensures behavior mimics XMLHttpRequest. needed to support sending IWA cookies
          credentials: "same-origin"
      };
      return (authentication
          ? authentication.getToken(url, {
              fetch: options.fetch
          })
          : Promise.resolve(""))
          .then(function (token) {
          if (token.length) {
              params.token = token;
          }
          if (fetchOptions.method === "GET") {
              // encode the parameters into the query string
              var queryParams = encodeQueryString(params);
              // dont append a '?' unless parameters are actually present
              var urlWithQueryString = queryParams === "" ? url : url + "?" + encodeQueryString(params);
              if (options.maxUrlLength &&
                  urlWithQueryString.length > options.maxUrlLength) {
                  // the consumer specified a maximum length for URLs
                  // and this would exceed it, so use post instead
                  fetchOptions.method = "POST";
              }
              else {
                  // just use GET
                  url = urlWithQueryString;
              }
          }
          if (fetchOptions.method === "POST") {
              fetchOptions.body = encodeFormData(params);
          }
          // Mixin headers from request options
          fetchOptions.headers = __assign({}, requestOptions.headers);
          /* istanbul ignore next - karma reports coverage on browser tests only */
          if (typeof window === "undefined" && !fetchOptions.headers.referer) {
              fetchOptions.headers.referer = NODEJS_DEFAULT_REFERER_HEADER;
          }
          /* istanbul ignore else blob responses are difficult to make cross platform we will just have to trust the isomorphic fetch will do its job */
          if (!requiresFormData(params)) {
              fetchOptions.headers["Content-Type"] =
                  "application/x-www-form-urlencoded";
          }
          return options.fetch(url, fetchOptions);
      })
          .then(function (response) {
          if (!response.ok) {
              // server responded w/ an actual error (404, 500, etc)
              var status_1 = response.status, statusText = response.statusText;
              throw new ArcGISRequestError(statusText, "HTTP " + status_1, response, url, options);
          }
          switch (params.f) {
              case "json":
                  return response.json();
              case "geojson":
                  return response.json();
              case "html":
                  return response.text();
              case "text":
                  return response.text();
              /* istanbul ignore next blob responses are difficult to make cross platform we will just have to trust that isomorphic fetch will do its job */
              default:
                  return response.blob();
          }
      })
          .then(function (data) {
          if (params.f === "json" || params.f === "geojson") {
              return checkForErrors(data, url, params, options);
          }
          else {
              return data;
          }
      });
  }
  var ArcGISAuthError = /** @class */ (function (_super) {
      __extends(ArcGISAuthError, _super);
      /**
       * Create a new `ArcGISAuthError`  object.
       *
       * @param message - The error message from the API
       * @param code - The error code from the API
       * @param response - The original response from the API that caused the error
       * @param url - The original url of the request
       * @param options - The original options of the request
       */
      function ArcGISAuthError(message, code, response, url, options) {
          if (message === void 0) { message = "AUTHENTICATION_ERROR"; }
          if (code === void 0) { code = "AUTHENTICATION_ERROR_CODE"; }
          var _this = _super.call(this, message, code, response, url, options) || this;
          _this.name = "ArcGISAuthError";
          _this.message =
              code === "AUTHENTICATION_ERROR_CODE" ? message : code + ": " + message;
          return _this;
      }
      ArcGISAuthError.prototype.retry = function (getSession, retryLimit) {
          var _this = this;
          if (retryLimit === void 0) { retryLimit = 3; }
          var tries = 0;
          var retryRequest = function (resolve, reject) {
              getSession(_this.url, _this.options)
                  .then(function (session) {
                  var newOptions = __assign({}, _this.options, { authentication: session });
                  tries = tries + 1;
                  return request(_this.url, newOptions);
              })
                  .then(function (response) {
                  resolve(response);
              })
                  .catch(function (e) {
                  if (e.name === "ArcGISAuthError" && tries < retryLimit) {
                      retryRequest(resolve, reject);
                  }
                  else if (e.name === "ArcGISAuthError" && tries >= retryLimit) {
                      reject(_this);
                  }
                  else {
                      reject(e);
                  }
              });
          };
          return new Promise(function (resolve, reject) {
              retryRequest(resolve, reject);
          });
      };
      return ArcGISAuthError;
  }(ArcGISRequestError));
  /**
   * Checks for errors in a JSON response from the ArcGIS REST API. If there are no errors, it will return the `data` passed in. If there is an error, it will throw an `ArcGISRequestError` or `ArcGISAuthError`.
   *
   * @param data The response JSON to check for errors.
   * @param url The url of the original request
   * @param params The parameters of the original request
   * @param options The options of the original request
   * @returns The data that was passed in the `data` parameter
   */
  function checkForErrors(response, url, params, options) {
      // this is an error message from billing.arcgis.com backend
      if (response.code >= 400) {
          var message = response.message, code = response.code;
          throw new ArcGISRequestError(message, code, response, url, options);
      }
      // error from ArcGIS Online or an ArcGIS Portal or server instance.
      if (response.error) {
          var _a = response.error, message = _a.message, code = _a.code, messageCode = _a.messageCode;
          var errorCode = messageCode || code || "UNKNOWN_ERROR_CODE";
          if (code === 498 || code === 499 || messageCode === "GWM_0003") {
              throw new ArcGISAuthError(message, errorCode, response, url, options);
          }
          throw new ArcGISRequestError(message, errorCode, response, url, options);
      }
      // error from a status check
      if (response.status === "failed" || response.status === "failure") {
          var message = void 0;
          var code = "UNKNOWN_ERROR_CODE";
          try {
              message = JSON.parse(response.statusMessage).message;
              code = JSON.parse(response.statusMessage).code;
          }
          catch (e) {
              message = response.statusMessage || response.message;
          }
          throw new ArcGISRequestError(message, code, response, url, options);
      }
      return response;
  }

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Enum describing the different errors that might be thrown by a request.
   *
   * ```ts
   * import { request, ErrorTypes } from '@esri/arcgis-rest-request';
   *
   * request("...").catch((e) => {
   *   switch(e.name) {
   *     case ErrorType.ArcGISRequestError:
   *     // handle a general error from the API
   *     break;
   *
   *     case ErrorType.ArcGISAuthError:
   *     // handle an authentication error
   *     break;
   *
   *     default:
   *     // handle some other error (usually a network error)
   *   }
   * });
   * ```
   */
  var ErrorTypes;
  (function (ErrorTypes) {
      ErrorTypes["ArcGISRequestError"] = "ArcGISRequestError";
      ErrorTypes["ArcGISAuthError"] = "ArcGISAuthError";
  })(ErrorTypes || (ErrorTypes = {}));

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Helper method to ensure that user supplied urls don't include whitespace or a trailing slash.
   */
  function cleanUrl(url) {
      // trim leading and trailing spaces, but not spaces inside the url
      url = url.trim();
      // remove the trailing slash to the url if one was included
      if (url[url.length - 1] === "/") {
          url = url.slice(0, -1);
      }
      return url;
  }

  /**
   * Helper that returns the appropriate portal url for a given request. `requestOptions.portal` is given
   * precedence over `authentication.portal`. If neither are present, `www.arcgis.com/sharing/rest` is returned.
   *
   * @param requestOptions - Request options that may have authentication manager
   * @returns Portal url to be used in API requests
   */
  function getPortalUrl(requestOptions) {
      if (requestOptions === void 0) { requestOptions = {}; }
      // use portal in options if specified
      if (requestOptions.portal) {
          return cleanUrl(requestOptions.portal);
      }
      // if auth was passed, use that portal
      if (requestOptions.authentication) {
          // the portal url is already scrubbed in the auth package
          return requestOptions.authentication.portal;
      }
      // default to arcgis.com
      return "https://www.arcgis.com/sharing/rest";
  }

  /* Copyright (c) 2017 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Serialize an item into a json format accepted by the Portal API
   * for create and update operations
   *
   * @param item Item to be serialized
   * @returns a formatted json object to be sent to Portal
   */
  function serializeItem(item) {
      // create a clone so we're not messing with the original
      var clone = JSON.parse(JSON.stringify(item));
      // join keywords and tags...
      var _a = item.typeKeywords, typeKeywords = _a === void 0 ? [] : _a, _b = item.tags, tags = _b === void 0 ? [] : _b;
      clone.typeKeywords = typeKeywords.join(", ");
      clone.tags = tags.join(", ");
      // convert .data to .text
      if (clone.data) {
          clone.text = JSON.stringify(clone.data);
          delete clone.data;
      }
      // Convert properties to a string
      if (clone.properties) {
          clone.properties = JSON.stringify(clone.properties);
      }
      return clone;
  }
  /**
   * requestOptions.owner is given priority, requestOptions.item.owner will be checked next. If neither are present, authentication.username will be assumed.
   */
  function determineOwner(requestOptions) {
      if (requestOptions.owner) {
          return requestOptions.owner;
      }
      if (requestOptions.item && requestOptions.item.owner) {
          return requestOptions.item.owner;
      }
      else {
          return requestOptions.authentication.username;
      }
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { createFolder } from '@esri/arcgis-rest-items';
   * //
   * createFolder({
   *   title: 'Map Collection',
   *   authentication: userSession
   * })
   *   .then(response)
   * ```
   * Create a folder. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/create-folder.htm) for more information.
   *
   * @param requestOptions - Options for the request
   * @returns A Promise that resolves with folder details once the folder has been created
   */
  function createFolder(requestOptions) {
      var owner = determineOwner(requestOptions);
      var baseUrl = getPortalUrl(requestOptions) + "/content/users/" + owner;
      var url = baseUrl + "/createFolder";
      requestOptions.params = __assign({ title: requestOptions.title }, requestOptions.params);
      return request(url, requestOptions);
  }
  /**
   * ```js
   * import { createItemInFolder } from '@esri/arcgis-rest-items';
   * //
   * createItem({
   *   item: {
   *     title: "The Amazing Voyage",
   *     type: "Web Map",
   *     data: {}
   *   },
   *   folder: 'underwater',
   *   authentication
   * })
   * ```
   * Create an item in a folder. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/add-item.htm) for more information.
   *
   * @param requestOptions = Options for the request
   */
  function createItemInFolder(requestOptions) {
      var owner = determineOwner(requestOptions);
      var baseUrl = getPortalUrl(requestOptions) + "/content/users/" + owner;
      var url = baseUrl + "/addItem";
      if (requestOptions.folder) {
          url = baseUrl + "/" + requestOptions.folder + "/addItem";
      }
      // serialize the item into something Portal will accept
      requestOptions.params = __assign({}, requestOptions.params, serializeItem(requestOptions.item));
      return request(url, requestOptions);
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Get an item by id. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/item.htm) for more information.
   *
   * @param id - Item Id
   * @param requestOptions - Options for the request
   * @returns A Promise that will resolve with the data from the response.
   */
  function getItem(id, requestOptions) {
      var url = getPortalUrl(requestOptions) + "/content/items/" + id;
      // default to a GET request
      var options = __assign({ httpMethod: "GET" }, requestOptions);
      return request(url, options);
  }
  /**
   * Get the /data for an item. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/item-data.htm) for more information.
   * @param id - Item Id
   * @param requestOptions - Options for the request
   * @returns A Promise that will resolve with the json data for the item.
   */
  function getItemData(id, requestOptions) {
      var url = getPortalUrl(requestOptions) + "/content/items/" + id + "/data";
      // default to a GET request
      var options = __assign({ httpMethod: "GET", params: {} }, requestOptions);
      if (options.file) {
          options.params.f = null;
      }
      return request(url, options);
  }
  /**
   * Get the resources associated with an item
   *
   * @param requestOptions - Options for the request
   * @returns A Promise to get some item resources.
   */
  function getItemResources(requestOptions) {
      var url = getPortalUrl(requestOptions) + "/content/items/" + requestOptions.id + "/resources";
      // mix in user supplied params
      requestOptions.params = __assign({}, requestOptions.params, { num: 1000 });
      // at v2, the argument signature of this method should match getItemData() and getItemGroups() if requests can be made anonymously
      return request(url, requestOptions);
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { updateItem } from '@esri/arcgis-rest-items';
   * //
   * updateItem({
   *   item: {
   *     id: "3ef",
   *     description: "A three hour tour"
   *   },
   *   authentication
   * })
   *   .then(response)
   * ```
   * Update an Item. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/update-item.htm) for more information.
   *
   * @param item - The item to update.
   * @param requestOptions - Options for the request.
   * @returns A Promise that updates an item.
   */
  function updateItem(requestOptions) {
      var owner = determineOwner(requestOptions);
      var url = getPortalUrl(requestOptions) + "/content/users/" + owner + "/items/" + requestOptions.item.id + "/update";
      // serialize the item into something Portal will accept
      requestOptions.params = __assign({}, requestOptions.params, serializeItem(requestOptions.item));
      return request(url, requestOptions);
  }
  /**
   * ```js
   * import { moveItem } from '@esri/arcgis-rest-items';
   * //
   * moveItem({
   *   itemId: "3ef",
   *   folderId: "7c5",
   *   authentication: userSession
   * })
   * ```
   * Move an item to a folder. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/move-item.htm) for more information.
   *
   * @param requestOptions - Options for the request
   * @returns A Promise that resolves with owner and folder details once the move has been completed
   */
  function moveItem(requestOptions) {
      var owner = determineOwner(requestOptions);
      var url = getPortalUrl(requestOptions) + "/content/users/" + owner + "/items/" + requestOptions.itemId + "/move";
      var folderId = requestOptions.folderId;
      if (!folderId) {
          folderId = "/";
      }
      requestOptions.params = __assign({ folder: folderId }, requestOptions.params);
      return request(url, requestOptions);
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * Serialize a group into a json format accepted by the Portal API
   * for create and update operations
   *
   * @param group IGroup to be serialized
   * @returns a formatted JSON object to be sent to Portal
   * @private
   */
  function serializeGroup(group) {
      // create a clone so we're not messing with the original
      var clone = JSON.parse(JSON.stringify(group));
      // join and tags...
      var _a = group.tags, tags = _a === void 0 ? [] : _a;
      clone.tags = tags.join(", ");
      return clone;
  }

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { createGroup } from "@esri/arcgis-rest-groups";
   * //
   * createGroup({
   *   group: {
   *     title: "No Homers",
   *     access: "public"
   *   },
   *   authentication
   * })
   *   .then(response)
   * ```
   * Create a new Group. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/create-group.htm) for more information.
   *
   * Note: The group name must be unique within the user's organization.
   * @param requestOptions  - Options for the request, including a group object
   * @returns A Promise that will resolve with the success/failure status of the request
   */
  function createGroup(requestOptions) {
      var url = getPortalUrl(requestOptions) + "/community/createGroup";
      var options = __assign({}, requestOptions);
      // serialize the group into something Portal will accept
      options.params = serializeGroup(requestOptions.group);
      return request(url, options);
  }

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { getGroup } from "@esri/arcgis-rest-groups";
   * //
   * getGroup("fxb988") // id
   *   .then(response)
   * ```
   * Fetch a group using its id. See the [REST Documentation](https://developers.arcgis.com/rest/users-groups-and-items/group.htm) for more information.
   *
   * @param id - Group Id
   * @param requestOptions  - Options for the request
   * @returns  A Promise that will resolve with the data from the response.
   */
  function getGroup(id, requestOptions) {
      var url = getPortalUrl(requestOptions) + "/community/groups/" + id;
      // default to a GET request
      var options = __assign({ httpMethod: "GET" }, requestOptions);
      return request(url, options);
  }
  /**
   * Returns the content of a Group. Since the group may contain 1000s of items
   * the requestParams allow for paging.
   * @param id - Group Id
   * @param requestOptions  - Options for the request, including paging parameters.
   * @returns  A Promise that will resolve with the content of the group.
   */
  function getGroupContent(id, requestOptions) {
      var url = getPortalUrl(requestOptions) + "/content/groups/" + id;
      // default to a GET request
      var options = __assign({ httpMethod: "GET" }, { params: { start: 1, num: 100 } }, requestOptions);
      // is this the most concise way to mixin with the defaults above?
      if (requestOptions && requestOptions.paging) {
          options.params = __assign({}, requestOptions.paging);
      }
      return request(url, options);
  }

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2017-2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  function getSharingUrl(requestOptions) {
      var username = requestOptions.authentication.username;
      var owner = requestOptions.owner || username;
      return getPortalUrl(requestOptions) + "/content/users/" + encodeURIComponent(owner) + "/items/" + requestOptions.id + "/share";
  }
  function isItemOwner(requestOptions) {
      var username = requestOptions.authentication.username;
      var owner = requestOptions.owner || username;
      return owner === username;
  }
  /**
   * Check it the user is a full org_admin
   * @param requestOptions
   * @returns Promise resolving in a boolean indicating if the user is an ArcGIS Organization administrator
   */
  function isOrgAdmin(requestOptions) {
      var session = requestOptions.authentication;
      return session.getUser(requestOptions).then(function (user) {
          if (!user || user.role !== "org_admin") {
              return false;
          }
          else {
              return true;
          }
      });
  }
  /**
   * Get the User Membership for a particular group. Use this if all you have is the groupId.
   * If you have the group object, check the `userMembership.memberType` property instead of calling this method.
   *
   * @param IGroupIdRequestOptions options to pass through in the request
   * @returns A Promise that resolves with "owner" | "admin" | "member" | "nonmember"
   */
  function getUserMembership(requestOptions) {
      // fetch the group...
      return getGroup(requestOptions.groupId, requestOptions)
          .then(function (group) {
          return group.userMembership.memberType;
      })
          .catch(function () {
          return "nonmember";
      });
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { setItemAccess } from '@esri/arcgis-rest-sharing';
   * //
   * setItemAccess({
   *   id: "abc123",
   *   access: "public", // 'org' || 'private'
   *   authentication: session
   * })
   * ```
   * Change who is able to access an item.
   *
   * @param requestOptions - Options for the request.
   * @returns A Promise that will resolve with the data from the response.
   */
  function setItemAccess(requestOptions) {
      var url = getSharingUrl(requestOptions);
      if (isItemOwner(requestOptions)) {
          // if the user owns the item, proceed
          return updateItemAccess(url, requestOptions);
      }
      else {
          // otherwise we need to check to see if they are an organization admin
          return isOrgAdmin(requestOptions).then(function (admin) {
              if (admin) {
                  return updateItemAccess(url, requestOptions);
              }
              else {
                  // if neither, updating the sharing isnt possible
                  throw Error("This item can not be shared by " + requestOptions.authentication.username + ". They are neither the item owner nor an organization admin.");
              }
          });
      }
  }
  function updateItemAccess(url, requestOptions) {
      requestOptions.params = __assign({ org: false, everyone: false }, requestOptions.params);
      // if the user wants to make the item private, it needs to be unshared from any/all groups as well
      if (requestOptions.access === "private") {
          requestOptions.params.groups = " ";
      }
      if (requestOptions.access === "org") {
          requestOptions.params.org = true;
      }
      // if sharing with everyone, share with the entire organization as well.
      if (requestOptions.access === "public") {
          requestOptions.params.org = true;
          requestOptions.params.everyone = true;
      }
      return request(url, requestOptions);
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { shareItemWithGroup } from '@esri/arcgis-rest-sharing';
   * //
   * shareItemWithGroup({
   *   id: "abc123",
   *   groupId: "xyz987",
   *   authentication
   * })
   * ```
   * Share an item with a group, either as an [item owner](https://developers.arcgis.com/rest/users-groups-and-items/share-item-as-item-owner-.htm), [group admin]((https://developers.arcgis.com/rest/users-groups-and-items/share-item-as-group-admin-.htm)) or organization admin.
   *
   * @param requestOptions - Options for the request.
   * @returns A Promise that will resolve with the data from the response.
   */
  function shareItemWithGroup(requestOptions) {
      return changeGroupSharing(__assign({ action: "share" }, requestOptions));
  }
  /**
   * @param requestOptions - Options for the request.
   * @returns A Promise that will resolve with the data from the response.
   */
  function changeGroupSharing(requestOptions) {
      var username = requestOptions.authentication.username;
      var owner = requestOptions.owner || username;
      return isOrgAdmin(requestOptions).then(function (admin) {
          var resultProp = requestOptions.action === "share" ? "notSharedWith" : "notUnsharedFrom";
          // check if the item has already been shared with the group...
          return isItemSharedWithGroup(requestOptions).then(function (result) {
              // console.log(admin);
              // if we are sharing and result is true OR we are unsharing and result is false... short circuit
              if ((requestOptions.action === "share" && result === true) ||
                  (requestOptions.action === "unshare" && result === false)) {
                  // and send back the same response structure ArcGIS Online would
                  var response = { itemId: requestOptions.id, shortcut: true };
                  response[resultProp] = [];
                  return response;
              }
              else {
                  // next check to ensure the user is a member of the group
                  return getUserMembership(requestOptions)
                      .then(function (membership) {
                      if (membership === "nonmember") {
                          // abort and reject promise
                          throw Error("This item can not be " + requestOptions.action + "d by " + username + " as they are not a member of the specified group " + requestOptions.groupId + ".");
                      }
                      else {
                          // if orgAdmin or owner (and member of group) share using the owner url
                          if (owner === username || admin) {
                              return getPortalUrl(requestOptions) + "/content/users/" + owner + "/items/" + requestOptions.id + "/" + requestOptions.action;
                          }
                          else {
                              // if they are a group admin/owner, use the bare item url
                              if (membership === "admin" || membership === "owner") {
                                  return getPortalUrl(requestOptions) + "/content/items/" + requestOptions.id + "/" + requestOptions.action;
                              }
                              else {
                                  // otherwise abort
                                  throw Error("This item can not be " + requestOptions.action + "d by " + username + " as they are neither the owner, a groupAdmin of " + requestOptions.groupId + ", nor an org_admin.");
                              }
                          }
                      }
                  })
                      .then(function (url) {
                      // now its finally time to do the sharing
                      requestOptions.params = {
                          groups: requestOptions.groupId,
                          confirmItemControl: requestOptions.confirmItemControl
                      };
                      // dont mixin to ensure that old query parameters from the search request arent included
                      return request(url, requestOptions);
                  })
                      .then(function (sharingResponse) {
                      if (sharingResponse[resultProp].length) {
                          throw Error("Item " + requestOptions.id + " could not be " + requestOptions.action + "d to group " + requestOptions.groupId + ".");
                      }
                      else {
                          // all is well
                          return sharingResponse;
                      }
                  });
              } // else
          }); // then
      });
  }
  /**
   * Find out whether or not an item is already shared with a group.
   *
   * @param requestOptions - Options for the request.
   * @returns A Promise that will resolve with the data from the response.
   */
  function isItemSharedWithGroup(requestOptions) {
      var query = {
          q: "id: " + requestOptions.id + " AND group: " + requestOptions.groupId,
          start: 1,
          num: 10,
          sortField: "title"
      };
      // we need to append some params into requestOptions, so make a clone
      // instead of mutating the params on the inbound requestOptions object
      var options = __assign({}, requestOptions);
      // instead of calling out to "@esri/arcgis-rest-items, make the request manually to forgoe another dependency
      options.params = __assign({}, query, requestOptions.params);
      var url = getPortalUrl(options) + "/search";
      return request(url, options).then(function (searchResponse) {
          // if there are no search results at all, we know the item hasnt already been shared with the group
          if (searchResponse.total === 0) {
              return false;
          }
          else {
              var sharedItem_1;
              // otherwise loop through and search for the id
              searchResponse.results.some(function (item) {
                  var matchedItem = item.id === requestOptions.id;
                  if (matchedItem) {
                      sharedItem_1 = item;
                  }
                  return matchedItem;
              });
              if (sharedItem_1) {
                  return true;
              }
              else {
                  return false;
              }
          }
      });
  }

  /* Copyright (c) 2018 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */

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
  // -------------------------------------------------------------------------------------------------------------------//
  /**
   * A parameterized server name to replace the organization URL in a Web Mapping Application's URL to
   * itself; name has to be acceptable to AGOL, otherwise it discards the URL, so substitution must be
   * made before attempting to create the item.
   * @protected
   */
  var PLACEHOLDER_SERVER_NAME = "{{organization.portalBaseUrl}}";
  function doCommonTemplatizations(itemTemplate) {
      // Use the initiative's extent
      if (itemTemplate.item.extent) {
          itemTemplate.item.extent = "{{initiative.extent:optional}}";
      }
      // Templatize the item's id
      itemTemplate.item.id = templatize(itemTemplate.item.id);
  }
  /**
   * Publishes an item and its data as an AGOL item.
   *
   * @param item Item's `item` section
   * @param data Item's `data` section
   * @param requestOptions Options for the request
   * @param folderId Id of folder to receive item; null indicates that the item goes into the root
   *                 folder; ignored for Group item type
   * @param access Access to set for item: 'public', 'org', 'private'
   * @return A promise that will resolve with an object reporting success and the Solution id
   */
  function createItemWithData(item, data, requestOptions, folderId, access) {
      if (folderId === void 0) { folderId = null; }
      if (access === void 0) { access = "private"; }
      return new Promise(function (resolve, reject) {
          var options = __assign({ item: item, folder: folderId }, requestOptions);
          if (data) {
              options.item.text = data;
          }
          // Create item and add its optional data section
          createItemInFolder(options)
              .then(function (results) {
              // Clear property used to create item's data
              delete item.text;
              if (access !== "private") { // set access if it is not AGOL default
                  // Set the access manually since the access value in createItem appears to be ignored
                  var options1 = __assign({ id: results.id, access: access }, requestOptions);
                  setItemAccess(options1)
                      .then(function (results2) {
                      resolve({
                          success: true,
                          id: results2.itemId
                      });
                  }, function () { return reject({ success: false }); });
              }
              else {
                  resolve({
                      success: true,
                      id: results.id
                  });
              }
          }, function () { return reject({ success: false }); });
      });
  }
  function deTemplatize(id) {
      if (Array.isArray(id)) {
          return deTemplatizeList(id);
      }
      if (id && id.startsWith("{{")) {
          return id.substring(2, id.indexOf("."));
      }
      else {
          return id;
      }
  }
  function deTemplatizeList(ids) {
      return ids.map(function (id) {
          return deTemplatize(id);
      });
  }
  function finalCallback(key, successful, progressCallback) {
      progressCallback && progressCallback({
          processId: key,
          status: successful ? "done" : "failed"
      });
  }
  /**
   * Creates a timestamp string using the current date and time.
   *
   * @return Timestamp
   * @protected
   */
  function getUTCTimestamp() {
      var now = new Date();
      return padPositiveNum(now.getUTCFullYear(), 4) + padPositiveNum(now.getUTCMonth() + 1, 2) +
          padPositiveNum(now.getUTCDate(), 2) + "_" + padPositiveNum(now.getUTCHours(), 2) +
          padPositiveNum(now.getUTCMinutes(), 2) + "_" + padPositiveNum(now.getUTCSeconds(), 2) +
          padPositiveNum(now.getUTCMilliseconds(), 3);
  }
  function padPositiveNum(n, totalSize) {
      var numStr = n.toString();
      var numPads = totalSize - numStr.length;
      if (numPads > 0) {
          numStr = "0".repeat(numPads) + numStr; // TODO IE11 does not support repeat()
      }
      return numStr;
  }
  function templatize(id, param) {
      if (param === void 0) { param = "id"; }
      if (Array.isArray(id)) {
          return templatizeList(id, param);
      }
      if (id && id.startsWith("{{")) {
          return id;
      }
      else {
          return "{{" + id + "." + param + "}}";
      }
  }
  function templatizeList(ids, param) {
      if (param === void 0) { param = "id"; }
      return ids.map(function (id) {
          return templatize(id, param);
      });
  }
  function updateItemData(id, data, requestOptions) {
      return new Promise(function (resolve, reject) {
          // Update its URL
          var options = __assign({ item: {
                  id: id,
                  text: data
              } }, requestOptions);
          updateItem(options)
              .then(function (updateResp) {
              resolve(id);
          }, function () { return reject(); });
      });
  }
  /**
   * Updates the URL of an item.
   *
   * @param id AGOL id of item to update
   * @param url URL to assign to item's base section
   * @param requestOptions Options for the request
   * @return A promise that will resolve when the item has been updated
   */
  function updateItemURL(id, url, requestOptions) {
      return new Promise(function (resolve, reject) {
          // Update its URL
          var options = __assign({ item: {
                  id: id,
                  url: url
              } }, requestOptions);
          updateItem(options)
              .then(function (updateResp) {
              resolve(id);
          }, function () { return reject(); });
      });
  }

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
  /**
   * Get a property out of a deeply nested object
   * Does not handle anything but nested object graph
   *
   * @param obj Object to retrieve value from
   * @param path Path into an object, e.g., "data.values.webmap", where "data" is a top-level property
   *             in obj
   * @return Value at end of path
   */
  function getProp(obj, path) {
      return path.split(".").reduce(function (prev, curr) {
          /* istanbul ignore next no need to test undefined scenario */
          return prev ? prev[curr] : undefined;
      }, obj);
  }
  /**
   * Return an array of values from an object, based on an array of property paths
   *
   * @param obj object to retrive values from
   * @param props Array of paths into the object e.g., "data.values.webmap", where "data" is a top-level property
   *
   * @return Array of the values plucked from the object
   */
  function getProps(obj, props) {
      return props.reduce(function (a, p) {
          var v = getProp(obj, p);
          if (v) {
              a.push(v);
          }
          return a;
      }, []);
  }
  /**
   * Look for a specific property name anywhere inside an object graph
   * and return the value
   */
  function getDeepValues(obj, prop) {
      var result = [];
      if (!obj)
          return result;
      var p;
      for (p in obj) {
          if (obj.hasOwnProperty(p)) {
              if (p === prop) {
                  result.push(obj[p]);
              }
              else {
                  if (Array.isArray(obj[p])) {
                      obj[p].forEach(function (e) {
                          result = result.concat(getDeepValues(e, prop));
                      });
                  }
                  else if (typeof obj[p] === 'object') {
                      result = result.concat(getDeepValues(obj[p], prop));
                  }
              }
          }
      }
      return result;
  }

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
  /**
   * Check if a given string is a GUID
   * @param stringToTest string that may be a guid
   *
   * @returns boolean indicating if the string is a guid
   */
  function isGuid(stringToTest) {
      if (typeof stringToTest !== 'string') {
          return false;
      }
      if (stringToTest[0] === '{') {
          stringToTest = stringToTest.substring(1, stringToTest.length - 1);
      }
      var regexGuid = /^(\{){0,1}[0-9a-fA-F]{8}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{12}(\}){0,1}$/gi;
      return regexGuid.test(stringToTest);
  }

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
  /**
   * Does the model have a specific typeKeyword?
   */
  function hasTypeKeyword(model, keyword) {
      var typeKeywords = getProp(model, 'item.typeKeywords') || model.typeKeywords || [];
      return typeKeywords.includes(keyword);
  }
  /**
   * Does the model have any of a set of keywords
   */
  function hasAnyKeyword(model, keywords) {
      var typeKeywords = getProp(model, 'item.typeKeywords') || model.typeKeywords || [];
      return keywords.reduce(function (a, kw) {
          if (!a) {
              a = typeKeywords.includes(kw);
          }
          return a;
      }, false);
  }
  /**
   * Given the url of a webapp, parse our the id from the url
   */
  function parseIdFromUrl(url) {
      var id = null;
      if (!url) {
          return id;
      }
      var qs = url.split('?')[1];
      if (qs) {
          id = qs.split('&').reduce(function (a, p) {
              var part = p.split('=')[1];
              if (part && isGuid(part)) {
                  a = part;
              }
              return a;
          }, null);
      }
      return id;
  }
  /**
   * Return a random number, prefixed with a string. Used for unique identifiers that do not require
   * the rigor of a full UUID - i.e. node id's, process ids etc.
   * @param prefix String to prefix the random number with so the result is a valid javascript property
   */
  function createId(prefix) {
      if (prefix === void 0) { prefix = "i"; }
      // prepend some char so it's always a valid dotable property name
      // get a random number, convert to base 36 representation, then grab chars 2-8
      return "" + prefix + Math.random()
          .toString(36)
          .substr(2, 8);
  }

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
  /**
   * The portion of a Dashboard app URL between the server and the app id.
   * @protected
   */
  var OPS_DASHBOARD_APP_URL_PART = "/apps/opsdashboard/index.html#/";
  // -- Externals ------------------------------------------------------------------------------------------------------//
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate(itemTemplate, requestOptions) {
      return new Promise(function (resolve) {
          // Update the estimated cost factor to deploy this item
          itemTemplate.estimatedDeploymentCostFactor = 4;
          // Common templatizations: extent, item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          // Templatize the app URL
          itemTemplate.item.url = PLACEHOLDER_SERVER_NAME + OPS_DASHBOARD_APP_URL_PART;
          // Extract dependencies
          itemTemplate.dependencies = extractDependencies(itemTemplate);
          resolve(itemTemplate);
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  function createItemFromTemplate(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var options = __assign({ item: itemTemplate.item, folder: settings.folderId }, requestOptions);
          if (itemTemplate.data) {
              options.item.text = itemTemplate.data;
          }
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createItemInFolder(options)
              .then(function (createResponse) {
              if (createResponse.success) {
                  // Add the new item to the settings
                  settings[deTemplatize(itemTemplate.itemId)] = {
                      id: createResponse.id
                  };
                  itemTemplate.itemId = itemTemplate.item.id = createResponse.id;
                  itemTemplate = adlib(itemTemplate, settings);
                  // Update the app URL
                  progressCallback && progressCallback({
                      processId: itemTemplate.key,
                      status: "updating URL"
                  });
                  updateItemURL(itemTemplate.itemId, itemTemplate.item.url, requestOptions)
                      .then(function () {
                      finalCallback(itemTemplate.key, true, progressCallback);
                      resolve(itemTemplate);
                  }, function () {
                      finalCallback(itemTemplate.key, false, progressCallback);
                      reject({ success: false });
                  });
              }
              else {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              }
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * Gets the ids of the dependencies of an AGOL dashboard item.
   *
   * @param fullItem A dashboard item whose dependencies are sought
   * @return List of dependencies
   * @protected
   */
  function extractDependencies(itemTemplate) {
      var dependencies = [];
      var widgets = getProp(itemTemplate, "data.widgets");
      if (widgets) {
          widgets.forEach(function (widget) {
              if (widget.type === "mapWidget") {
                  dependencies.push(widget.itemId);
              }
          });
      }
      return dependencies;
  }

  var DashboardModule = /*#__PURE__*/Object.freeze({
    OPS_DASHBOARD_APP_URL_PART: OPS_DASHBOARD_APP_URL_PART,
    convertItemToTemplate: convertItemToTemplate,
    createItemFromTemplate: createItemFromTemplate,
    extractDependencies: extractDependencies
  });

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
  // -- Externals ------------------------------------------------------------------------------------------------------//
  //
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate$1(itemTemplate, requestOptions) {
      return new Promise(function (resolve, reject) {
          // Update the estimated cost factor to deploy this item
          itemTemplate.estimatedDeploymentCostFactor = 3;
          // Common templatizations: item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          // Get dependencies (contents)
          getGroupContents(itemTemplate, requestOptions)
              .then(function (dependencies) {
              itemTemplate.dependencies = dependencies;
              resolve(itemTemplate);
          }, function () { return reject({ success: false }); });
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  function createItemFromTemplate$1(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var options = __assign({ group: itemTemplate.item }, requestOptions);
          // Make the item title unique
          options.group.title += "_" + getUTCTimestamp();
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createGroup(options)
              .then(function (createResponse) {
              if (createResponse.success) {
                  // Add the new item to the settings
                  settings[deTemplatize(itemTemplate.itemId)] = {
                      id: createResponse.group.id
                  };
                  itemTemplate.itemId = createResponse.group.id;
                  itemTemplate = adlib(itemTemplate, settings);
                  // Add the group's items to it
                  addGroupMembers(itemTemplate, requestOptions, progressCallback)
                      .then(function () {
                      finalCallback(itemTemplate.key, true, progressCallback);
                      resolve(itemTemplate);
                  }, function () {
                      finalCallback(itemTemplate.key, false, progressCallback);
                      reject({ success: false });
                  });
              }
              else {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              }
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * Adds the members of a group to it.
   *
   * @param itemTemplate Group
   * @param swizzles Hash mapping Solution source id to id of its clone
   * @param requestOptions Options for the request
   * @return A promise that will resolve when fullItem has been updated
   * @protected
   */
  function addGroupMembers(itemTemplate, requestOptions, progressCallback) {
      return new Promise(function (resolve, reject) {
          // Add each of the group's items to it
          if (itemTemplate.dependencies.length > 0) {
              var awaitGroupAdds_1 = [];
              itemTemplate.dependencies.forEach(function (depId) {
                  awaitGroupAdds_1.push(new Promise(function (resolve2, reject2) {
                      shareItemWithGroup(__assign({ id: depId, groupId: itemTemplate.itemId }, requestOptions))
                          .then(function () {
                          progressCallback && progressCallback({
                              processId: itemTemplate.key,
                              status: "added group member"
                          });
                          resolve2();
                      }, function () {
                          finalCallback(itemTemplate.key, false, progressCallback);
                          reject2({ success: false });
                      });
                  }));
              });
              // After all items have been added to the group
              Promise.all(awaitGroupAdds_1)
                  .then(function () { return resolve(); }, function () { return reject({ success: false }); });
          }
          else {
              // No items in this group
              resolve();
          }
      });
  }
  /**
   * Gets the ids of the dependencies (contents) of an AGOL group.
   *
   * @param fullItem A group whose contents are sought
   * @param requestOptions Options for requesting information from AGOL
   * @return A promise that will resolve with list of dependent ids
   * @protected
   */
  function getGroupContents(itemTemplate, requestOptions) {
      return new Promise(function (resolve, reject) {
          var pagingRequest = __assign({ paging: {
                  start: 1,
                  num: 100
              } }, requestOptions);
          // Fetch group items
          getGroupContentsTranche(itemTemplate.itemId, pagingRequest)
              .then(function (contents) {
              // Update the estimated cost factor to deploy this item
              itemTemplate.estimatedDeploymentCostFactor = 3 + contents.length;
              resolve(contents);
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Gets the ids of a group's contents.
   *
   * @param id Group id
   * @param pagingRequest Options for requesting group contents; note: its paging.start parameter may
   *                      be modified by this routine
   * @return A promise that will resolve with a list of the ids of the group's contents
   * @protected
   */
  function getGroupContentsTranche(id, pagingRequest) {
      return new Promise(function (resolve, reject) {
          // Fetch group items
          getGroupContent(id, pagingRequest)
              .then(function (contents) {
              if (contents.num > 0) {
                  // Extract the list of content ids from the JSON returned
                  var trancheIds_1 = contents.items.map(function (item) { return item.id; });
                  // Are there more contents to fetch?
                  if (contents.nextStart > 0) {
                      pagingRequest.paging.start = contents.nextStart;
                      getGroupContentsTranche(id, pagingRequest)
                          .then(function (allSubsequentTrancheIds) {
                          // Append all of the following tranches to this tranche and return it
                          resolve(trancheIds_1.concat(allSubsequentTrancheIds));
                      }, function () { return reject({ success: false }); });
                  }
                  else {
                      resolve(trancheIds_1);
                  }
              }
              else {
                  resolve([]);
              }
          }, function () { return reject({ success: false }); });
      });
  }

  var GroupModule = /*#__PURE__*/Object.freeze({
    convertItemToTemplate: convertItemToTemplate$1,
    createItemFromTemplate: createItemFromTemplate$1,
    addGroupMembers: addGroupMembers,
    getGroupContents: getGroupContents,
    getGroupContentsTranche: getGroupContentsTranche
  });

  /* Copyright (c) 2018-2019 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import {
   *   createFeatureService,
   *   addToServiceDefinition
   * } from '@esri/arcgis-rest-feature-service-admin';
   * //
   * createFeatureService({
   *   authentication: userSession,
   *   item: {
   *     "name": "NewEmptyService",
   *     "capabilities": "Create,Delete,Query,Update,Editing"
   *   }
   * });
   * ```
   * Create a new [hosted feature service](https://developers.arcgis.com/rest/users-groups-and-items/create-service.htm). After the service has been created, call [`addToServiceDefinition()`](../addToServiceDefinition/) if you'd like to update it's schema.
   * @param requestOptions - Options for the request
   * @returns A Promise that resolves with service details once the service has been created
   */
  function createFeatureService(requestOptions) {
      var owner = determineOwner(requestOptions);
      var baseUrl = getPortalUrl(requestOptions) + "/content/users/" + owner;
      var url = baseUrl + "/createService";
      // Create the service
      requestOptions.params = __assign({ createParameters: requestOptions.item, outputType: "featureService" }, requestOptions.params);
      if (!requestOptions.folderId || requestOptions.folderId === "/") {
          // If the service is destined for the root folder, just send the request
          return request(url, requestOptions);
      }
      else {
          // If the service is destined for a subfolder, move it (via another call)
          return request(url, requestOptions).then(function (createResponse) {
              if (createResponse.success) {
                  return moveItem({
                      itemId: createResponse.itemId,
                      folderId: requestOptions.folderId,
                      authentication: requestOptions.authentication
                  }).then(function (moveResponse) {
                      if (moveResponse.success) {
                          return createResponse;
                      }
                      else {
                          throw Error("A problem was encountered when trying to move the service to a different folder.");
                      }
                  });
              }
              else {
                  throw Error("A problem was encountered when trying to create the service.");
              }
          });
      }
  }

  /* Copyright (c) 2018-2019 Environmental Systems Research Institute, Inc.
   * Apache-2.0 */
  /**
   * ```js
   * import { addToServiceDefinition } from '@esri/arcgis-rest-feature-service-admin';
   * //
   * addToServiceDefinition(serviceurl, {
   *   authentication: userSession,
   *   layers: [],
   *   tables: []
   * });
   * ```
   * Add layer(s) and/or table(s) to a hosted feature service. See the [REST Documentation](https://developers.arcgis.com/rest/services-reference/add-to-definition-feature-service-.htm) for more information.
   *
   * @param url - URL of feature service
   * @param requestOptions - Options for the request
   * @returns A Promise that resolves with service layer and/or table details once the definition
   * has been updated
   */
  function addToServiceDefinition(url, requestOptions) {
      var adminUrl = cleanUrl(url).replace("/rest/services", "/rest/admin/services") + "/addToDefinition";
      requestOptions.params = __assign({ addToDefinition: {} }, requestOptions.params);
      if (requestOptions.layers && requestOptions.layers.length > 0) {
          requestOptions.params.addToDefinition.layers = requestOptions.layers;
      }
      if (requestOptions.tables && requestOptions.tables.length > 0) {
          requestOptions.params.addToDefinition.tables = requestOptions.tables;
      }
      return request(adminUrl, requestOptions);
  }

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
  // -- Externals ------------------------------------------------------------------------------------------------------//
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate$2(itemTemplate, requestOptions) {
      return new Promise(function (resolve, reject) {
          // Update the estimated cost factor to deploy this item
          itemTemplate.estimatedDeploymentCostFactor = 3;
          // Common templatizations: extent, item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          fleshOutFeatureService(itemTemplate, requestOptions)
              .then(function () { return resolve(itemTemplate); }, function () { return reject({ success: false }); });
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  /**
   * Creates an item in a specified folder (except for Group item type).
   *
   * @param itemTemplate Item to be created; n.b.: this item is modified
   * @param folderId Id of folder to receive item; null indicates that the item goes into the root
   *                 folder; ignored for Group item type
   * @param settings Hash mapping property names to replacement values
   * @param requestOptions Options for the request
   * @return A promise that will resolve with the id of the created item
   * @protected
   */
  function createItemFromTemplate$2(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var createOptions = __assign({ item: itemTemplate.item, folderId: settings.folderId }, requestOptions);
          if (itemTemplate.data) {
              createOptions.item.text = itemTemplate.data;
          }
          // Make the item name unique
          createOptions.item.name = itemTemplate.item.name + "_" + getUTCTimestamp();
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createFeatureService(createOptions)
              .then(function (createResponse) {
              // Add the new item to the settings list
              settings[deTemplatize(itemTemplate.itemId)] = {
                  id: createResponse.serviceItemId,
                  url: createResponse.serviceurl
              };
              itemTemplate.itemId = itemTemplate.item.id = createResponse.serviceItemId;
              itemTemplate = adlib(itemTemplate, settings);
              itemTemplate.item.url = createResponse.serviceurl;
              // Update item using a unique name because createFeatureService doesn't provide a way to specify
              // snippet, description, etc.
              var updateOptions = __assign({ item: {
                      id: itemTemplate.itemId,
                      title: itemTemplate.item.title,
                      snippet: itemTemplate.item.snippet,
                      description: itemTemplate.item.description,
                      accessInfo: itemTemplate.item.accessInfo,
                      licenseInfo: itemTemplate.item.licenseInfo,
                      text: itemTemplate.data
                  } }, requestOptions);
              updateItem(updateOptions)
                  .then(function () {
                  // Add the feature service's layers and tables to it
                  addFeatureServiceLayersAndTables(itemTemplate, settings, requestOptions, progressCallback)
                      .then(function () {
                      finalCallback(itemTemplate.key, true, progressCallback);
                      resolve(itemTemplate);
                  }, function () {
                      finalCallback(itemTemplate.key, false, progressCallback);
                      reject({ success: false });
                  });
              }, function () {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              });
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }
  /**
   * Adds the layers and tables of a feature service to it and restores their relationships.
   *
   * @param itemTemplate Feature service
   * @param settings Hash mapping Solution source id to id of its clone (and name & URL for feature
   *            service)
   * @param requestOptions Options for the request
   * @return A promise that will resolve when fullItem has been updated
   * @protected
   */
  function addFeatureServiceLayersAndTables(itemTemplate, settings, requestOptions, progressCallback) {
      return new Promise(function (resolve, reject) {
          // Sort layers and tables by id so that they're added with the same ids
          var properties = itemTemplate.properties;
          var layersAndTables = [];
          (properties.layers || []).forEach(function (layer) {
              layersAndTables[layer.id] = {
                  item: layer,
                  type: "layer"
              };
          });
          (properties.tables || []).forEach(function (table) {
              layersAndTables[table.id] = {
                  item: table,
                  type: "table"
              };
          });
          // Hold a hash of relationships
          var relationships = {};
          // Add the service's layers and tables to it
          if (layersAndTables.length > 0) {
              updateFeatureServiceDefinition(itemTemplate.itemId, itemTemplate.item.url, layersAndTables, settings, relationships, requestOptions, itemTemplate.key, progressCallback)
                  .then(function () {
                  // Restore relationships for all layers and tables in the service
                  var awaitRelationshipUpdates = [];
                  Object.keys(relationships).forEach(function (id) {
                      awaitRelationshipUpdates.push(new Promise(function (resolveFn, rejectFn) {
                          var options = __assign({ params: {
                                  updateFeatureServiceDefinition: {
                                      relationships: relationships[id]
                                  }
                              } }, requestOptions);
                          addToServiceDefinition(itemTemplate.item.url + "/" + id, options)
                              .then(function () {
                              progressCallback && progressCallback({
                                  processId: itemTemplate.key,
                                  status: "updated relationship"
                              });
                              resolveFn();
                          }, function () { return rejectFn(); });
                      }));
                  });
                  Promise.all(awaitRelationshipUpdates)
                      .then(function () { return resolve(); }, function () { return reject({ success: false }); });
              }, function () { return reject({ success: false }); });
          }
          else {
              resolve();
          }
      });
  }
  function countRelationships(layers) {
      var reducer = function (accumulator, currentLayer) {
          return accumulator + (currentLayer.relationships ? currentLayer.relationships.length : 0);
      };
      return layers.reduce(reducer, 0);
  }
  /**
   * Fills in missing data, including full layer and table definitions, in a feature services' definition.
   *
   * @param itemTemplate Feature service item, data, dependencies definition to be modified
   * @param requestOptions Options for requesting information from AGOL
   * @return A promise that will resolve when fullItem has been updated
   * @protected
   */
  function fleshOutFeatureService(itemTemplate, requestOptions) {
      return new Promise(function (resolve, reject) {
          var properties = {
              service: {},
              layers: [],
              tables: []
          };
          // To have enough information for reconstructing the service, we'll supplement
          // the item and data sections with sections for the service, full layers, and
          // full tables
          // Get the service description
          var serviceUrl = itemTemplate.item.url;
          itemTemplate.item.url = templatize(itemTemplate.itemId, "url");
          request(serviceUrl + "?f=json", requestOptions)
              .then(function (serviceData) {
              serviceData.serviceItemId = templatize(serviceData.serviceItemId);
              properties.service = serviceData;
              // Get the affiliated layer and table items
              Promise.all([
                  getLayers(serviceUrl, serviceData["layers"], requestOptions),
                  getLayers(serviceUrl, serviceData["tables"], requestOptions)
              ])
                  .then(function (results) {
                  properties.layers = results[0];
                  properties.tables = results[1];
                  itemTemplate.properties = properties;
                  itemTemplate.estimatedDeploymentCostFactor +=
                      properties.layers.length + // layers
                          countRelationships(properties.layers) + // layer relationships
                          properties.tables.length + // tables & estimated single relationship for each
                          countRelationships(properties.tables); // table relationships
                  resolve();
              }, function () { return reject({ success: false }); });
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Gets the full definitions of the layers affiliated with a hosted service.
   *
   * @param serviceUrl URL to hosted service
   * @param layerList List of layers at that service
   * @param requestOptions Options for the request
   * @return A promise that will resolve with a list of the enhanced layers
   * @protected
   */
  function getLayers(serviceUrl, layerList, requestOptions) {
      return new Promise(function (resolve, reject) {
          if (!Array.isArray(layerList) || layerList.length === 0) {
              resolve([]);
          }
          var requestsDfd = [];
          layerList.forEach(function (layer) {
              requestsDfd.push(request(serviceUrl + "/" + layer["id"] + "?f=json", requestOptions));
          });
          // Wait until all layers are heard from
          Promise.all(requestsDfd)
              .then(function (layers) {
              // Remove the editFieldsInfo because it references fields that may not be in the layer/table;
              // templatize the layer's serviceItemId
              layers.forEach(function (layer) {
                  layer["editFieldsInfo"] = null;
                  layer["serviceItemId"] = templatize(layer["serviceItemId"]);
              });
              resolve(layers);
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Updates a feature service with a list of layers and/or tables.
   *
   * @param serviceItemId AGOL id of feature service
   * @param serviceUrl URL of feature service
   * @param listToAdd List of layers and/or tables to add
   * @param settings Hash mapping Solution source id to id of its clone (and name & URL for feature
   *            service)
   * @param relationships Hash mapping a layer's relationship id to the ids of its relationships
   * @param requestOptions Options for requesting information from AGOL
   * @return A promise that will resolve when the feature service has been updated
   * @protected
   */
  function updateFeatureServiceDefinition(serviceItemId, serviceUrl, listToAdd, settings, relationships, requestOptions, key, progressCallback) {
      // Launch the adds serially because server doesn't support parallel adds
      return new Promise(function (resolve, reject) {
          if (listToAdd.length > 0) {
              var toAdd = listToAdd.shift();
              var item = toAdd.item;
              var originalId = item.id;
              delete item.serviceItemId; // Updated by updateFeatureServiceDefinition
              // Need to remove relationships and add them back individually after all layers and tables
              // have been added to the definition
              if (Array.isArray(item.relationships) && item.relationships.length > 0) {
                  relationships[originalId] = item.relationships;
                  item.relationships = [];
              }
              var options = __assign({}, requestOptions);
              // Need to add layers and tables one at a time, waiting until one is complete before moving on to the next one
              if (toAdd.type === "layer") {
                  item.adminLayerInfo = {
                      "geometryField": {
                          "name": "Shape",
                          "srid": 102100
                      }
                  };
                  options.layers = [item];
              }
              else {
                  options.tables = [item];
              }
              addToServiceDefinition(serviceUrl, options)
                  .then(function () {
                  progressCallback && progressCallback({
                      processId: key,
                      status: "added layer"
                  });
                  updateFeatureServiceDefinition(serviceItemId, serviceUrl, listToAdd, settings, relationships, requestOptions, key, progressCallback)
                      .then(function () { return resolve(); }, function () { return reject({ success: false }); });
              }, function (error) { console.warn("addToServiceDefinition reject", JSON.stringify(error, null, 2)); reject({ success: false }); } // //???
              // //???() => reject({ success: false })
              );
          }
          else {
              resolve();
          }
      });
  }

  var FeatureServiceModule = /*#__PURE__*/Object.freeze({
    convertItemToTemplate: convertItemToTemplate$2,
    createItemFromTemplate: createItemFromTemplate$2,
    addFeatureServiceLayersAndTables: addFeatureServiceLayersAndTables,
    countRelationships: countRelationships,
    fleshOutFeatureService: fleshOutFeatureService
  });

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
  // -------------------------------------------------------------------------------------------------------------------//
  /**
   * The portion of a Webmap URL between the server and the map id.
   * @protected
   */
  var WEBMAP_APP_URL_PART = "/home/webmap/viewer.html?webmap=";
  // -- Externals ------------------------------------------------------------------------------------------------------//
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate$3(itemTemplate, requestOptions) {
      return new Promise(function (resolve) {
          // Update the estimated cost factor to deploy this item
          itemTemplate.estimatedDeploymentCostFactor = 4;
          // Common templatizations: extent, item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          // Templatize the app URL
          itemTemplate.item.url =
              PLACEHOLDER_SERVER_NAME + WEBMAP_APP_URL_PART + templatize(itemTemplate.itemId);
          // Extract dependencies
          itemTemplate.dependencies = extractDependencies$1(itemTemplate);
          // Templatize the map layer ids now that we've extracted them as dependencies
          if (itemTemplate.data) {
              templatizeWebmapLayerIdsAndUrls(itemTemplate.data.operationalLayers);
              templatizeWebmapLayerIdsAndUrls(itemTemplate.data.tables);
          }
          resolve(itemTemplate);
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  function createItemFromTemplate$3(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var options = __assign({ item: itemTemplate.item, folder: settings.folderId }, requestOptions);
          if (itemTemplate.data) {
              options.item.text = itemTemplate.data;
          }
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createItemInFolder(options)
              .then(function (createResponse) {
              if (createResponse.success) {
                  // Add the new item to the settings
                  settings[deTemplatize(itemTemplate.itemId)] = {
                      id: createResponse.id
                  };
                  itemTemplate.itemId = itemTemplate.item.id = createResponse.id;
                  itemTemplate = adlib(itemTemplate, settings);
                  // Update the app URL
                  progressCallback && progressCallback({
                      processId: itemTemplate.key,
                      status: "updating URL"
                  });
                  updateItemURL(itemTemplate.itemId, itemTemplate.item.url, requestOptions)
                      .then(function () {
                      finalCallback(itemTemplate.key, true, progressCallback);
                      resolve(itemTemplate);
                  }, function () {
                      finalCallback(itemTemplate.key, false, progressCallback);
                      reject({ success: false });
                  });
              }
              else {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              }
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * Gets the ids of the dependencies of an AGOL webmap item.
   *
   * @param fullItem A webmap item whose dependencies are sought
   * @return List of dependencies
   * @protected
   */
  function extractDependencies$1(itemTemplate) {
      var dependencies = [];
      if (itemTemplate.data) {
          dependencies = getWebmapLayerIds(itemTemplate.data.operationalLayers).concat(getWebmapLayerIds(itemTemplate.data.tables));
      }
      return dependencies;
  }
  /**
   * Extracts the AGOL id or URL for each layer or table object in a list.
   *
   * @param layerList List of map layers or tables
   * @return List containing id of each layer or table that has an itemId
   * @protected
   */
  function getWebmapLayerIds(layerList) {
      if (layerList === void 0) { layerList = []; }
      return layerList.reduce(function (ids, layer) {
          var itemId = layer.itemId;
          if (itemId) {
              ids.push(itemId);
          }
          return ids;
      }, []);
  }
  function templatizeWebmapLayerIdsAndUrls(layerList) {
      if (layerList === void 0) { layerList = []; }
      layerList
          .filter(function (layer) { return !!layer.itemId; })
          .forEach(function (layer) {
          var layerId = layer.url.substr(layer.url.lastIndexOf("/"));
          layer.itemId = templatize(layer.itemId);
          layer.url = templatize(deTemplatize(layer.itemId), "url") + layerId;
      });
  }

  var WebMapModule = /*#__PURE__*/Object.freeze({
    convertItemToTemplate: convertItemToTemplate$3,
    createItemFromTemplate: createItemFromTemplate$3,
    extractDependencies: extractDependencies$1,
    getWebmapLayerIds: getWebmapLayerIds,
    templatizeWebmapLayerIdsAndUrls: templatizeWebmapLayerIdsAndUrls
  });

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
  /**
   * Return a list of items this depends on
   */
  function extractDependencies$2(model) {
      // unknown types have no deps...
      var processor = function (m) { return []; };
      // find known types by typeKeyword
      if (hasTypeKeyword(model, 'Cascade')) {
          processor = getCascadeDependencies;
      }
      if (hasTypeKeyword(model, 'MapJournal')) {
          processor = getMapJournalDependencies;
      }
      if (hasTypeKeyword(model, 'mapseries')) {
          processor = getMapSeriesDependencies;
      }
      // execute
      return processor(model);
  }
  /**
   * Cascade specific logic
   */
  function getCascadeDependencies(model) {
      // Cascade Example QA b908258efbba4f019450db46382a0c13
      var sections = getProp(model, 'data.values.sections') || [];
      return sections.reduce(function (a, s) {
          return a.concat(getDeepValues(s, 'webmap').map(function (e) {
              return e.id;
          }));
      }, []);
  }
  /**
   * Map Series specific logic
   */
  function getMapSeriesDependencies(model) {
      var deps = getProps(model, ['data.values.webmap']);
      var entries = getProp(model, 'data.values.story.entries') || [];
      entries.forEach(function (e) {
          var entryWebmaps = getDeepValues(e, 'webmap').map(function (obj) {
              return obj.id;
          });
          // may be dupes...
          entryWebmaps.forEach(function (id) {
              if (deps.indexOf(id) === -1) {
                  deps.push(id);
              }
          });
      });
      return deps;
  }
  function getMapJournalDependencies(model) {
      // MapJournal example QA 4c4d084c22d249fdbb032e4143c62546
      var sections = getProp(model, 'data.values.story.sections') || [];
      var deps = sections.reduce(function (a, s) {
          if (s.media) {
              if (s.media.type === 'webmap') {
                  var v = getProp(s, 'media.webmap.id');
                  if (v) {
                      a.push(v);
                  }
              }
              if (s.media.type === 'webpage') {
                  var url = getProp(s, 'media.webpage.url');
                  var id = parseIdFromUrl(url);
                  if (id) {
                      a.push(id);
                  }
              }
          }
          return a;
      }, []);
      return deps;
  }

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
  /**
   * Return a list of items this site depends on
   */
  function extractDependencies$3(model) {
      var deps = [];
      var v = getProp(model, 'data.map.itemId');
      if (v) {
          deps.push(v);
      }
      return deps;
  }

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
  // -- Externals ------------------------------------------------------------------------------------------------------//
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate$4(itemTemplate, requestOptions) {
      return new Promise(function (resolve) {
          // Update the estimated cost factor to deploy this item
          itemTemplate.estimatedDeploymentCostFactor = 4;
          // Common templatizations: extent, item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          // Remove org base URL and app id, e.g.,
          //   http://statelocaltryit.maps.arcgis.com/apps/CrowdsourcePolling/index.html?appid=6fc5992522d34f26b2210d17835eea21
          // to
          //   <PLACEHOLDER_SERVER_NAME>/apps/CrowdsourcePolling/index.html?appid={{<itemId>.id}}
          // Need to add placeholder server name because otherwise AGOL makes URL null
          var templatizedUrl = itemTemplate.item.url;
          var iSep = templatizedUrl.indexOf("//");
          itemTemplate.item.url = PLACEHOLDER_SERVER_NAME + // add placeholder server name
              templatizedUrl.substring(templatizedUrl.indexOf("/", iSep + 2), templatizedUrl.lastIndexOf("=") + 1) +
              templatize(itemTemplate.itemId);
          // Set the folder
          if (getProp(itemTemplate, "data.folderId")) {
              itemTemplate.data.folderId = "{{folderId}}";
          }
          // Set the map or group
          if (getProp(itemTemplate, "data.values.webmap")) {
              itemTemplate.data.values.webmap = templatize(itemTemplate.data.values.webmap);
          }
          else if (getProp(itemTemplate, "data.values.group")) {
              itemTemplate.data.values.group = templatize(itemTemplate.data.values.group);
          }
          // Extract dependencies
          itemTemplate.dependencies = extractDependencies$4(itemTemplate);
          resolve(itemTemplate);
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  function createItemFromTemplate$4(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var options = __assign({ item: itemTemplate.item, folder: settings.folderId }, requestOptions);
          if (itemTemplate.data) {
              options.item.text = itemTemplate.data;
          }
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createItemInFolder(options)
              .then(function (createResponse) {
              if (createResponse.success) {
                  // Add the new item to the settings
                  settings[deTemplatize(itemTemplate.itemId)] = {
                      id: createResponse.id
                  };
                  itemTemplate.itemId = itemTemplate.item.id = createResponse.id;
                  itemTemplate = adlib(itemTemplate, settings);
                  // Update the app URL
                  progressCallback && progressCallback({
                      processId: itemTemplate.key,
                      status: "updating URL"
                  });
                  updateItemURL(itemTemplate.itemId, itemTemplate.item.url, requestOptions)
                      .then(function () {
                      finalCallback(itemTemplate.key, true, progressCallback);
                      resolve(itemTemplate);
                  }, function () {
                      finalCallback(itemTemplate.key, false, progressCallback);
                      reject({ success: false });
                  });
              }
              else {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              }
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * Gets the ids of the dependencies of an AGOL webapp item.
   *
   * @param fullItem A webapp item whose dependencies are sought
   * @return A promise that will resolve with list of dependent ids
   * @protected
   */
  function extractDependencies$4(model) {
      var processor = getGenericWebAppDependencies;
      if (hasTypeKeyword(model, 'Story Map')) {
          processor = extractDependencies$2;
      }
      if (hasAnyKeyword(model, ['WAB2D', 'WAB3D', 'Web AppBuilder'])) {
          processor = extractDependencies$3;
      }
      return processor(model);
  }
  /**
   * Generic Web App Dependencies
   */
  function getGenericWebAppDependencies(model) {
      var props = ['data.webmap', 'data.itemId', 'data.values.webmap', 'data.values.group'];
      return getProps(model, props);
  }

  var WebMappingApplicationModule = /*#__PURE__*/Object.freeze({
    convertItemToTemplate: convertItemToTemplate$4,
    createItemFromTemplate: createItemFromTemplate$4,
    extractDependencies: extractDependencies$4,
    getGenericWebAppDependencies: getGenericWebAppDependencies
  });

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
  // -- Externals ------------------------------------------------------------------------------------------------------//
  // -- Create Bundle Process ------------------------------------------------------------------------------------------//
  function convertItemToTemplate$5(itemTemplate, requestOptions) {
      return new Promise(function (resolve) {
          // Common templatizations: extent, item id, item dependency ids
          doCommonTemplatizations(itemTemplate);
          resolve(itemTemplate);
      });
  }
  // -- Deploy Bundle Process ------------------------------------------------------------------------------------------//
  function createItemFromTemplate$5(itemTemplate, settings, requestOptions, progressCallback) {
      progressCallback && progressCallback({
          processId: itemTemplate.key,
          type: itemTemplate.type,
          status: "starting"
      });
      return new Promise(function (resolve, reject) {
          var options = __assign({ item: itemTemplate.item, folder: settings.folderId }, requestOptions);
          if (itemTemplate.data) {
              options.item.text = itemTemplate.data;
          }
          // Create the item
          progressCallback && progressCallback({
              processId: itemTemplate.key,
              status: "creating",
          });
          createItemInFolder(options)
              .then(function (createResponse) {
              if (createResponse.success) {
                  // Add the new item to the settings
                  settings[deTemplatize(itemTemplate.itemId)] = {
                      id: createResponse.id
                  };
                  itemTemplate.itemId = itemTemplate.item.id = createResponse.id;
                  itemTemplate = adlib(itemTemplate, settings);
                  finalCallback(itemTemplate.key, true, progressCallback);
                  resolve(itemTemplate);
              }
              else {
                  finalCallback(itemTemplate.key, false, progressCallback);
                  reject({ success: false });
              }
          }, function () {
              finalCallback(itemTemplate.key, false, progressCallback);
              reject({ success: false });
          });
      });
  }

  var GenericModule = /*#__PURE__*/Object.freeze({
    convertItemToTemplate: convertItemToTemplate$5,
    createItemFromTemplate: createItemFromTemplate$5
  });

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
  /**
   * Mapping from item type to module with type-specific template-handling code
   */
  var moduleMap = {
      "dashboard": DashboardModule,
      "feature service": FeatureServiceModule,
      "group": GroupModule,
      "web map": WebMapModule,
      "web mapping application": WebMappingApplicationModule
  };
  // -- Externals ------------------------------------------------------------------------------------------------------//
  /**
   * Returns a list of the currently-supported AGO item types.
   *
   * @return List of item type names; names are all-lowercase forms of standard names
   */
  function getSupportedItemTypes() {
      return Object.keys(moduleMap);
  }
  /**
   * Fetches the item and data sections, the resource and dependencies lists, and the item-type-specific
   * functions for an item using its AGOL item id, and then calls a type-specific function to convert
   * the item into a template.
   *
   * @param itemId AGO id of solution template item to templatize
   * @param requestOptions Options for the request
   * @return A promise which will resolve with an item template
   */
  function convertItemToTemplate$6(itemId, requestOptions) {
      return new Promise(function (resolve, reject) {
          var itemTemplate;
          // Request item base section
          getItem(itemId, requestOptions)
              .then(function (itemResponse) {
              if (!moduleMap[itemResponse.type.toLowerCase()]) {
                  console.warn("Unimplemented item type " + itemResponse.type + " for " + itemId);
              }
              itemTemplate = {
                  itemId: itemResponse.id,
                  type: itemResponse.type,
                  key: createId(),
                  item: removeUndesirableItemProperties(itemResponse),
                  dependencies: [],
                  fcns: moduleMap[itemResponse.type.toLowerCase()] || GenericModule,
                  estimatedDeploymentCostFactor: 3 // minimal set is starting, creating, done|failed
              };
              itemTemplate.item.id = templatize(itemTemplate.item.id);
              if (itemTemplate.item.item) {
                  itemTemplate.item.item = templatize(itemTemplate.item.item);
              }
              // Convert relative thumbnail URL to an absolute one so that it can be preserved
              // TODO disconnected deployment may not have access to the absolute URL
              itemTemplate.item.thumbnail = "https://www.arcgis.com/sharing/content/items/" +
                  itemId + "/info/" + itemTemplate.item.thumbnail;
              // Request item data section
              var dataPromise = getItemData(itemId, requestOptions);
              // Request item resources
              var resourceRequestOptions = __assign({ id: itemId }, requestOptions);
              var resourcePromise = getItemResources(resourceRequestOptions);
              // Items without a data section return an error from the REST library, so we'll need to prevent it
              // from killing off both promises. This means that there's no `reject` clause to handle, hence:
              // tslint:disable-next-line:no-floating-promises
              Promise.all([
                  dataPromise.catch(function () { return null; }),
                  resourcePromise.catch(function () { return null; })
              ])
                  .then(function (responses) {
                  var dataResponse = responses[0], resourceResponse = responses[1];
                  itemTemplate.data = dataResponse;
                  itemTemplate.resources = resourceResponse && resourceResponse.total > 0 ? resourceResponse.resources : null;
                  // Create the item's template
                  itemTemplate.fcns.convertItemToTemplate(itemTemplate, requestOptions)
                      .then(function (template) {
                      itemTemplate.dependencies = removeDuplicates((template.dependencies || [])
                          .reduce(function (acc, val) { return acc.concat(val); }, []) // some dependencies come out as nested, so flatten
                      );
                      resolve(itemTemplate);
                  }, function () { return reject({ success: false }); });
              });
          }, function () {
              // If item query fails, try URL for group base section
              getGroup(itemId, requestOptions)
                  .then(function (itemResponse) {
                  itemTemplate = {
                      itemId: itemResponse.id,
                      type: "Group",
                      key: createId(),
                      item: removeUndesirableItemProperties(itemResponse),
                      dependencies: [],
                      fcns: moduleMap["group"],
                      estimatedDeploymentCostFactor: 3 // minimal set is starting, creating, done|failed
                  };
                  // Convert relative thumbnail URL to an absolute one so that it can be preserved
                  // TODO disconnected deployment may not have access to the absolute URL
                  itemTemplate.item.thumbnail = "https://www.arcgis.com/sharing/content/items/" +
                      itemId + "/info/" + itemTemplate.item.thumbnail;
                  // Create the item's template
                  itemTemplate.fcns.convertItemToTemplate(itemTemplate, requestOptions)
                      .then(function (template) {
                      itemTemplate.dependencies = removeDuplicates((template.dependencies || [])
                          .reduce(function (acc, val) { return acc.concat(val); }, []) // some dependencies come out as nested, so flatten
                      );
                      resolve(itemTemplate);
                  }, function () { return reject({ success: false }); });
              }, function () { return reject({ success: false }); });
          });
      });
  }
  /**
   * Loads the item-type-specific functions for an item.
   *
   * @param itemTemplate Item template to update
   * @return Updated item template
   */
  function initItemTemplateFromJSON(itemTemplate) {
      itemTemplate.fcns = moduleMap[itemTemplate.type.toLowerCase()] || GenericModule;
      return itemTemplate;
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * Removes duplicates from an array of strings.
   *
   * @param arrayWithDups An array to be copied
   * @return Copy of array with duplicates removed
   * @protected
   */
  function removeDuplicates(arrayWithDups) {
      var uniqueStrings = {};
      arrayWithDups.forEach(function (arrayElem) { return uniqueStrings[arrayElem] = true; });
      return Object.keys(uniqueStrings);
  }
  /**
   * Creates a copy of item base properties with properties irrelevant to cloning removed.
   *
   * @param item The base section of an item
   * @return Cloned copy of item without certain properties such as `created`, `modified`,
   *        `owner`,...; note that is is a shallow copy
   * @protected
   */
  function removeUndesirableItemProperties(item) {
      if (item) {
          var itemSectionClone = __assign({}, item);
          delete itemSectionClone.avgRating;
          delete itemSectionClone.created;
          delete itemSectionClone.guid;
          delete itemSectionClone.lastModified;
          delete itemSectionClone.modified;
          delete itemSectionClone.numComments;
          delete itemSectionClone.numRatings;
          delete itemSectionClone.numViews;
          delete itemSectionClone.orgId;
          delete itemSectionClone.owner;
          delete itemSectionClone.scoreCompleteness;
          delete itemSectionClone.size;
          delete itemSectionClone.uploaded;
          return itemSectionClone;
      }
      return null;
  }

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
  // -- Externals ------------------------------------------------------------------------------------------------------//
  /**
   * Creates a solution template item.
   *
   * @param title The title to use for the item
   * @param version The version to include in the item's metadata
   * @param ids AGO id string or list of AGO id strings
   * @param sourceRequestOptions Options for requesting information from AGO about items to be
   *                             included in solution template
   * @param destinationRequestOptions Options for creating solution template item in AGO
   * @return A promise that will resolve with a solution template item
   */
  function createSolutionTemplate(title, version, ids, sourceRequestOptions, destinationRequestOptions) {
      return new Promise(function (resolve, reject) {
          // Create an empty solution template item
          createSolutionTemplateItem(title, version, destinationRequestOptions, undefined, "public")
              .then(function (solutionTemplateItem) {
              // Get the templates for the items in the solution
              createSolutionItemTemplates(ids, solutionTemplateItem, sourceRequestOptions)
                  .then(function (templates) {
                  solutionTemplateItem.data.templates = templates;
                  // Update the solution template item
                  updateSolutionTemplateItem(solutionTemplateItem, destinationRequestOptions)
                      .then(function (updatedSolutionTemplateItem) {
                      resolve(updatedSolutionTemplateItem);
                  }, function () { return reject({ success: false }); });
              }, function () { return reject({ success: false }); });
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Converts a solution template into an AGO deployed solution and items.
   *
   * @param solutionTemplateItem Solution template to deploy
   * @param requestOptions Options for the request
   * @param settings Hash of facts: org URL, adlib replacements
   * @param progressCallback Function for reporting progress updates from type-specific template
   *                         handlers
   * @return A promise that will resolve with a list of the ids of items created in AGO
   */
  function createSolutionFromTemplate(solutionTemplateItem, requestOptions, settings, progressCallback) {
      if (settings === void 0) { settings = {}; }
      return new Promise(function (resolve, reject) {
          var templates = solutionTemplateItem.data.templates;
          var clonedSolution = [];
          settings.solutionName = settings.solutionName || "Solution";
          // Don't bother creating folder if there are no items in solution
          if (!templates || Object.keys(templates).length === 0) {
              resolve(clonedSolution);
          }
          // Run through the list of item ids in clone order
          var cloneOrderChecklist = topologicallySortItems(templates);
          // -------------------------------------------------------------------------
          // Common launch point whether using an existing folder or following the creation of one
          // Creates deployed solution item, then launches deployment of its items
          function launchDeployment() {
              createDeployedSolutionItem(settings.solutionName, solutionTemplateItem, requestOptions, settings, 'public')
                  .then(function (solutionItem) {
                  progressCallback({
                      processId: solutionItem.id,
                      type: "Solution",
                      status: "done"
                  });
                  runThroughChecklistInParallel();
              }, function () { return reject({ success: false }); });
          }
          // Trigger creation of all items in list and wait for completion
          function runThroughChecklistInParallel() {
              var awaitAllItems = [];
              cloneOrderChecklist.forEach(function (id) { return awaitAllItems.push(createItemFromTemplateWhenReady(id, templates, requestOptions, settings, progressCallback)); });
              // Wait until all items have been created
              Promise.all(awaitAllItems)
                  .then(function (clonedSolutionItems) { return resolve(clonedSolutionItems); }, function () { return reject({ success: false }); });
          }
          // -------------------------------------------------------------------------
          // Use specified folder to hold the hydrated items to avoid name clashes
          if (settings.folderId) {
              launchDeployment();
          }
          else {
              // Create a folder to hold the hydrated items to avoid name clashes
              var folderName = settings.solutionName + " (" + getUTCTimestamp() + ")";
              var options = {
                  title: folderName,
                  authentication: requestOptions.authentication
              };
              createFolder(options)
                  .then(function (createdFolderResponse) {
                  settings.folderId = createdFolderResponse.folder.id;
                  launchDeployment();
              }, function () { return reject({ success: false }); });
          }
      });
  }
  /**
   * Returns the sum of the estimated cost factors of a set of templates.
   *
   * @param templates A collection of AGO item templates
   * @return Sum of cost factors
   */
  function getEstimatedDeploymentCost(templates) {
      // Get the total estimated cost of creating this solution
      var reducer = function (accumulator, currentTemplate) {
          return accumulator + (currentTemplate.estimatedDeploymentCostFactor ?
              currentTemplate.estimatedDeploymentCostFactor : 3);
      };
      return templates.reduce(reducer, 0);
  }
  /**
   * Returns a list of the currently-supported AGO item types.
   *
   * @return List of item type names; names are all-lowercase forms of standard names
   */
  function getSupportedItemTypes$1() {
      return getSupportedItemTypes();
  }
  // -- Internals ------------------------------------------------------------------------------------------------------//
  // (export decoration is for unit testing)
  /**
   * A parameterized server name to replace the organization URL in a Web Mapping Application's URL to
   * itself; name has to be acceptable to AGO, otherwise it discards the URL, so substitution must be
   * made before attempting to create the item.
   * @protected
   */
  var PLACEHOLDER_SERVER_NAME$1 = "{{organization.portalBaseUrl}}";
  /**
   * The portion of a Dashboard app URL between the server and the app id.
   * @protected
   */
  var OPS_DASHBOARD_APP_URL_PART$1 = "/apps/opsdashboard/index.html#/";
  /**
   * The portion of a Webmap URL between the server and the map id.
   * @protected
   */
  var WEBMAP_APP_URL_PART$1 = "/home/webmap/viewer.html?webmap=";
  /**
   * A visit flag used in the topological sort algorithm.
   * @protected
   */
  var SortVisitColor;
  (function (SortVisitColor) {
      /** not yet visited */
      SortVisitColor[SortVisitColor["White"] = 0] = "White";
      /** visited, in progress */
      SortVisitColor[SortVisitColor["Gray"] = 1] = "Gray";
      /** finished */
      SortVisitColor[SortVisitColor["Black"] = 2] = "Black";
  })(SortVisitColor || (SortVisitColor = {}));
  /**
   * Creates an empty template.
   *
   * @param id AGO id of item
   * @return Empty template containing supplied id
   * @protected
   */
  function createPlaceholderTemplate(id) {
      return {
          itemId: id,
          type: "",
          key: "",
          item: null
      };
  }
  /**
   * Creates an empty deployed solution AGO item.
   *
   * @param title Title to use for item
   * @param solutionTemplateItem Solution template to deploy; serves as source of text info for new
   *                             item
   * @param requestOptions Options for the request
   * @param settings Hash of facts: org URL, adlib replacements
   * @param access Access to set for item: 'public', 'org', 'private'
   * @return Empty template item
   * @protected
   */
  function createDeployedSolutionItem(title, solutionTemplateItem, requestOptions, settings, access) {
      if (settings === void 0) { settings = {}; }
      if (access === void 0) { access = "private"; }
      return new Promise(function (resolve, reject) {
          var templateItem = solutionTemplateItem.item;
          var thumbnailUrl = "https://www.arcgis.com/sharing/content/items/" +
              templateItem.id + "/info/" + templateItem.thumbnail;
          var item = {
              itemType: "text",
              name: null,
              title: title,
              description: templateItem.description,
              tags: templateItem.tags,
              snippet: templateItem.snippet,
              thumbnailurl: thumbnailUrl,
              accessInformation: templateItem.accessInformation,
              type: "Solution",
              typeKeywords: ["Solution", "Deployed"],
              commentsEnabled: false
          };
          createItemWithData(item, null, requestOptions, settings.folderId, access)
              .then(function (createResponse) {
              var orgUrl = (settings.organization && settings.organization.orgUrl) || "https://www.arcgis.com";
              var deployedSolutionItem = {
                  id: createResponse.id,
                  url: orgUrl + "/home/item.html?id=" + createResponse.id
              };
              resolve(deployedSolutionItem);
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Fetches an AGO item and converts it into a template after its dependencies have been fetched and
   * converted.
   *
   * @param itemId AGO id of solution template item to deploy
   * @param templates A collection of AGO item templates
   * @param requestOptions Options for the request
   * @param settings Hash of facts: org URL, adlib replacements
   * @param progressCallback Function for reporting progress updates from type-specific template
   *                         handlers
   * @return A promise that will resolve with the item's template (which is simply returned if it's
   *         already in the templates list
   * @protected
   */
  function createItemFromTemplateWhenReady(itemId, templates, requestOptions, settings, progressCallback) {
      settings[itemId] = {};
      var itemDef = new Promise(function (resolve, reject) {
          var template = findTemplateInList(templates, itemId);
          if (!template) {
              reject({ success: false });
          }
          // Wait until all dependencies are deployed
          var awaitDependencies = [];
          (template.dependencies || []).forEach(function (dependencyId) { return awaitDependencies.push(settings[dependencyId].def); });
          Promise.all(awaitDependencies)
              .then(function () {
              // Prepare template
              var itemTemplate = initItemTemplateFromJSON(findTemplateInList(templates, itemId));
              // Interpolate it
              itemTemplate.dependencies = itemTemplate.dependencies ?
                  templatize(itemTemplate.dependencies) : [];
              itemTemplate = adlib(itemTemplate, settings);
              // Deploy it
              itemTemplate.fcns.createItemFromTemplate(itemTemplate, settings, requestOptions, progressCallback)
                  .then(function (itemClone) { return resolve(itemClone); }, function () { return reject({ success: false }); });
          }, function () { return reject({ success: false }); });
      });
      // Save the deferred for the use of items that depend on this item being created first
      settings[itemId].def = itemDef;
      return itemDef;
  }
  /**
   * Creates templates for a set of AGO items.
   *
   * @param ids AGO id string or list of AGO id strings
   * @param solutionTemplateItem Solution template serving as parent for templates
   * @param requestOptions Options for the request
   * @param templates A collection of AGO item templates that can be referenced by newly-created
   *                  templates
   * @return A promise that will resolve with the created template items
   * @protected
   */
  function createSolutionItemTemplates(ids, solutionTemplateItem, requestOptions, templates) {
      if (!templates) {
          templates = [];
      }
      return new Promise(function (resolve, reject) {
          if (typeof ids === "string") {
              // Handle a single AGO id
              var rootId = ids;
              if (findTemplateInList(templates, rootId)) {
                  resolve(templates); // Item and its dependents are already in list or are queued
              }
              else {
                  // Add the id as a placeholder to show that it will be fetched
                  var getItemPromise = convertItemToTemplate$6(rootId, requestOptions);
                  templates.push(createPlaceholderTemplate(rootId));
                  // Get the specified item
                  getItemPromise
                      .then(function (itemTemplate) {
                      // Set the value keyed by the id, replacing the placeholder
                      replaceTemplate(templates, itemTemplate.itemId, itemTemplate);
                      // Trace item dependencies
                      if (itemTemplate.dependencies.length === 0) {
                          resolve(templates);
                      }
                      else {
                          // Get its dependents, asking each to get its dependents via
                          // recursive calls to this function
                          var dependentDfds_1 = [];
                          itemTemplate.dependencies.forEach(function (dependentId) {
                              if (!findTemplateInList(templates, dependentId)) {
                                  dependentDfds_1.push(createSolutionItemTemplates(dependentId, solutionTemplateItem, requestOptions, templates));
                              }
                          });
                          Promise.all(dependentDfds_1)
                              .then(function () {
                              resolve(templates);
                          }, function () { return reject({ success: false }); });
                      }
                  }, function () { return reject({ success: false }); });
              }
          }
          else if (Array.isArray(ids) && ids.length > 0) {
              // Handle a list of one or more AGO ids by stepping through the list
              // and calling this function recursively
              var getHierarchyPromise_1 = [];
              ids.forEach(function (id) {
                  getHierarchyPromise_1.push(createSolutionItemTemplates(id, solutionTemplateItem, requestOptions, templates));
              });
              Promise.all(getHierarchyPromise_1)
                  .then(function () {
                  resolve(templates);
              }, function () { return reject({ success: false }); });
          }
          else {
              reject({ success: false });
          }
      });
  }
  /**
   * Creates an empty solution template AGO item.
   *
   * @param title The title to use for the item
   * @param version The version to include in the item's metadata
   * @param requestOptions Options for the request
   * @param settings Hash of facts: org URL, adlib replacements
   * @param access Access to set for item: 'public', 'org', 'private'
   * @return Empty template item
   * @protected
   */
  function createSolutionTemplateItem(title, version, requestOptions, settings, access) {
      if (settings === void 0) { settings = {}; }
      if (access === void 0) { access = "private"; }
      return new Promise(function (resolve, reject) {
          var solutionTemplateItem = {
              item: {
                  itemType: "text",
                  name: null,
                  title: title,
                  type: "Solution",
                  typeKeywords: ["Solution", "Template"],
                  commentsEnabled: false
              },
              data: {
                  metadata: {
                      version: version
                  },
                  templates: []
              }
          };
          createItemWithData(solutionTemplateItem.item, solutionTemplateItem.data, requestOptions, settings.folderId, access)
              .then(function (createResponse) {
              var orgUrl = (settings.organization && settings.organization.orgUrl) || "https://www.arcgis.com";
              solutionTemplateItem.item.id = createResponse.id;
              solutionTemplateItem.item.url = orgUrl + "/home/item.html?id=" + createResponse.id;
              resolve(solutionTemplateItem);
          }, function () { return reject({ success: false }); });
      });
  }
  /**
   * Finds index of template by id in a list of templates.
   *
   * @param templates A collection of AGO item templates to search
   * @param id AGO id of template to find
   * @return Id of matching template or -1 if not found
   * @protected
   */
  function findTemplateIndexInSolution(templates, id) {
      var baseId = deTemplatize(id);
      return templates.findIndex(function (template) {
          return baseId === deTemplatize(template.itemId);
      });
  }
  /**
   * Finds template by id in a list of templates.
   *
   * @param templates A collection of AGO item templates to search
   * @param id AGO id of template to find
   * @return Matching template or null
   */
  function findTemplateInList(templates, id) {
      var childId = findTemplateIndexInSolution(templates, id);
      return childId >= 0 ? templates[childId] : null;
  }
  /**
   * Creates a Solution item containing JSON descriptions of items forming the solution.
   *
   * @param title Title for Solution item to create
   * @param templates Hash of JSON descriptions of items to publish into Solution
   * @param requestOptions Options for the request
   * @param folderId Id of folder to receive item; null/empty indicates that the item goes into the root
   *                 folder; ignored for Group item type
   * @param access Access to set for item: 'public', 'org', 'private'
   * @return A promise that will resolve with an object reporting success and the solution id
   * @protected
   */
  function publishSolutionTemplate(title, templates, requestOptions, folderId, access) {
      if (folderId === void 0) { folderId = null; }
      if (access === void 0) { access = "private"; }
      // Define the solution item
      var item = {
          title: title,
          type: "Solution",
          itemType: "text",
          typeKeywords: ["Template"],
          access: access,
          listed: false,
          commentsEnabled: false
      };
      var data = {
          templates: templates
      };
      return createItemWithData(item, data, requestOptions, folderId, access);
  }
  /**
   * Replaces a template entry in a list of templates
   *
   * @param templates A collection of AGO item templates
   * @param id Id of item in templates list to find; if not found, no replacement is () => done()
   * @param template Replacement template
   * @return True if replacement was made
   * @protected
   */
  function replaceTemplate(templates, id, template) {
      var i = findTemplateIndexInSolution(templates, id);
      if (i >= 0) {
          templates[i] = template;
          return true;
      }
      return false;
  }
  /**
   * Topologically sort a Solution's items into a build list.
   *
   * @param templates A collection of AGO item templates
   * @return List of ids of items in the order in which they need to be built so that dependencies
   * are built before items that require those dependencies
   * @throws Error("Cyclical dependency graph detected")
   * @protected
   */
  function topologicallySortItems(templates) {
      // Cormen, Thomas H.; Leiserson, Charles E.; Rivest, Ronald L.; Stein, Clifford (2009)
      // Sections 22.3 (Depth-first search) & 22.4 (Topological sort), pp. 603-615
      // Introduction to Algorithms (3rd ed.), The MIT Press, ISBN 978-0-262-03384-8
      //
      // DFS(G)
      // 1 for each vertex u ∈ G,V
      // 2     u.color = WHITE
      // 3     u.π = NIL
      // 4 time = 0
      // 5 for each vertex u ∈ G,V
      // 6     if u.color == WHITE
      // 7         DFS-VISIT(G,u)
      //
      // DFS-VISIT(G,u)
      // 1 time = time + 1    // white vertex u has just been discovered
      // 2 u.d = time
      // 3 u.color = GRAY
      // 4 for each v ∈ G.Adj[u]     // explore edge (u,v)
      // 5     if v.color == WHITE
      // 6         v.π = u
      // 7         DFS-VISIT(G,v)
      // 8 u.color = BLACK         // blacken u; it is finished
      // 9 time = time + 1
      // 10 u.f = time
      //
      // TOPOLOGICAL-SORT(G)
      // 1 call DFS(G) to compute finishing times v.f for each vertex v
      // 2 as each vertex is finished, insert it onto front of a linked list
      // 3 return the linked list of vertices
      var buildList = []; // list of ordered vertices--don't need linked list because
      // we just want relative ordering
      var verticesToVisit = {};
      templates.forEach(function (template) {
          verticesToVisit[template.itemId] = SortVisitColor.White; // not yet visited
      });
      // Algorithm visits each vertex once. Don't need to record times or "from' nodes ("π" in pseudocode)
      templates.forEach(function (template) {
          if (verticesToVisit[template.itemId] === SortVisitColor.White) { // if not yet visited
              visit(template.itemId);
          }
      });
      // Visit vertex
      function visit(vertexId) {
          verticesToVisit[vertexId] = SortVisitColor.Gray; // visited, in progress
          // Visit dependents if not already visited
          var template = findTemplateInList(templates, vertexId);
          var dependencies = template.dependencies || [];
          dependencies.forEach(function (dependencyId) {
              if (verticesToVisit[dependencyId] === SortVisitColor.White) { // if not yet visited
                  visit(dependencyId);
              }
              else if (verticesToVisit[dependencyId] === SortVisitColor.Gray) { // visited, in progress
                  throw Error("Cyclical dependency graph detected");
              }
          });
          verticesToVisit[vertexId] = SortVisitColor.Black; // finished
          buildList.push(vertexId); // add to end of list of ordered vertices because we want dependents first
      }
      return buildList;
  }
  /**
   * Updates the data section of an solution template in AGO.
   *
   * @param solutionTemplateItem Solution template to update
   * @param requestOptions Options for the request
   * @return A promise that will resolve with solutionTemplateItem
   * @protected
   */
  function updateSolutionTemplateItem(solutionTemplateItem, requestOptions) {
      return new Promise(function (resolve, reject) {
          // Update the data section of the solution item
          updateItemData(solutionTemplateItem.item.id, solutionTemplateItem.data, requestOptions)
              .then(function () { return resolve(solutionTemplateItem); }, function () { return reject({ success: false }); });
      });
  }

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
  /**
   * Extracts item hierarchy structure from a solution template.
   *
   * @param templates A collection of AGO item templates
   * @return JSON structure reflecting dependency hierarchy of items; shared dependencies are
   * repeated; each element of the structure contains the AGOL id of an item and a list of ids of the
   * item's dependencies
   */
  function getItemHierarchy(templates) {
      var hierarchy = [];
      // Find the top-level nodes. Start with all nodes, then remove those that other nodes depend on
      var topLevelItemIds = getTopLevelItemIds(templates);
      // Hierarchically list the children of specified nodes
      function itemChildren(children, accumulatedHierarchy) {
          // Visit each child
          children.forEach(function (id) {
              var child = {
                  id: id,
                  dependencies: []
              };
              // Fill in the child's dependencies array with its children
              var template = findTemplateInList(templates, id);
              var dependencyIds = template.dependencies;
              if (Array.isArray(dependencyIds) && dependencyIds.length > 0) {
                  itemChildren(dependencyIds, child.dependencies);
              }
              accumulatedHierarchy.push(child);
          });
      }
      itemChildren(topLevelItemIds, hierarchy);
      return hierarchy;
  }
  /**
   * Gets a list of the top-level items in a Solution, i.e., the items that no other item depends on.
   *
   * @param templates A collection of AGO item templates
   * @return List of ids of top-level items in Solution
   */
  function getTopLevelItemIds(templates) {
      // Find the top-level nodes. Start with all nodes, then remove those that other nodes depend on
      var topLevelItemCandidateIds = templates.map(function (template) {
          return template.itemId;
      });
      templates.forEach(function (template) {
          (template.dependencies || []).forEach(function (dependencyId) {
              var iNode = topLevelItemCandidateIds.indexOf(dependencyId);
              if (iNode >= 0) {
                  // Node is somebody's dependency, so remove the node from the list of top-level nodes
                  // If iNode == -1, then it's a shared dependency and it has already been removed
                  topLevelItemCandidateIds.splice(iNode, 1);
              }
          });
      });
      return topLevelItemCandidateIds;
  }

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

  exports.createSolutionTemplate = createSolutionTemplate;
  exports.createSolutionFromTemplate = createSolutionFromTemplate;
  exports.getEstimatedDeploymentCost = getEstimatedDeploymentCost;
  exports.getSupportedItemTypes = getSupportedItemTypes$1;
  exports.PLACEHOLDER_SERVER_NAME = PLACEHOLDER_SERVER_NAME$1;
  exports.OPS_DASHBOARD_APP_URL_PART = OPS_DASHBOARD_APP_URL_PART$1;
  exports.WEBMAP_APP_URL_PART = WEBMAP_APP_URL_PART$1;
  exports.createDeployedSolutionItem = createDeployedSolutionItem;
  exports.createItemFromTemplateWhenReady = createItemFromTemplateWhenReady;
  exports.createSolutionItemTemplates = createSolutionItemTemplates;
  exports.createSolutionTemplateItem = createSolutionTemplateItem;
  exports.findTemplateInList = findTemplateInList;
  exports.publishSolutionTemplate = publishSolutionTemplate;
  exports.replaceTemplate = replaceTemplate;
  exports.topologicallySortItems = topologicallySortItems;
  exports.getItemHierarchy = getItemHierarchy;
  exports.getTopLevelItemIds = getTopLevelItemIds;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=arcgis-clone.umd.js.map