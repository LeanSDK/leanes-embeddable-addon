const { expect, assert } = require('chai');
const sinon = require("sinon");
const LeanES = require("../../../src/leanes/index.js").default;
const {
  CoreObject,
  initialize, module: moduleD, machine, nameBy, meta
} = LeanES.NS;

describe('machine', () => {
  describe('machine(first: (string | Function), last: ?Function)', () => {
    it('should add method in metaObject', () => {
      const spySMConfig = sinon.spy(() => { });
      expect(() => {
        @initialize
        class Test extends LeanES {
          @nameBy static __filename = 'Test';
          @meta static object = {};
        }

        @initialize
        @moduleD(Test)
        @machine('default', spySMConfig)
        class MyClass extends LeanES.NS.CoreObject {
          @meta static object = {};
        }
        assert.isOk(MyClass.metaObject.parent.data.stateMachines);
      }).to.not.throw(Error);
    });
  });
});