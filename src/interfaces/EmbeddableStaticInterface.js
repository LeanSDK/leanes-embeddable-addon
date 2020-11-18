// This file is part of leanes-embeddable-addon.
//
// leanes-embeddable-addon is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// leanes-embeddable-addon is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with leanes-embeddable-addon.  If not, see <https://www.gnu.org/licenses/>.

import type { CollectionInterface } from './CollectionInterface';
import type { RecordInterface } from './RecordInterface';
import type { EmbedConfigT } from '../types/EmbedConfigT';

export interface EmbeddableStaticInterface {
  embeddings: {[key: string]: EmbedConfigT};

  makeSnapshotWithEmbeds(aoRecord: ?RecordInterface): ?object

  (aoAttributes: object, aoCollection: CollectionInterface): RecordInterface;
}
