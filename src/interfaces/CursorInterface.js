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

export interface CursorInterface<
  Collection, Delegate, Iterable = Delegate[]
> {
  isClosed: boolean;

  setCollection(aoCollection: Collection): CursorInterface;

  setIterable(alArray: Iterable): CursorInterface;

  toArray(): Promise<Delegate[]>;

  next(): Promise<?Delegate>;

  hasNext(): Promise<boolean>;

  close(): Promise<void>;

  count(): Promise<number>;

  forEach(lambda: (Delegate, number) => ?Promise<void>): Promise<void>;

  map<R>(lambda: (Delegate, number) => R | Promise<R>): Promise<R[]>;

  filter(lambda: (Delegate, number) => boolean | Promise<boolean>): Promise<Delegate[]>;

  find(lambda: (Delegate, number) => boolean | Promise<boolean>): Promise<?Delegate>;

  compact(): Promise<Delegate[]>;

  reduce<I>(lambda: (I, Delegate, number) => I | Promise<I>, initialValue: I): Promise<I>;

  first(): Promise<?Delegate>;
}
