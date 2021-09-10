'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const Users = require('./handlers/users');


const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    server.route({
        method: 'POST',
        path: '/register',
        handler: Users.registerUser,
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string().min(3).max(30),
                    email: Joi.string().email().required(),
                    password: Joi.string().min(8).required()
                })
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/login',
        handler: Users.login,
        options: {
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    password: Joi.string().min(8).required()
                })
            }
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
