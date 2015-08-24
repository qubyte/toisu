const stacks = new WeakMap();

const handler = (function () {
  return async function (instance, req, res) {
    const context = new Map();
    const stack = stacks.get(instance) || [];

    for (const middleware of stack) {
      try {
        await middleware.call(context, req, res);
      } catch (e) {
        instance.handleError.call(context, req, res, e);
      }

      if (res.headersSent || !res.writable) {
        break;
      }
    }

    res.statusCode = 404;
    res.end();
  };
}());

class Toisu {
  constructor() {
    this.handleError = Toisu.defaultHandleError;

    stacks.set(this, []);
  }

  static defaultHandleError(req, res) {
    res.statusCode = 502;
    res.end();
  }

  use(middleware) {
    stacks.get(this).push(middleware);
  }

  get requestHandler() {
    return (req, res) => handler(this, req, res);
  }
}

module.exports = Toisu;
