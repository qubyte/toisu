import runner from 'toisu-middleware-runner';

const stacks = new WeakMap();

export default class Toisu {
  constructor() {
    stacks.set(this, []);
    this.handleError = Toisu.defaultHandleError;
  }

  use(middleware) {
    stacks.get(this).push(middleware);
    return this;
  }

  get requestHandler() {
    const stack = stacks.get(this);

    return (req, res) => {
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
    res.statusCode = 500;
    res.end();
  }
}
