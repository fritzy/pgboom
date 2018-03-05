const Boom = require('boom');
const joi = require('joi');
const util = require('util');

const internal = joi.object({
    getNull404: joi.boolean(),
    extendConditions: joi.object(),
    extendCategories: joi.object()
});

let condition = {
    '23505': function(err) {
        return Boom.conflict(util.format('Failed relationship constraint: %s', err.constraint));
    },
    '42501': function(err) {
        return Boom.forbidden(err.toString());
    }
};

let category = {
    '08': function(err) {
        return Boom.serverTimeout('Database unavailable');
    },
    '53': function(err) {
        return Boom.serverTimeout('Database unavailable');
    },
    '22': function(err) {
        return Boom.badData(err.toString());
    },
    '23': function(err) {
        return Boom.badData(err.constraint);
    }
};

let opts = {};

exports.plugin = {
    pkg: require('./package.json'),

    register: async function(server, options) {
        return new Promise((resolve, reject) => {
            const regErr = internal.validate(options);

            if (regErr.error) {
                reject(regErr);
            } else {
                opts = options;
                condition = Object.assign(condition, opts.extendConditions);
                category = Object.assign(category, opts.extendCategories);

                server.ext('onPreResponse', function(request, h) {
                    const source = request.response;

                    if (request.method == 'get' && source.source === null && opts.getNull404) {
                        throw Boom.notFound();
                    } else if (source !== null && typeof source === 'object' && source.severity === 'ERROR') {
                        if (source.hasOwnProperty('code') && condition.hasOwnProperty(source.code)) {
                            throw condition[source.code](source);
                        } else if (
                            source.hasOwnProperty('code') &&
                            typeof source.code === 'string' &&
                            category.hasOwnProperty(source.code.substr(0, 2))
                        ) {
                            throw category[source.code.substr(0, 2)](source);
                        } else {
                            throw Boom.badImplementation(source.toString());
                        }
                    }

                    return h.continue;
                });

                resolve();
            }
        });
    }
};
