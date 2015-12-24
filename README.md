# Toisu!

Toisu is a small framework to make creating Node.js servers in a modular way. It is conceptually
similar to Express and Koa, but much smaller and built around requests handlers which return
promises when they do asynchronous work.

Toisu gives you a way of defining a sequence of things to do for each request. Out of the box, it
does essentially this, plus a default `404` response and an error handler. All other behaviour can
be achieved using modules. Body parsing, static file serving, routing by HTTP method and URL, and so
on are done this way.

## Example

```javascript
const sendPlain = require('send-data/plain');
const sendError = require('send-data/error');
const getAccess = require('fictional-promise-returning-function');

function checkAccess(req, res) {
  return getAccess(req).then(authed => {
    if (!authed) {
      sendError(req, res, {statusCode: 401});
    }
  });
}

const app = new Toisu()
  .use(checkAccess);
  .use((req, res) => sendPlain(req, res, 'Hello, world!'));

http.createServer(app.requestHandler).listen(3000);
```

## Why promises?

Love them or hate them, promises are here to stay. On top of that, the upcoming async-await language
feature uses promises behind the scenes. By returning promises from functions now, you'll be able to
`await` them in the future. Take the `checkAccess` middleware in the above example. As an async
function, which de-sugars to exactly the original, it looks like:

```javascript
async function checkAccess(req, res) {
  const authed = await getAccess(req);

  if (!authed) {
    sendError(req, res, {statusCode: 401});
  }
}
```

## API

### `new Toisu()`

The `toisu` module is a class. Create an app instance by calling it with `new`.

```javascript
const Toisu = require('toisu');
const app = new Toisu();
```

### `app.use(middleware)`

Adds a middleware function to the stack. Each request is passed to middleware functions in the order
in which they're added. If a middleware returns a promise, the next middleware is only executed when
the promise resolves. If a middleware throws, or returns a rejected promise, the errorHandler is
called.

### `app.handleError`

A function with the parameters `(req, res, error)`. By default this will be
`Toisu.defaultHandleError`, which responds with status `502`. It may be replaced for custom
behaviour.

### `app.requestHandler`

A function with the parameters `(req, res)`. Pass this as the request handler to
`http.createServer`.

### middleware functions

All middleware functions take `(req, res)`. If a middleware something asynchronous, it should return
a promise which resolves once the asynchronous task has finished. The resolution value is ignored.

## Behaviours of note:

 - Upon receiving a request, middlewares are called in order. If a middleware returns a promise,
this promise must resolve before the next middleware is called. This avoids the need to have a
`next` callback in middlewares, as is the case with Express.
 - If a middleware throws or rejects a returned promise for a particular request, no more
middlewares are called for it. Instead `app.handleError` is called.
 - If a response has not been sent after the middlewares have all been called, the app will respond
for you with a `404` status.
