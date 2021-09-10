'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const Users = require('./handlers/users');
const Jwt = require('@hapi/jwt');
const Config = require('./server_configs');


const init = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    await server.register(Jwt);
    server.auth.strategy('jwt_strategy', 'jwt', {
        keys: Config.key,
        verify: {
            aud: false,
            iss: false,
            sub: false
        },
        validate: async (artifacts, request, h) => {

            const tokenValid = await Users.checkTokenValid(artifacts.token);
            if (tokenValid) {
                return {
                    isValid: true,
                    credentials: { user: artifacts.decoded.payload.user }
                };
            }

            return {
                isValid: false
            };
        }
    });

    // Set the strategy

    server.auth.default('jwt_strategy');


    server.events.on('response', (request) => {

        console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.path + ' --> ' + request.response.statusCode);
    });

    server.route({
        method: 'POST',
        path: '/register',
        handler: Users.registerUser,
        options: {
            auth: false,
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
            auth: false,
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    password: Joi.string().min(8).required()
                })
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/logout',
        handler: Users.logout
    });

    server.route({
        method: 'GET',
        path: '/teste',
        handler: (request, h) => {

            return 'Consegues aceder!';
        }
    });

    server.route({
        method: 'GET',
        path: '/me',
        handler: Users.getUser
    });

    server.route({
        method: 'PATCH',
        path: '/me',
        handler: Users.editUser,
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string().min(3).optional(),
                    email: Joi.string().email().optional()
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
