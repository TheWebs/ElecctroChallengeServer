'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const Users = require('./handlers/users');
const Tasks = require('./handlers/tasks');
const Jwt = require('@hapi/jwt');
const Config = require('./server_configs');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');


const init = async () => {

    const server = Hapi.server({
        port: 4000,
        host: 'localhost',
        routes: {
            cors: {
                origin: ['*'],
                credentials: true
            }
        }
    });

    const swaggerOptions = {
        info: {
            title: 'To do list API documentation',
            version: Pack.version
        }
    };

    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);

    server.state('todosAppToken', {
        ttl: Date.now() + Config.tokenDefaultDuration,
        path: '/',
        isHttpOnly: false
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
        path: '/users',
        handler: Users.registerUser,
        options: {
            auth: false,
            description: 'Creates a new account',
            notes: 'Returns a credential (an authentication token), representing the created user',
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    name: Joi.string().min(3).max(30).required(),
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
            description: 'Authenticates a user',
            notes: 'Returns a credential (an authentication token), representing the authenticated user',
            tags: ['api'],
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
        handler: Users.logout,
        options: {
            description: 'Invalidate the credentials of the authenticated user',
            tags: ['api']
        }
    });

    server.route({
        method: 'GET',
        path: '/me',
        handler: Users.getUser,
        options: {
            description: 'Return the details of the authenticated user',
            notes: 'Returns a JSON object, representing the authenticated user',
            tags: ['api']
        }
    });

    server.route({
        method: 'PATCH',
        path: '/me',
        handler: Users.editUser,
        options: {
            description: 'Edit the details of the authenticated user',
            notes: 'Returns a JSON object, representing the edited authenticated user',
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    name: Joi.string().min(3).optional(),
                    email: Joi.string().email().optional()
                })
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/todos',
        handler: Tasks.createTask,
        options: {
            description: 'Add a task to the to do list',
            notes: 'Returns a JSON object, representing the created task',
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    description: Joi.string().min(2).required()
                })
            }
        }
    });

    server.route({
        method: 'PATCH',
        path: '/todo/{id}',
        handler: Tasks.editTask,
        options: {
            description: 'Edit a task on the to do list',
            notes: 'Returns a JSON object, representing the edited task',
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    description: Joi.string().min(2).optional(),
                    state: Joi.string().valid('COMPLETE').optional()
                }),
                params: Joi.object({
                    id: Joi.number().integer().min(1).required()
                })
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/todos',
        handler: Tasks.getTasksForUser,
        options: {
            description: 'List the tasks considering the conditions imposed on the query parameters',
            notes: 'Returns a JSON array of objects, representing the tasks',
            tags: ['api'],
            validate: {
                query: Joi.object({
                    filter: Joi.string()
                        .valid('ALL', 'COMPLETE', 'INCOMPLETE')
                        .optional().default('ALL'),
                    orderBy: Joi.string()
                        .valid('DESCRIPTION', 'CREATED_AT', 'COMPLETED_AT')
                        .optional().default('CREATED_AT')
                })
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: '/todo/{id}',
        handler: Tasks.deleteTask,
        options: {
            description: 'Removes a task from the to do list',
            notes: 'Returns an empty response if succeeds',
            tags: ['api'],
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().min(1).required()
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
