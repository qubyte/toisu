# TOISU!

Toisu is an Express/Koa inspired server micro-framework for Node.js, built for middleware written in ES 2016 `async-await` syntax (though you may use ES 5.1 + Promises if you like to use vanilla Node). Both Express and Koa impose a solution to handling asynchronicity. Now that JS is getting blessed syntax for it, it seemed to me time to revisit the problem and explore what the solution might look like.

This framework intentionally does much less than Express, and even Koa. Out of the box Node gives you most of what you need to get information into and out of requests and responses. The rest of the logic can be supplied using middleware. To repeat that last point; Toisu is a _thin_ wrapper around what Node already gives you. It really just adds a uniform way to stack up both synchronous and asynchronous middleware.

## ES 2016 Example (needs babel):

```javascript
const Toisu = require('Toisu');
const http = require('http');
const posts = require('./lib/posts'); // Example module with db methods for a blog.

const app = new Toisu();

// Adding asynchronous middleware to the stack.
app.use(async function (req, res) {
  this.set('posts', await posts.get());
});

// Adding synchronous middleware to the stack.
app.use(function () {
  let formattedPosts = '<ul>';

  for (const post of this.get('posts')) {
    formattedPosts += `<li>${post.title}</li>`;
  }

  formattedPosts += '</ul>';

  this.set('formattedPosts', formattedPosts);
});

// Adding synchronous middleware to the stack. Middleware are executed in order of use.
app.use(function (req, res) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <!doctype html>
    <html>
      <head><title>My Blog</title></head>
      <body>${this.formattedPosts}</body>
    </html>
  `);
});

// Don't worry, app.requestHandler won't lose context.
http.createServer(app.requestHandler).listen(3000);
```

## ES 5.1 + Promises (Node 0.12 and up)

`async-await` is really just syntactic sugar for promises. If you want to use Toisu! without using `async-await`, then go right ahead! All you need to know is that an asynchronous middleware should return a promise. For example:

```javascript
var Toisu = require('Toisu');
var http = require('http');
var posts = require('./lib/posts'); // Example module with db methods for a blog.

var app = new Toisu();

// Adding asynchronous middleware to the stack.
app.use(function (req, res) {
  var context = this;

  return posts.get()
    .then(function (postsData) {
      context.set('posts', postsData);
    });
});

// Adding synchronous middleware to the stack.
app.use(function () {
  var formattedPosts = '<ul>';
  var postData = this.get('posts');

  for (var i = 0, len = postData.length; i < len; i++) {
    formattedPosts += '<li>' + postData[i].title + '</li>';
  }

  formattedPosts += '</ul>';

  this.set('formattedPosts', formattedPosts);
});

// Adding synchronous middleware to the stack. Middleware are executed in order of use.
app.use(function (req, res) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  res.end([
    '<!doctype html>',
    '<html>',
    '  <head><title>My Blog</title></head>',
    '  <body>' + this.get('formattedPosts') + '</body>',
    '</html>'
  ].join('\n'));
});

// Don't worry, app.requestHandler won't lose context.
http.createServer(app.requestHandler).listen(3000);
```
