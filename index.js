'use strict';

const runner = require('toisu-middleware-runner');
const stacks = new WeakMap();

class Toisu {
  constructor() {
    stacks.set(this, []);
    this.handleError = Toisu.defaultHandleError;
  }

  use(middleware) {
    stacks.get(this).push(middleware);
    return this;
  }

  get requestHandler() {
    return (req, res) => {
      const stack = stacks.get(this);
      const context = new Map();

      return runner.call(context, req, res, stack)
        .then(() => {
          if (!res.headersSent) {
            res.statusCode = 404;
            res.end();
          }
        })
        .catch(error => this.handleError.call(context, req, res, error));
    };
  }

  static defaultHandleError(req, res) {
    res.statusCode = 502;
    res.end();
  }
}

module.exports = Toisu;
