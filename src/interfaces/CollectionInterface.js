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

// import type { RecordInterface } from './RecordInterface';
import type { CursorInterface } from './CursorInterface';

export interface CollectionInterface<T> {
  collectionName(): string;
  collectionPrefix(): string;
  collectionFullName(asName: ?string): string;
  recordHasBeenChanged(asType: string, aoData: object): void;

  generateId(): Promise<string | number>;

  build(properties: object): Promise<T>;

  create(properties: object): Promise<T>;

  push(aoRecord: T): Promise<T>;

  'delete'(id: string | number): Promise<void>;

  destroy(id: string | number): Promise<void>;

  remove(id: string | number): Promise<void>;

  find(id: string | number): Promise<?T>;

  findMany(ids: Array<string | number>): Promise<CursorInterface<CollectionInterface<T>, T>>;

  take(id: string | number): Promise<?T>;

  takeMany(ids: Array<string | number>): Promise<CursorInterface<CollectionInterface<T>, T>>;

  takeAll(): Promise<CursorInterface<CollectionInterface<T>, T>>;

  update(id: string | number, properties: object): Promise<T>;

  override(id: string | number, aoRecord: T): Promise<T>;

  clone(aoRecord: T): Promise<T>;

  copy(aoRecord: T): Promise<T>;

  includes(id: string | number): Promise<boolean>;

  length(): Promise<number>;

  // normalize(ahData: any): Promise<RecordInterface>;
  //
  // serialize(aoRecord: RecordInterface, ahOptions: ?object): Promise<any>;
}
