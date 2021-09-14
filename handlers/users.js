'use strict';

const Database = require('../database');

const registerUser = async (request, h) => {

    const result = await Database.createUser(request.payload);
    if (result) {
        h.state('todosAppToken', result);
        return h.response(result).code(201);
    }

    return h.response('Dados de criação de conta inválidos.').code(400);
};

const login = async (request, h) => {

    const loginData = request.payload;

    const result = await Database.login(loginData.email, loginData.password);

    if (result) {
        h.state('todosAppToken', result);
        return h.response(result).code(200);
    }

    return h.response('Dados de login inválidos.').code(400);
};

const logout = async (request, h) => {

    const result = await Database.invalidateUserToken(request.auth.artifacts.token);
    console.log(result);
    if (result) {
        return h.response('success').code(200);
    }

    return h.response('Invalid token').code(400);
};

const checkTokenValid = async (token) => {

    const tokenValid = await Database.checkTokenValid(token);
    if (!tokenValid) {
        return false;
    }

    return true;
};

const getUser = async (request, h) => {

    const user = await Database.getUser(request.auth.artifacts.token);
    if (!user) {
        return h.response('Invalid user').code(400);
    }

    return h.response(user).code(200);
};

const editUser = async (request, h) => {

    const userData = request.payload;

    if (!userData.name && !userData.email) {
        return h.response('Invalid data').code(400);
    }

    const editedUser = await Database.editUser(request.auth.artifacts.token, userData.name, userData.email);
    if (editUser) {
        return h.response('success').code(200);
    }

    return h.response('Invalid user').code(400);
};

module.exports = {
    registerUser,
    login,
    logout,
    checkTokenValid,
    getUser,
    editUser
};
