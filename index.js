'use strict';

var runner = require('toisu-middleware-runner');
var stacks = new WeakMap();

function handler(instance, req, res) {
  var stack = stacks.get(instance);
  var context = new Map();

  return runner.call(context, req, res, stack)
    .then(function () {
      if (!res.headersSent) {
        res.statusCode = 404;
        res.end();
      }
    })
    .catch(function (error) {
      instance.handleError.call(context, req, res, error);
    });
}

function Toisu() {
  if (!(this instanceof Toisu)) {
    throw new TypeError('Cannot call a class as a function');
  }

  this.handleError = Toisu.defaultHandleError;

  stacks.set(this, []);
}

Toisu.defaultHandleError = function (req, res) {
  res.statusCode = 502;
  res.end();
};

Toisu.prototype.use = function (middleware) {
  stacks.get(this).push(middleware);
};

Object.defineProperty(Toisu.prototype, 'requestHandler', {
  get: function () {
    return function (req, res) {
      return handler(this, req, res);
    };
  }
});

module.exports = Toisu;
