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


import {
  extractDependencies,
} from '../../src/itemTypes/webmappingapplication';


describe('Web Mapping Application', () => {

  describe('extractDependencies', () => {

    it('returns various ids from named props in generic items', () => {
      const m = {
        item: {
          typeKeywords: ['Javascript']
        },
        data: {
          webmap: '3ef',
          itemId: 'bc3',
          values: {
            webmap: 'ef3',
            group: 'bc7'
          }
        }
      };
      const r = extractDependencies(m);
      expect(Array.isArray(r)).toBeTruthy('should be an array');
      expect(r.length).toEqual(4, 'should have 4 entries');
      expect(r).toEqual(['3ef', 'bc3', 'ef3', 'bc7']);
    });

    it('processes a storymap', () => {
      const m = {
        item: {
          typeKeywords: ['Story Map', 'MapJournal']
        },
        data: {
          values: {
            story: {
              sections: [
                {
                  media: {
                    type: 'webmap',
                    webmap: {
                      id: '234'
                    }
                  }
                }
              ]
            }
          }
        }
      };
      const r = extractDependencies(m);
      expect(Array.isArray(r)).toBeTruthy('should be an array');
      expect(r.length).toEqual(1, 'should have 1 entries');
      expect(r).toEqual(['234']);
    });

    it('processes a WAB', () => {
      const m = {
        item: {
          typeKeywords: ['Web AppBuilder']
        },
        data: {
          map: {
            itemId: '3ef'
          }
        }
      };
      const r = extractDependencies(m);
      expect(Array.isArray(r)).toBeTruthy('should be an array');
      expect(r.length).toEqual(1, 'should have 1 entries');
      expect(r).toEqual(['3ef']);
    });

  });

});