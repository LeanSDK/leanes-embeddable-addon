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
import type { RecordInterface } from '@leansdk/leanes-mapper-addon/src';
import type { EmbedOptionsT } from '../types/EmbedOptionsT';
import type { EmbedConfigT } from '../types/EmbedConfigT';

const cpoMetaObject = Symbol.for('~metaObject');

// NOTE: отличается от belongsTo тем, что сама связь не является обязательной (образуется между объектами "в одной плоскости"), а в @[opts.attr] может содержаться null значение

export default function hasEmbed(opts: EmbedOptionsT) {
  return (target, key, descriptor) => {
    const isClass = target[cpoMetaObject] != null;
    assert(!isClass, 'Decorator `hasEmbed` may be used with instance properties only');
    const vcClass = target.constructor;
    assert(vcClass.isExtensible, `Class '${target.name}' has been frozen previously. Property '${key}' can not be declared`);

    const {
      Pipes,
      Record,
      Utils: { _, joi, inflect }
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
        return Record.schema.unknown(true).allow(null).optional();
      } else {
        const EmbedRecord = this.findRecordByName(opts.recordName.call(this));
        return EmbedRecord.schema.allow(null).optional();
      }
    }
    opts.embedding = 'hasEmbed';
    opts.through = opts.through || null;
    opts.putOnly = opts.putOnly || false;
    opts.loadOnly = opts.loadOnly || false;

    opts.load = async function(): Promise<?RecordInterface> {
      if (opts.putOnly) {
        return null;
      }
      const EmbedsCollection = this.collection
        .facade
        .retrieveProxy(opts.collectionName.call(this));

      // NOTE: может быть ситуация, что hasOne связь не хранится в классическом виде атрибуте рекорда, а хранение вынесено в отдельную промежуточную коллекцию по аналогии с М:М , но с добавленным uniq констрейнтом на одном поле (чтобы эмулировать 1:М связи)

      const res = await (async () => {
        if (!opts.through) {
          query = {[`@doc.${opts.inverse}`]: this[opts.refKey]};
          if (inverseType != null) {
            query[`@doc.${opts.inverseType}`] = this.type;
          }
          return await (await EmbedsCollection.takeBy(
            query, {$limit: 1}
          )).first();
        } else {
          // NOTE: метаданные о through в случае с релейшеном к одному объекту должны быть описаны с помощью метода hasEmbed. Поэтому здесь идет обращение только к @constructor.embeddings
          const through = this.constructor.embeddings[opts.through[0]];
          assert(through != null, `Metadata about ${opts.through[0]} must be defined by \`hasEmbed\` method`);
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          const embedId = (await (await ThroughCollection.takeBy({
            [`@doc.${through.inverse}`]: this[opts.refKey]
          }, {
            $limit: 1
          })).first())[opts.through[1].by];
          return await (await EmbedsCollection.takeBy({
            [`@doc.${inverse.refKey}`]: embedId
          }, {
            $limit: 1
          })).first();
        }
      })();
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.load ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
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
      let aoRecord = this[key];
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.put ${key} embed ${JSON.stringify(aoRecord)}`, LEVELS[DEBUG]
      );
      if (aoRecord != null) {
        if (aoRecord.constructor === Object) {
          if (aoRecord.type == null) {
            aoRecord.type = `${EmbedRecord.moduleName()}::${EmbedRecord.name}`;
          }
          aoRecord = await EmbedsCollection.build(aoRecord);
        }
        if (!opts.through) {
          aoRecord[opts.inverse] = this[opts.refKey]
          if (opts.inverseType != null) {
            aoRecord[opts.inverseType] = this.type
          }
          if (this.spaceId != null) {
            aoRecord.spaceId = this.spaceId;
          }
          if (this.teamId != null) {
            aoRecord.teamId = this.teamId;
          }
          aoRecord.spaces = this.spaces;
          aoRecord.creatorId = this.creatorId;
          aoRecord.editorId = this.editorId;
          aoRecord.ownerId = this.ownerId;
          const savedRecord = (
            await aoRecord.isNew()
              || Object.keys(await aoRecord.changedAttributes()).length
          )
            ? await aoRecord.save()
            : aoRecord;
          const query = {
            [`@doc.${opts.inverse}`]: this[opts.refKey],
            ['@doc.id']: {$ne: savedRecord.id} // NOTE: проверяем по айдишнику только-что сохраненного
          }
          if (inverseType != null) {
            query[`@doc.${opts.inverseType}`] = this.type;
          }
          await (await EmbedsCollection.takeBy(
            query
          )).forEach(async (voRecord) => await voRecord.destroy());
        } else {
          // NOTE: метаданные о through в случае с релейшеном к одному объекту должны быть описаны с помощью метода hasEmbed. Поэтому здесь идет обращение только к @constructor.embeddings
          const through = this.constructor.embeddings[opts.through[0]];
          assert(through != null, `Metadata about ${opts.through[0]} must be defined by \`hasEmbed\` method`);
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          if (this.spaceId != null) {
            aoRecord.spaceId = this.spaceId;
          }
          if (this.teamId != null) {
            aoRecord.teamId = this.teamId;
          }
          aoRecord.spaces = this.spaces;
          aoRecord.creatorId = this.creatorId;
          aoRecord.editorId = this.editorId;
          aoRecord.ownerId = this.ownerId;
          const savedThroughRecord = await aoRecord.isNew()
            ? await (async (sr) => {
              await ThroughCollection.create({
                [through.inverse]: this[opts.refKey],
                [opts.through[1].by]: sr[inverse.refKey],
                spaceId: this.spaceId || undefined,
                teamId: this.teamId || undefined,
                spaces: this.spaces,
                creatorId: this.creatorId,
                editorId: this.editorId,
                ownerId: this.ownerId
              });
              return sr;
            })(await aoRecord.save())
            : (Object.keys(await aoRecord.changedAttributes()).length)
              ? await aoRecord.save()
              : aoRecord;
          const embedIds = await (await ThroughCollection.takeBy({
            [`@doc.${through.inverse}`]: this[opts.refKey],
            [`@doc.${opts.through[1].by}`]: {
              $ne: savedThroughRecord[inverse.refKey]
            }
          })).map(async (voRecord) => {
            const id = voRecord[opts.through[1].by];
            await voRecord.destroy();
            return id;
          });
          await (await EmbedsCollection.takeBy({
            [`@doc.${inverse.refKey}`]: {$in: embedIds}
          })).forEach(async (voRecord) => await voRecord.destroy())
        }
      } else if (!opts.putOnly) {
        if (!opts.through) {
          const voRecord = await (await EmbedsCollection.takeBy(
            {[`@doc.${opts.inverse}`]: this[opts.refKey]}
          ,
            {$limit: 1}
          )).first();
          if (voRecord != null) {
            await voRecord.destroy();
          }
        } else {
          // NOTE: метаданные о through в случае с релейшеном к одному объекту должны быть описаны с помощью метода hasEmbed. Поэтому здесь идет обращение только к @constructor.embeddings
          const through = this.constructor.embeddings[opts.through[0]];
          assert(through != null, `Metadata about ${opts.through[0]} must be defined by \`hasEmbed\` method`);
          const ThroughCollection = this.collection
            .facade
            .retrieveProxy(through.collectionName.call(this));
          const ThroughRecord = this.findRecordByName(
            through.recordName.call(this)
          );
          const inverse = ThroughRecord.relations[opts.through[1].by];
          const embedIds = await (await ThroughCollection.takeBy(
            {[`@doc.${through.inverse}`]: this[opts.refKey]}
          ,
            {$limit: 1}
          )).map(async (voRecord) => {
            const id = voRecord[opts.through[1].by];
            await voRecord.destroy();
            return id;
          });
          await (await EmbedsCollection.takeBy(
            {[`@doc.${inverse.refKey}`]: {$in: embedIds}}
          ,
            {$limit: 1}
          )).forEach(async (voRecord) => await voRecord.destroy());
        }
      }
    };

    opts.restore = async function(replica: ?object): Promise<?RecordInterface> {
      const EmbedsCollection = this.collection
        .facade
        .retrieveProxy(opts.collectionName.call(this));
      const EmbedRecord = this.findRecordByName(opts.recordName.call(this));
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.restore ${key} replica ${JSON.stringify(replica)}`, LEVELS[DEBUG]
      );
      const res = await (async () => {
        if (replica != null) {
          if (replica.type == null) {
            replica.type = `${EmbedRecord.moduleName()}::${EmbedRecord.name}`;
          }
          return await EmbedsCollection.build(replica);
        } else {
          return null;
        }
      })();
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.restore ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
      );
      return res;
    };

    opts.replicate = function(): object {
      const aoRecord = this[key];
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.replicate ${key} embed ${JSON.stringify(aoRecord)}`, LEVELS[DEBUG]
      );
      const res = aoRecord.constructor.objectize(aoRecord);
      this.collection.send(
        SEND_TO_LOG, `hasEmbed.replicate ${key} result ${JSON.stringify(res)}`, LEVELS[DEBUG]
      );
      return res;
    };

    const newDescriptor = {
      configurable: true,
      enumerable: true,
      writable: true,
      value: null
    };

    (opts: EmbedConfigT);

    vcClass.metaObject.addMetaData('embeddings', key, opts);
    vcClass.metaObject.addMetaData('instanceVariables', key, newDescriptor);

    return newDescriptor;
  };
}
