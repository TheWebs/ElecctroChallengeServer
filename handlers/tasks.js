'use strict';

const Database = require('../database');

const createTask = async (request, h) => {

    const userId = request.auth.artifacts.decoded.payload.user.user_id;
    let task = await Database.createTask(userId, request.payload.description);
    if (!task) {
        return false;
    }

    task = toCamelCase(task);
    return h.response(task).code(201);
};

const editTask = async (request, h) => {

    const userId = request.auth.artifacts.decoded.payload.user.user_id;
    const taskId = request.params.id;
    const task = await Database.getTaskForUser(userId, taskId);
    if (!task) {
        return h.response('Todo not found').code(404);
    }

    if (!request.payload.description && !request.payload.state) {
        return h.response('Description or state must be in body').code(400);
    }

    if (task.state === 'COMPLETE') {
        return h.response('Todo is already complete').code(400);
    }

    let result = await Database.editTask(
        request.payload.description,
        request.payload.state,
        taskId);
    if (!result) {
        return h.response('Something went wrong').code(500);
    }

    result = toCamelCase(result);
    return h.response(result).code(200);
};

const deleteTask = async (request, h) => {

    const userId = request.auth.artifacts.decoded.payload.user.user_id;
    const taskId = request.params.id;
    const task = Database.getTaskForUser(userId, taskId);
    if (!task) {
        return h.response('Task not found').code(404);
    }

    await Database.deleteTask(taskId);
    return h.response('').code(200);
};

const getTasksForUser = async (request, h) => {

    const userId = request.auth.artifacts.decoded.payload.user.user_id;
    const filter = request.query.filter;
    const orderBy = request.query.orderBy;
    let tasks = await Database.getTasksForUser(userId, filter, orderBy);
    tasks = tasks.map((task) => toCamelCase(task));
    return tasks;
};

module.exports = {
    createTask,
    editTask,
    deleteTask,
    getTasksForUser
};

//Receives an object and changes its properties from this_case to thisCase
const toCamelCase = (source) => {

    const keys = Object.keys(source);
    const newObject = {};
    for (let i = 0; i < keys.length; i += 1) {
        const originalKey = keys[i];
        let location;
        while (location !== -1) {
            if (location === undefined) {
                location = keys[i].indexOf('_');
                continue;
            }

            keys[i] = replaceAt(keys[i], location + 1, keys[i][location + 1].toUpperCase());
            keys[i] = keys[i].slice(0, location) + keys[i].slice(location + 1);
            location = keys[i].indexOf('_');
        }

        newObject[keys[i]] = source[originalKey];

    }

    return newObject;
};

const replaceAt = (text, index, replacement) => {

    return text.substr(0, index) + replacement + text.substr(index + replacement.length);
};
