var Toisu = require('../../');
var assert = require('assert');
var sinon = require('sinon');

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

describe('Toisu', () => {
  const sandbox = sinon.sandbox.create();

  afterEach(() => sandbox.restore());

  it('is a function', () => {
    assert.equal(typeof Toisu, 'function');
  });

  it('throws a TypeError when called without new', () => {
    assert.throws(
      () => Toisu(), // eslint-disable-line new-cap
      err => err instanceof TypeError,
      'Cannot call a class as a function'
    );
  });

  it('constructs an instance', () => {
    assert.ok(new Toisu() instanceof Toisu);
  });

  describe('an instance', () => {
    let instance;

    beforeEach(() => {
      instance = new Toisu();
    });

    it('has a use method', () => {
      assert.equal(typeof instance.use, 'function');
    });

    it('has a requestHandler method', () => {
      assert.equal(typeof instance.requestHandler, 'function');
    });

    describe('requestHandler', () => {
      let middlewares;
      let fakeReq;
      let fakeRes;

      beforeEach(() => {
        fakeReq = {};
        fakeRes = {
          writable: true,
          end: sandbox.stub()
        };
      });

      describe('synchronous middlewares', () => {
        beforeEach(async () => {
          middlewares = [
            sandbox.stub().returns(),
            sandbox.stub().returns()
          ];

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);

          await instance.requestHandler(fakeReq, fakeRes);
        });

        it('calls the middlewares in the stack', () => {
          assert.equal(middlewares[0].callCount, 1);
          assert.equal(middlewares[1].callCount, 1);
        });

        it('executes the middleware stack in sequence', () => {
          assert.ok(middlewares[0].calledBefore(middlewares[1]));
        });

        it('passes the request and response objects to each middleware', () => {
          assert.equal(middlewares[0].args[0].length, 2);
          assert.equal(middlewares[0].args[0][0], fakeReq);
          assert.equal(middlewares[0].args[0][1], fakeRes);

          assert.equal(middlewares[1].args[0].length, 2);
          assert.equal(middlewares[1].args[0][0], fakeReq);
          assert.equal(middlewares[1].args[0][1], fakeRes);
        });

        it('passes a map as a common context between middlewares', () => {
          assert.ok(middlewares[0].thisValues[0] instanceof Map);

          assert.equal(middlewares[0].thisValues[0], middlewares[1].thisValues[0]);
        });

        it('does not share a context between request cycles', async () => {
          await instance.requestHandler({}, {end: () => {}, writable: true});

          assert.notEqual(middlewares[0].thisValues[0], middlewares[0].thisValues[1]);
        });

        it('does not call subsequent middlewares when a middleware has ended the response', async () => {
          middlewares = [
            function (req, res) {
              res.headersSent = true;
            },
            sandbox.stub().returns()
          ];

          const instance = new Toisu();

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);

          await instance.requestHandler({}, {end: () => {}, writable: true});

          assert.equal(middlewares[1].callCount, 0);
        });

        it('does not call subsequent middlewares when a middleware has thrown', async () => {
          middlewares = [
            function (req, res) {
              res.headersSent = true;
            },
            sandbox.stub().returns()
          ];

          const instance = new Toisu();

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);

          await instance.requestHandler({}, {end: () => {}, writable: true});

          assert.equal(middlewares[1].callCount, 0);
        });
      });

      describe('asynchronous middlewares', () => {
        let deferreds;

        beforeEach(async () => {
          deferreds = [
            new Deferred(),
            new Deferred()
          ];

          middlewares = deferreds.map(deferred => sandbox.stub().returns(deferred.promise));

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);
        });

        it('calls the middlewares in the stack', async () => {
          for (const deferred of deferreds) {
            deferred.resolve();
          }

          await instance.requestHandler(fakeReq, fakeRes);

          assert.equal(middlewares[0].callCount, 1);
          assert.equal(middlewares[1].callCount, 1);
        });

        it('executes the middleware stack in sequence', async () => {
          deferreds[0].resolve();

          instance.requestHandler(fakeReq, fakeRes);

          await deferreds[0].promise;

          assert.ok(middlewares[0].calledBefore(middlewares[1]));
        });

        it('passes the request and response objects to each middleware', async () => {
          for (const deferred of deferreds) {
            deferred.resolve();
          }

          await instance.requestHandler(fakeReq, fakeRes);

          assert.equal(middlewares[0].args[0].length, 2);
          assert.equal(middlewares[0].args[0][0], fakeReq);
          assert.equal(middlewares[0].args[0][1], fakeRes);

          assert.equal(middlewares[1].args[0].length, 2);
          assert.equal(middlewares[1].args[0][0], fakeReq);
          assert.equal(middlewares[1].args[0][1], fakeRes);
        });

        it('passes a map as a common context between middlewares', async () => {
          for (const deferred of deferreds) {
            deferred.resolve();
          }

          await instance.requestHandler(fakeReq, fakeRes);

          assert.ok(middlewares[0].thisValues[0] instanceof Map);

          assert.equal(middlewares[0].thisValues[0], middlewares[1].thisValues[0]);
        });

        it('does not share a context between request cycles', async () => {
          for (const deferred of deferreds) {
            deferred.resolve();
          }

          await instance.requestHandler(fakeReq, fakeRes);
          await instance.requestHandler({}, {end: () => {}, writable: true});

          assert.notEqual(middlewares[0].thisValues[0], middlewares[0].thisValues[1]);
        });

        it('does not call subsequent middlewares when a middleware has ended the response', async () => {
          middlewares[0] = function (req, res) {
            res.headersSent = true;

            return Promise.resolve();
          };

          const instance = new Toisu();

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);

          await instance.requestHandler(fakeReq, fakeRes);

          assert.equal(middlewares[1].callCount, 0);
        });

        it('does not call subsequent middlewares when a middleware has thrown', async () => {
          middlewares[0] = function (req, res) {
            res.headersSent = true;

            return Promise.reject('oh noes');
          };

          const instance = new Toisu();

          instance.use(middlewares[0]);
          instance.use(middlewares[1]);

          await instance.requestHandler(fakeReq, fakeRes);

          assert.equal(middlewares[1].callCount, 0);
        });
      });
    });
  });
});
