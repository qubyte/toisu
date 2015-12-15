'use strict';

const assert = require('assert');
const sinon = require('sinon');
const SandboxedModule = require('sandboxed-module');

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => Object.assign(this, { resolve, reject }));
  }
}

describe('Toisu', () => {
  const sandbox = sinon.sandbox.create();

  let Toisu;
  let runnerDeferred;
  let runnerStub;

  before(() => {
    runnerStub = sinon.stub().returns();

    Toisu = SandboxedModule.require('../', {
      requires: {
        'toisu-middleware-runner': runnerStub
      },
      globals: {
        Map
      }
    });
  });

  beforeEach(() => {
    runnerDeferred = new Deferred();

    runnerStub.returns(runnerDeferred.promise);
  });

  afterEach(() => {
    runnerStub.reset();
    sandbox.restore();
  });

  it('is a function', () => {
    assert.equal(typeof Toisu, 'function');
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

    describe('use', () => {
      let app;

      beforeEach(() => {
        app = new Toisu();
      });

      it('returns the app', () => {
        assert.equal(app.use('something'), app);
      });
    });

    it('has a requestHandler method', () => {
      assert.equal(typeof instance.requestHandler, 'function');
    });

    describe('requestHandler', () => {
      let app;
      let req;
      let res;
      let statusCodeSetStub;
      let promise;

      beforeEach(() => {
        app = new Toisu();

        app.handleError = sandbox.stub().returns('test');
        statusCodeSetStub = sandbox.stub();

        req = {};
        res = {
          end: sandbox.stub(),
          set statusCode(value) {
            statusCodeSetStub(value);
          },
          headersSent: false
        };

        statusCodeSetStub = sandbox.stub();

        Object.defineProperty(res, 'statusCode', {
          set: statusCodeSetStub
        });

        app.use('middleware-one');
        app.use('middleware-two');

        promise = app.requestHandler(req, res);
      });

      it('calls the runner with the request, the response, and the middleware stack', () => {
        assert.equal(runnerStub.callCount, 1);
        assert.deepEqual(runnerStub.args[0], [
          req,
          res,
          ['middleware-one', 'middleware-two']
        ]);
      });

      it('calls the runner with a Map instance as its context', () => {
        assert.ok(runnerStub.thisValues[0] instanceof Map);
      });

      it('uses a different Map per request', () => {
        app.requestHandler(req, res);

        assert.notEqual(runnerStub.thisValues[0], runnerStub.thisValues[1]);
      });

      describe('when the runner throws an error', () => {
        beforeEach(() => {
          runnerDeferred.reject('an error');

          return promise;
        });

        it('calls the errorHandler once', () => {
          assert.equal(app.handleError.callCount, 1);
        });

        it('calls the errorHandler with the request, the response, and the error', () => {
          assert.deepEqual(app.handleError.args[0], [req, res, 'an error']);
        });

        it('calls the errorHandler with the context', () => {
          assert.equal(app.handleError.thisValues[0], runnerStub.thisValues[0]);
        });
      });

      describe('when the runner called end on the request', () => {
        beforeEach(() => {
          res.headersSent = true;

          runnerDeferred.resolve();

          return promise;
        });

        it('does not set the statusCode', () => {
          assert.equal(statusCodeSetStub.callCount, 0);
        });

        it('does not call end', () => {
          assert.equal(res.end.callCount, 0);
        });
      });

      describe('when the runner did not call end on the request', () => {
        beforeEach(() => {
          runnerDeferred.resolve();

          return promise;
        });

        it('sets the statusCode to 404', () => {
          assert.equal(statusCodeSetStub.callCount, 1);
          assert.equal(statusCodeSetStub.args[0][0], 404);
        });

        it('calls end after setting the statusCode', () => {
          assert.equal(res.end.callCount, 1);
          assert.ok(res.end.calledAfter(statusCodeSetStub));
        });
      });
    });
  });
});
