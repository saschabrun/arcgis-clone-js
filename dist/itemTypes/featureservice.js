"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var adlib = require("adlib");
var featureServiceAdmin = require("@esri/arcgis-rest-feature-service-admin");
var items = require("@esri/arcgis-rest-items");
var arcgis_rest_request_1 = require("@esri/arcgis-rest-request");
var mCommon = require("./common");
// -- Externals ------------------------------------------------------------------------------------------------------//
// -- Create Bundle Process ------------------------------------------------------------------------------------------//
function convertItemToTemplate(itemTemplate, requestOptions) {
    return new Promise(function (resolve, reject) {
        // Update the estimated cost factor to deploy this item
        itemTemplate.estimatedDeploymentCostFactor = 3;
        // Common templatizations: extent, item id, item dependency ids
        mCommon.doCommonTemplatizations(itemTemplate);
        fleshOutFeatureService(itemTemplate, requestOptions)
            .then(function () { return resolve(itemTemplate); }, function () { return reject({ success: false }); });
    });
}
exports.convertItemToTemplate = convertItemToTemplate;
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
function createItemFromTemplate(itemTemplate, settings, requestOptions, progressCallback) {
    progressCallback && progressCallback({
        processId: itemTemplate.key,
        type: itemTemplate.type,
        status: "starting"
    });
    return new Promise(function (resolve, reject) {
        var createOptions = tslib_1.__assign({ item: itemTemplate.item, folderId: settings.folderId }, requestOptions);
        if (itemTemplate.data) {
            createOptions.item.text = itemTemplate.data;
        }
        // Make the item name unique
        createOptions.item.name = itemTemplate.item.name + "_" + mCommon.getUTCTimestamp();
        // Create the item
        progressCallback && progressCallback({
            processId: itemTemplate.key,
            status: "creating",
        });
        featureServiceAdmin.createFeatureService(createOptions)
            .then(function (createResponse) {
            // Add the new item to the settings list
            settings[mCommon.deTemplatize(itemTemplate.itemId)] = {
                id: createResponse.serviceItemId,
                url: createResponse.serviceurl
            };
            itemTemplate.itemId = itemTemplate.item.id = createResponse.serviceItemId;
            itemTemplate = adlib.adlib(itemTemplate, settings);
            itemTemplate.item.url = createResponse.serviceurl;
            // Update item using a unique name because createFeatureService doesn't provide a way to specify
            // snippet, description, etc.
            var updateOptions = tslib_1.__assign({ item: {
                    id: itemTemplate.itemId,
                    title: itemTemplate.item.title,
                    snippet: itemTemplate.item.snippet,
                    description: itemTemplate.item.description,
                    accessInfo: itemTemplate.item.accessInfo,
                    licenseInfo: itemTemplate.item.licenseInfo,
                    text: itemTemplate.data
                } }, requestOptions);
            items.updateItem(updateOptions)
                .then(function () {
                // Add the feature service's layers and tables to it
                addFeatureServiceLayersAndTables(itemTemplate, settings, requestOptions, progressCallback)
                    .then(function () {
                    mCommon.finalCallback(itemTemplate.key, true, progressCallback);
                    resolve(itemTemplate);
                }, function () {
                    mCommon.finalCallback(itemTemplate.key, false, progressCallback);
                    reject({ success: false });
                });
            }, function () {
                mCommon.finalCallback(itemTemplate.key, false, progressCallback);
                reject({ success: false });
            });
        }, function () {
            mCommon.finalCallback(itemTemplate.key, false, progressCallback);
            reject({ success: false });
        });
    });
}
exports.createItemFromTemplate = createItemFromTemplate;
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
                        var options = tslib_1.__assign({ params: {
                                updateFeatureServiceDefinition: {
                                    relationships: relationships[id]
                                }
                            } }, requestOptions);
                        featureServiceAdmin.addToServiceDefinition(itemTemplate.item.url + "/" + id, options)
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
exports.addFeatureServiceLayersAndTables = addFeatureServiceLayersAndTables;
function countRelationships(layers) {
    var reducer = function (accumulator, currentLayer) {
        return accumulator + (currentLayer.relationships ? currentLayer.relationships.length : 0);
    };
    return layers.reduce(reducer, 0);
}
exports.countRelationships = countRelationships;
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
        itemTemplate.item.url = mCommon.templatize(itemTemplate.itemId, "url");
        arcgis_rest_request_1.request(serviceUrl + "?f=json", requestOptions)
            .then(function (serviceData) {
            serviceData.serviceItemId = mCommon.templatize(serviceData.serviceItemId);
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
exports.fleshOutFeatureService = fleshOutFeatureService;
/**
 * Gets the name of the first layer in list of layers that has a name
 * @param layerList List of layers to use as a name source
 * @return The name of the found layer or an empty string if no layers have a name
 * @protected
 */
function getFirstUsableName(layerList) {
    var name = "";
    // Return the first layer name found
    if (Array.isArray(layerList) && layerList.length > 0) {
        layerList.some(function (layer) {
            if (layer["name"] !== "") {
                name = layer["name"];
                return true;
            }
            return false;
        });
    }
    return name;
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
            requestsDfd.push(arcgis_rest_request_1.request(serviceUrl + "/" + layer["id"] + "?f=json", requestOptions));
        });
        // Wait until all layers are heard from
        Promise.all(requestsDfd)
            .then(function (layers) {
            // Remove the editFieldsInfo because it references fields that may not be in the layer/table;
            // templatize the layer's serviceItemId
            layers.forEach(function (layer) {
                layer["editFieldsInfo"] = null;
                layer["serviceItemId"] = mCommon.templatize(layer["serviceItemId"]);
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
            var options = tslib_1.__assign({}, requestOptions);
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
            featureServiceAdmin.addToServiceDefinition(serviceUrl, options)
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
//# sourceMappingURL=featureservice.js.map