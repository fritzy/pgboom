var Boom = require('boom');
var joi = require('joi');
var lodash = require('lodash');
var util = require('util');

var internal = joi.object({
    getNull404: joi.boolean(),
    extendConditions: joi.object(),
    extendCategories: joi.object()
});

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
    '22': function (err) {
        return Boom.badData(err.toString());
    },
    '23': function (err) {
        return Boom.badData(err.constraint);
    }
}

var opts = {
};

exports.register = function (server, options, next) {
    
    var regErr = internal.validate(options);
    if (regErr.error) {
        return next(regErr);
    }
    opts = options;
    condition = lodash.assign(condition, opts.extendConditions);
    category = lodash.assign(category, opts.extendCategories);

    server.ext('onPostHandler', function (request, reply) {
        var source = request.response;
        var cat;
        if (request.method == 'get' && source.source === null && opts.getNull404) {
            return reply(Boom.notFound());
        } else if (source !== null && typeof source === 'object' && source.severity === 'ERROR') {
            if (source.hasOwnProperty('code') && condition.hasOwnProperty(source.code)) {
                return reply(condition[source.code](source));
            } else if (source.hasOwnPropert('code') && typeof source.code === 'string' && category.hasOwnProperty(source.code.substr(0, 2))) {
                return reply(category[source.code.substr(0, 2)](source));
            } else {
                return reply(Boom.badImplementation(source.toString()));
            }
        }
        reply.continue();
    });
    next();
};

exports.register.attributes = {
    pkg: require('./package.json')
};
