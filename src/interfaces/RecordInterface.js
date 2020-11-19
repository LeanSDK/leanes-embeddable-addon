// This file is part of leanes-mapper-addon.
//
// leanes-mapper-addon is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// leanes-mapper-addon is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with leanes-mapper-addon.  If not, see <https://www.gnu.org/licenses/>.

// import type { CollectionInterface } from './CollectionInterface';
// import type { RecordStaticInterface } from './RecordStaticInterface';

export interface RecordInterface  {
  parseRecordName(asName: string): [string, string];
  findRecordByName(asName: string): Class<*>;

  save(): Promise<RecordInterface>;
  create(): Promise<RecordInterface>;
  update(): Promise<RecordInterface>;
  'delete'(): Promise<void | RecordInterface>;
  destroy(): Promise<void>;
  attributes(): object;
  clone(): Promise<RecordInterface>;
  copy(): Promise<RecordInterface>;
  decrement(asAttribute: string, step: ?number): Promise<RecordInterface>;
  increment(asAttribute: string, step: ?number): Promise<RecordInterface>;
  toggle(asAttribute: string): Promise<RecordInterface>;
  // touch(): Promise<RecordInterface>;
  updateAttribute(name: string, value: ?any): Promise<RecordInterface>;
  updateAttributes(aoAttributes: object): Promise<RecordInterface>;
  isNew(): Promise<boolean>;
  reload(): Promise<RecordInterface>;
  changedAttributes(): Promise<{[key: string]: [?any, ?any]}>;
  resetAttribute(asAttribute: string): Promise<void>;
  rollbackAttributes(): Promise<void>;
}
