This repository is now a part of [qubyte/toisu-monorepo](https://github.com/qubyte/toisu-monorepo).

# TOISU!

Toisu! is an Express/Koa inspired server micro-framework for Node.js. Toisu!:

 - Follows the tiny module dogma. Functionality is provided by modules.
 - Middleware functions return a promise when they are asynchronous.
 - Middleware share a context (`this`).

The second point means that all middleware receive just two arguments, and look
exactly like a Node.js request handler function. Like Express, Toisu allows you
to define a chain of middleware functions to pass the request and response
objects through. Each middleware is called only after the promise returned by
the one proceeding it has resolved. This avoids the need for a callback. If any
middleware throws or returns a promise which becomes rejected, the remaining
middlewares in the chain are skipped and an error handler called (a default is
provided if you do not define your own).

Beside being a modern approach to handling asynchronous tasks, middleware which
returns a promise is ready for the future when async-await is a part of JS.

Toisu is tested to work with Node 4.2 and up.

## An example server

```javascript
import http from 'http';

// http is a Node core module. The following modules need to be added to your
// package.json file if you want to try out this example:
// npm i -S toisu toisu-router toisu-body
import Toisu from 'toisu';
import Router from 'toisu-router';
import body from 'toisu-body';
import { setTimeout as timeout } from 'timers/promises';

// A middleware function to build some response data from. Uses data appended
// to the shared context by the body parser (body) and the router (params). It
// appends data to the context. No promise is returned since nothing async is
// going on.
function assembleData(req, res) {
  const body = this.get('body');
  const params = this.get('params');
  const data = JSON.stringify({
    someData: params.someData,
    body: body
  });

  this.set('data', data);
}

// A middleware which introduces an artificial delay for demonstration.
function delay(req, res) {
  return timeout(100);
}

// A middleware to grab the data assembled in previous middlewares, and respond
// to the client with it.
function sendData(req, res) {
  const data = this.get('data'); // We put this here earlier.
  const stringified = JSON.stringify(data);

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(stringified)
  }).end(stringified);
}

// Create a router object for handling URL path and HTTP method specific logic.
const router = new Router();

// Add a handler to the router for a particular URI. The colon indicates a
// parameter. If a GET request "/test/1234" is recieved, the array of middlwares
// will be called in order and a "params" field set on the shared context with
// a value of { someData: '1234' } (always a string).
router.get('/test/:someData', {
  GET: [assembleData, delay, sendData]
});

// Create a Toisu! app object to handle HTTP requests.
const app = new Toisu();

// Middlewares have been added to the router, but not the app itself yet. First
// we add a JSON body parser, which appends a "body" field to the shared context
// with the parsed body data as the value. Then the router is added. Since there
// is only one route defined, the server will respond to any other route with a
// 404. If the correct route is used, but the request is not a GET, then the
// router responds with a 405.
app.use(body.json());
app.use(router.middleware);

// Listen for requests on port 3000.
http.createServer(app.requestHandler).listen(3000);
```

This small app demonstrates a small Toisu server. It leans heavily on modules to
do things, where Express does a lot out of the box.

## async-await

Aynchronous Toisu! middleware returns a promise for a reason. Functions that
return promises may be awaited when async-await is available in the future. For
example:

```javascript
import { setTimeout as timeout } from 'timers/promises';

// Asynchronous functions can await promises.
async function delay(req, res) {
  await timeout(100);
}
```

This is a simple example. `async-await` really becomes useful when a middleware
has several asynchronous steps (such as querying a database).

This future proofs Toisu!

## API

### `class Toisu`

Creates a new Toisu app.

### `Toisu.defaultHandleError`

A default error handler for Toisu! apps. If an error is thrown in a middleware,
or a middleware returns a rejected promise then error handler will send a
response with a `500` status code.

### `app.use(middleware)`

Add a single middeware function to the stack. These are called in the order they
have been added. If a middleware function returns a promise, it must resolve
before the next is called. An asynchronous middleware _must_ return a promise.
Middleware functions should take `(request, response)` objects as arguments, and
will receive the shared context as their `this` value. Do not use arrow
functions as middleware if you need to use the shared context.

### `app.handleError(request, response, error)`

This is set to `Toisu.defaultHandleError` by default. If a middleware throws or
rejects then this function is called with the shared context. Replace it if you
want custom logic for handling errors.

### `app.requestHandler(request, response)`

This is a function which should be passed to `http.createServer`.
