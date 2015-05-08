# pgboom: A Hapi Plugin for Casting Postgres Errors as HTTP Errors

[![npm i pgboom](https://nodei.co/npm/pgboom.png)](https://www.npmjs.com/package/pgboom)
    

Plugin registration boilerplate:

```javascript
var hapi = require('hapi');
var config = require('./config.json');
var Boom = require('boom');

var server = new hapi.Server();
server.connection(config);

server.register([{
    register: require('pgboom'), 
    options: {
        getNull404: true,
        extendConditions: {
            '2201W': function (err) {
                return Boom.badRequest('Invalid pagination values');
            }
        },
        extendCategories: {
            '28': function (err) {
                return Boom.unauthorized('Invalid credentials');
            }
        }
    },
}, function (err) {
    server.log(['startup'], 'Loaded pgboom plugin');
    server.start(function (err) {
        //...
    }
});
```

Now, you can pass your postgres errors right on through to hapi reply!

```javascript
function someHandler(request, reply) {
    pg.query("SELECT id FROM request.params.id", function (err, results) {
        reply(err, results.rows);
    });
});
```

## Options

__getNull404__: Boolean. If the handler request method is GET, and postgres doesn't pass a result, throw a 404 Not Found error regardless of there not being a postgres error. Default: False

__extendConditions__: Object. Keys of postgres error codes, mapped to functions that return Boom objects.

__extendCategories__: Object. Keys of the first 2 digits of error codes, mapped to functions that return Boom objects.

## Default Conditions and Categories

```javascript
var condition = {
    '23505': function (err) {
        return Boom.conflict(util.format("Failed relationship constraint: %s", err.constraint));
    }, 
    '42501': function (err) {
        return Boom.forbidden(err.toString());
    }
}

var category = {
    '08': function (err) {
        return Boom.serverTimeout('Database unavailable');
    },
    '53': function (err) {
        return Boom.serverTimeout('Database unavailable');
    },
    '22': function (err) {
        return Boom.badData(err.toString());
    },
    '23': function (err) {
        return Boom.badData(err.constraint);
    }
}
```

I'll gladly accept pull requests to add more and for bugfixes!
