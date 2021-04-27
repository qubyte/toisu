import { strict as assert } from 'assert';
import supertest from 'supertest';
import Toisu from '../index.js';

describe.only('Toisu', () => {
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

    describe('an http server using toisu', () => {
      it('responds to a request', async () => {
        const app = new Toisu().use((_req, res) => res.end('Hello, world!'));
        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.text, 'Hello, world!');
      });

      it('executes middleware in sequence', async () => {
        const app = new Toisu();
        const expectedOrder = [0, 1, 2, 3, 4];
        const called = [];

        for (const i of expectedOrder) {
          app.use(() => new Promise(resolve => setTimeout(() => {
            called.push(i);
            resolve();
          }, 100)));
        }

        app.use((_req, res) => res.end('Hello, world!'));

        const server = supertest(app.requestHandler);

        await server.get('/');

        assert.deepEqual(called, expectedOrder);
      });

      it('shares a context between middlewares', async () => {
        const app = new Toisu();
        const expectedBody = { zero: 0, one: 1, two: 2, three: 3, four: 4 };

        for (const [key, value] of Object.entries(expectedBody)) {
          app.use(function () {
            this.set(key, value);
          });
        }

        app.use(function (_req, res) {
          const body = Buffer.from(JSON.stringify(Object.fromEntries(this)));

          res.writeHead(200, {
            'content-type': 'application/json',
            'content-length': body.length
          }).end(body);
        });

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.deepEqual(res.body, expectedBody);
      });

      it('stops executing middlewares when one responds', async () => {
        const app = new Toisu();
        const executed = [];

        for (let i = 0; i < 10; i++) {
          app.use((_req, res) => {
            executed.push(i);

            if (i === 5) {
              res.end('Hello, world!');
            }
          });
        }

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.statusCode, 200);
        assert.equal(res.text, 'Hello, world!');
        assert.deepEqual(executed, [0, 1, 2, 3, 4, 5]);
      });

      it('responds with a 404 status when the middlewares doesn\'t respond', async () => {
        const app = new Toisu();

        for (let i = 0; i < 10; i++) {
          app.use(() => {});
        }

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.statusCode, 404);
        assert.equal(res.text, '');
      });

      it('responds with a 500 status when a middleware throws', async () => {
        const app = new Toisu();
        const executed = [];

        for (let i = 0; i < 10; i++) {
          app.use(() => {
            executed.push(i);

            if (i === 5) {
              throw new Error(i);
            }
          });
        }

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.statusCode, 500);
        assert.equal(res.text, '');
        assert.deepEqual(executed, [0, 1, 2, 3, 4, 5]);
      });

      it('responds with a 500 status when a middleware rejects', async () => {
        const app = new Toisu();
        const executed = [];

        for (let i = 0; i < 10; i++) {
          app.use(() => {
            executed.push(i);

            if (i === 5) {
              return Promise.reject(new Error(i));
            }
          });
        }

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.statusCode, 500);
        assert.equal(res.text, '');
        assert.deepEqual(executed, [0, 1, 2, 3, 4, 5]);
      });

      it('allows the 500 error response to be customized', async () => {
        const app = new Toisu();

        for (let i = 0; i < 10; i++) {
          app.use(function () {
            if (i === 0) {
              this.set('called', [i]);
            } else {
              this.get('called').push(i);
            }

            if (i === 5) {
              throw new Error('Oh noes!');
            }
          });
        }

        app.handleError = function (_req, res, error) {
          const body = Buffer.from(JSON.stringify({
            called: this.get('called'),
            error: error.message
          }));

          res.writeHead(502, {
            'content-type': 'application/json',
            'content-length': body.length
          }).end(body);
        };

        const server = supertest(app.requestHandler);
        const res = await server.get('/');

        assert.equal(res.statusCode, 502);
        assert.deepEqual(res.body, {
          called: [0, 1, 2, 3, 4, 5],
          error: 'Oh noes!'
        });
      });
    });
  });
});
