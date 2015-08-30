'use strict';

var assert = require('assert');
var sinon = require('sinon');
var SandboxedModule = require('sandboxed-module');

function Deferred() {
  var deferred = this;

  deferred.promise = new Promise(function (resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
}

describe('Toisu', function () {
  var sandbox = sinon.sandbox.create();

  var Toisu;
  var runnerDeferred;
  var runnerStub;

  before(function () {
    runnerStub = sinon.stub().returns();

    Toisu = SandboxedModule.require('../', {
      requires: {
        'toisu-middleware-runner': runnerStub
      },
      globals: {
        Map: Map
      }
    });
  });

  beforeEach(function () {
    runnerDeferred = new Deferred();

    runnerStub.returns(runnerDeferred.promise);
  });

  afterEach(function () {
    runnerStub.reset();
    sandbox.restore();
  });

  it('is a function', function () {
    assert.equal(typeof Toisu, 'function');
  });

  it('throws a TypeError when called without new', function () {
    assert.throws(
      function () {
        return Toisu(); // eslint-disable-line new-cap
      },
      function (err) {
        return err instanceof TypeError;
      },
      'Cannot call a class as a function'
    );
  });

  it('constructs an instance', function () {
    assert.ok(new Toisu() instanceof Toisu);
  });

  describe('an instance', function () {
    var instance;

    beforeEach(function () {
      instance = new Toisu();
    });

    it('has a use method', function () {
      assert.equal(typeof instance.use, 'function');
    });

    it('has a requestHandler method', function () {
      assert.equal(typeof instance.requestHandler, 'function');
    });

    describe('requestHandler', function () {
      var app;
      var req;
      var res;
      var statusCodeSetStub;
      var promise;

      beforeEach(function () {
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

      it('calls the runner with the request, the response, and the middleware stack', function () {
        assert.equal(runnerStub.callCount, 1);
        assert.deepEqual(runnerStub.args[0], [
          req,
          res,
          ['middleware-one', 'middleware-two']
        ]);
      });

      it('calls the runner with a Map instance as its context', function () {
        assert.ok(runnerStub.thisValues[0] instanceof Map);
      });

      it('uses a different Map per request', function () {
          app.requestHandler(req, res);

          assert.notEqual(runnerStub.thisValues[0], runnerStub.thisValues[1]);
      });

      describe('when the runner throws an error', function () {
        beforeEach(function () {
          runnerDeferred.reject('an error');

          return promise;
        });

        it('calls the errorHandler once', function () {
          assert.equal(app.handleError.callCount, 1);
        });

        it('calls the errorHandler with the request, the response, and the error', function () {
          assert.deepEqual(app.handleError.args[0], [req, res, 'an error']);
        });

        it('calls the errorHandler with the context', function () {
          assert.equal(app.handleError.thisValues[0], runnerStub.thisValues[0]);
        });
      });

      describe('when the runner called end on the request', function () {
        beforeEach(function () {
          res.headersSent = true;

          runnerDeferred.resolve();

          return promise;
        });

        it('does not set the statusCode', function () {
          assert.equal(statusCodeSetStub.callCount, 0);
        });

        it('does not call end', function () {
          assert.equal(res.end.callCount, 0);
        });
      });

      describe('when the runner did not call end on the request', function () {
        beforeEach(function () {
          runnerDeferred.resolve();

          return promise;
        });

        it('sets the statusCode to 404', function () {
          assert.equal(statusCodeSetStub.callCount, 1);
          assert.equal(statusCodeSetStub.args[0][0], 404);
        });

        it('calls end after setting the statusCode', function () {
          assert.equal(res.end.callCount, 1);
          assert.ok(res.end.calledAfter(statusCodeSetStub));
        });
      });
    });
  });
});
