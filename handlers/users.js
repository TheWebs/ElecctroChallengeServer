'use strict';

const Database = require('../database');

const registerUser = async (request, h) => {

    const result = await Database.createUser(request.payload);
    if (result) {
        return h.response(result).code(201);
    }

    return h.response('Dados de criação de conta inválidos.').code(400);
};

const login = async (request, h) => {

    const loginData = request.payload;
    if (result) {
        return h.response(result).code(201);
    }

    return h.response('Dados de criação de conta inválidos.').code(400);
};

module.exports = {
    registerUser
};
