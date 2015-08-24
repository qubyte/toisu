# TOISU!

I might have been listening to Polysics when writing this...

Toisu is an express/koa inspired server micro-framework for Node.js, based around middleware written in ES2016 `async-await` syntax. Both express and koa impose a solution to handling asynchronicity. Now that JS is getting blessed syntax for it, it seemed to me time to revisit the problem and explore what the solution might look like.

This framework intentionally does much less than express, and even koa. Out of the box Node gives you most of what you need to get information into and out of requests and responses. The rest of the logic can be supplied using middleware. To repeat that last point; Toisu is a _thin_ wrapper around what Node already gives you. It really just adds a uniform way to stack up both synchronous and asynchronous middleware.

## Example:

```javascript
const Toisu = require('Toisu');
const http = require('http');
const posts = require('./lib/posts'); // Example module with db methods for a blog.

const app = new Toisu();

// Adding asynchronous middleware to the stack.
app.use(async function (req, res) {
  this.posts = await posts.get();
});

// Adding synchronous middleware to the stack.
app.use(function () {
  let formattedPosts = '<ul>';

  for (const post of this.posts) {
    formattedPosts += `<li>${post.title}</li>`;
  }

  formattedPosts += '</ul>';

  this.formattedPosts = formattedPosts;
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
