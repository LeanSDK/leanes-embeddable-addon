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

import assert from 'assert';
import type { RecordInterface } from '../interfaces/RecordInterface';
import type { EmbedOptionsT } from '../types/EmbedOptionsT';
import type { EmbedConfigT } from '../types/EmbedConfigT';

const cpoMetaObject = Symbol.for('~metaObject');

export default function hasEmbeds(opts: EmbedOptionsT) {
  return (target, key, descriptor) => {
    const isClass = target[cpoMetaObject] != null;
    assert(!isClass, 'Decorator `hasEmbeds` may be used with instance properties only');
    const vcClass = target.constructor;
    assert(vcClass.isExtensible, `Class '${target.name}' has been frozen previously. Property '${key}' can not be declared`);

    const {
      Pipes,
      Record,
      Utils: { _, joi, inflect, map }
    } = vcClass.Module.NS;

    const {
      LogMessage: { SEND_TO_LOG, LEVELS, DEBUG }
    } = Pipes.NS;

    opts.refKey = opts.refKey || 'id';
    opts.attr = null;
    opts.inverse = opts.inverse || `${inflect.singularize(
      inflect.camelize(vcClass.name.replace(/Record$/, ''), false)
    )}Id`;
    opts.inverseType = opts.inverseType || null;
    opts.recordName = opts.recordName || function(recordType: ?string = null): string {
      let vsModuleName, vsRecordName;
      if (recordType != null) {
        const recordClass = this.findRecordByName(recordType);
        const classNames = _.filter(
          recordClass.parentClassNames(), (name) => /.*Record$/.test(name)
        );
        vsRecordName = classNames[1];
      } else {
        [ vsModuleName, vsRecordName ] = this.parseRecordName(key);
      }
      return vsRecordName;
    };
    opts.collectionName = opts.collectionName || function(recordType: ?string = null): string {
      return `${inflect.pluralize(
        opts.recordName.call(this, recordType).replace(/Record$/, '')
      )}Collection`;
    };
    opts.validate = function() {
      if (opts.inverseType != null) {
        return joi.array().items([
          Record.schema.unknown(true), joi.any().strip()
        ]);
      } else {
        const EmbedRecord = this.findRecordByName(opts.recordName.call(this));
        return joi.array().items([EmbedRecord.schema, joi.any().strip()]);
      }
    }
    opts.embedding = 'hasEmbeds';
    opts.through = opts.through || null;
    opts.putOnly = opts.putOnly || false;
    opts.loadOnly = opts.loadOnly || false;

    opts.load = async function(): Promise<RecordInterface[]> {
      if (opts.putOnly) {
        return [];
      }
      const EmbedsCollection = this.collection
        .facade
        .retrieveProxy(opts.collectionName.call(this));

      const res = await (async () => {
        if (!opts.through) {
          const query = {[`@doc.${opts.inverse}`]: this[opts.refKey]};
          if (inverseType != null) {
            query[`@doc.${opts.inverseType}`] = this.type;
          }
          return await (await EmbedsCollection.takeBy(
            query
          )).toArray();
        } else {
          const through = this.constructor.embeddings[opts.through[0]] || (
            this.constructor.relations &&
            this.constructor.relations[opts.through[0]]
          );
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          const embedIds = await (await ThroughCollection.takeBy({
            [`@doc.${through.inverse}`]: this[opts.refKey]
          })).map((voRecord) => voRecord[opts.through[1].by]);
          return await (await EmbedsCollection.takeBy({
            [`@doc.${inverse.refKey}`]: {$in: embedIds}
          })).toArray();
        }
      })();
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.load ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
      );
      return res;
    };

    opts.put = async function(): Promise<void> {
      if (opts.loadOnly) {
        return;
      }
      const EmbedsCollection = this.collection
        .facade
        .retrieveProxy(opts.collectionName.call(this));
      const EmbedRecord = this.findRecordByName(opts.recordName.call(this));
      let alRecords = this[key];
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.put ${key} embeds ${JSON.stringify(alRecords)}`, LEVELS[DEBUG]
      );
      if (alRecords.length > 0) {
        if (!opts.through) {
          const alRecordIds = [];
          for (const aoRecord of alRecords) {
            let voRecord = null;
            if (aoRecord.constructor === Object) {
              aoRecord.type  = aoRecord.type || `${EmbedRecord.moduleName()}::${EmbedRecord.name}`;
              voRecord = await EmbedsCollection.build(aoRecord);
            } else {
              voRecord = aoRecord;
            }
            voRecord[opts.inverse] = this[opts.refKey];
            if (opts.inverseType != null) {
              voRecord[opts.inverseType] = this.type;
            }
            if (this.spaceId != null) {
              voRecord.spaceId = this.spaceId;
            }
            if (this.teamId != null) {
              voRecord.teamId = this.teamId;
            }
            voRecord.spaces = this.spaces;
            voRecord.creatorId = this.creatorId;
            voRecord.editorId = this.editorId;
            voRecord.ownerId = this.ownerId;
            const savedRecord = (
              await voRecord.isNew()
                || Object.keys(await voRecord.changedAttributes()).length
            )
              ? await voRecord.save()
              : voRecord;
            alRecordIds.push(savedRecord.id);
          }
          if (!opts.putOnly) {
            const query = {
              [`@doc.${opts.inverse}`]: this[opts.refKey],
              ['@doc.id']: {$nin: alRecordIds} // NOTE: проверяем айдишники всех только-что сохраненных
            }
            if (inverseType != null) {
              query[`@doc.${opts.inverseType}`] = this.type;
            }
            await (await EmbedsCollection.takeBy(
              query
            )).forEach(async (voRecord) => await voRecord.destroy());
          }
        } else {
          const through = this.constructor.embeddings[opts.through[0]] || (
            this.constructor.relations &&
            this.constructor.relations[opts.through[0]]
          );
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          const alRecordIds = [];
          const newRecordIds = [];
          for (const aoRecord of alRecords) {
            let voRecord = null;
            if (aoRecord.constructor === Object) {
              aoRecord.type = aoRecord.type || `${EmbedRecord.moduleName()}::${EmbedRecord.name}`;
              voRecord = await EmbedsCollection.build(aoRecord);
            } else {
              voRecord = aoRecord;
            }
            if (this.spaceId != null) {
              voRecord.spaceId = this.spaceId;
            }
            if (this.teamId != null) {
              voRecord.teamId = this.teamId;
            }
            voRecord.spaces = this.spaces;
            voRecord.creatorId = this.creatorId;
            voRecord.editorId = this.editorId;
            voRecord.ownerId = this.ownerId;
            const savedThroughRecord = await voRecord.isNew()
              ? await (async (sr) => {
                alRecordIds.push(sr[inverse.refKey]);
                newRecordIds.push(sr[inverse.refKey]);
                return sr;
              })(await voRecord.save())
              : await (async (sr) => {
                alRecordIds.push(sr[inverse.refKey]);
                return sr;
              })(Object.keys(await voRecord.changedAttributes()).length
                ? await voRecord.save()
                : voRecord);
          }
          if (!opts.putOnly) {
            const embedIds = await (await ThroughCollection.takeBy({
              [`@doc.${through.inverse}`]: this[through.refKey],
              [`@doc.${opts.through[1].by}`]: {
                $nin: alRecordIds
              }
            })).map(async (voRecord) => {
              const id = voRecord[opts.through[1].by];
              await voRecord.destroy();
              return id;
            });
            await (await EmbedsCollection.takeBy(
              {[`@doc.${inverse.refKey}`]: {$in: embedIds}}
            )).forEach(async (voRecord) => await voRecord.destroy());
          }
          for (const newRecordId of newRecordIds) {
            await ThroughCollection.create({
              [through.inverse]: this[opts.refKey],
              [opts.through[1].by]: newRecordId,
              spaceId: this.spaceId || undefined,
              teamId: this.teamId || undefined,
              spaces: this.spaces,
              creatorId: this.creatorId,
              editorId: this.editorId,
              ownerId: this.ownerId
            });
          }
        }
      } else if (!opts.putOnly) {
        if (!opts.through) {
          await (await EmbedsCollection.takeBy(
            {[`@doc.${opts.inverse}`]: this[opts.refKey]}
          )).forEach(async (voRecord) => await voRecord.destroy());
        } else {
          const through = this.constructor.embeddings[opts.through[0]] || (
            this.constructor.relations &&
            this.constructor.relations[opts.through[0]]
          );
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          const embedIds = await (await ThroughCollection.takeBy(
            {[`@doc.${through.inverse}`]: this[opts.refKey]}
          )).map(async (voRecord) => {
            const id = voRecord[opts.through[1].by];
            await voRecord.destroy();
            return id;
          });
          await (await EmbedsCollection.takeBy(
            {[`@doc.${inverse.refKey}`]: {$in: embedIds}}
          )).forEach(async (voRecord) => await voRecord.destroy());
        }
      }
    };

    opts.restore = async function(replica: ?object): Promise<?RecordInterface> {
      let EmbedsCollection = this.collection
        .facade
        .retrieveProxy(opts.collectionName.call(this));
      let EmbedRecord = this.findRecordByName(opts.recordName.call(this));
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.restore ${key} replica ${JSON.stringify(replica)}`, LEVELS[DEBUG]
      );
      const res = await (async () => {
        if (replica != null && replica.length > 0) {
          return map(replica, async (item) => {
            if (item.type == null) {
              item.type = `${EmbedRecord.moduleName()}::${EmbedRecord.name}`;
            }
            return await EmbedsCollection.build(item);
          });
        } else {
          return [];
        }
      })();
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.restore ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
      );
      return res;
    };

    opts.replicate = function(): object[] {
      const alRecords = this[key] || [];
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.replicate ${key} embeds ${JSON.stringify(alRecords)}`, LEVELS[DEBUG]
      );
      const res = alRecords.map((aoRecord) =>
        aoRecord.constructor.objectize(aoRecord)
      );
      this.collection.send(
        SEND_TO_LOG, `hasEmbeds.replicate ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
      );
      return res;
    };

    const newDescriptor = {
      configurable: true,
      enumerable: true,
      writable: true,
      initializer: () => []
    };

    (opts: EmbedConfigT);

    vcClass.metaObject.addMetaData('embeddings', key, opts);
    vcClass.metaObject.addMetaData('instanceVariables', key, newDescriptor);

    return newDescriptor;
  };
}
