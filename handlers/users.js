'use strict';

const Database = require('../database');

const registerUser = async (request, h) => {

    const result = await Database.createUser(request.payload);
    if (!result.error) {
        h.state('todosAppToken', result);
        return h.response(result).code(201);
    }

    return h.response(result).code(400);
};

const login = async (request, h) => {

    const loginData = request.payload;

    const result = await Database.login(loginData.email, loginData.password);

    if (!result.error) {
        h.state('todosAppToken', result);
        return h.response(result).code(200);
    }

    return h.response(result).code(400);
};

const logout = async (request, h) => {

    const result = await Database.invalidateUserToken(request.auth.artifacts.token);
    if (!result.error) {
        return h.response('success').code(200);
    }

    return h.response(result).code(400);
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
    if (user.error) {
        return h.response(user).code(400);
    }

    return h.response(user).code(200);
};

const editUser = async (request, h) => {

    const userData = request.payload;

    if (!userData.name && !userData.email) {
        return h.response({ error: 'É requerido o email ou o nome.' }).code(400);
    }

    const editedUser = await Database.editUser(request.auth.artifacts.token, userData.name, userData.email);
    if (!editedUser.error) {
        return h.response(editedUser).code(200);
    }

    return h.response(editedUser).code(400);
};

module.exports = {
    registerUser,
    login,
    logout,
    checkTokenValid,
    getUser,
    editUser
};
