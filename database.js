'use strict';

const Knex = require('knex');
const Bcrypt = require('bcrypt');
const Config = require('./server_configs');
const Jwt = require('@hapi/jwt');

const db = Knex({
    client: 'sqlite3',
    connection: {
        filename: './todos.db'
    },
    useNullAsDefault: true
});

const createDatabaseStructure = async () => {

    const tablesValid = await areTablesCreated();
    if (!tablesValid) {
        await createUsersTable();
        await createTasksTable();
    }
};

const areTablesCreated = async () => {

    return await db.schema.hasTable('users');
};

const createUsersTable = async () => {

    await db.schema.createTable('users', (table) => {

        table.increments('user_id'); //ID
        table.text('name').notNullable(); //Name
        table.text('email').notNullable(); //Email
        table.text('password').notNullable(); //Password
        table.text('token').notNullable(); //Token
        table.timestamp('token_expire_date'); //Token expire date
    });
};

const createTasksTable = async () => {

    await db.schema.createTable('tasks', (table) => {

        table.increments('task_id'); //ID
        table.text('description').notNullable(); //Description
        table.text('state').notNullable(); //Task state ['INCOMPLETE', 'COMPLETE']
        table.timestamp('created_at').notNullable(); //Task creation date
        table.timestamp('completed_at'); //Task finish date
        table.integer('owner').unsigned().notNullable(); //Task's owner id
        table.foreign('owner').references('user_id').inTable('users');//Relation between user and its tasks
    });
};

//Returns false if unsuccessful and token if successful
const createUser = async (user) => {

    const invalidEmail = await emailExists(user.email);
    if (invalidEmail) {
        return false;
    }

    const password = await Bcrypt.hash(user.password, Config.saltRounds);

    const result = await db('users').insert({
        name: user.name,
        email: user.email,
        token: '',
        token_expire_date: (Date.now() + Config.tokenDefaultDuration),
        password
    });
    if (!result) {
        return false;
    }

    const newUser = await db('users').where({ user_id: result }).select().first();
    delete newUser.password;
    delete newUser.token;

    const token = Jwt.token.generate({
        user: newUser
    }, Config.key);

    await db('users').where({ user_id: newUser.user_id }).update({ token });

    return token;
};

const createTask = async (userId, description) => {

    const result = await db('tasks').insert({
        description,
        state: 'INCOMPLETE',
        created_at: Date.now(),
        completed_at: null,
        owner: userId
    });
    if (!result) {
        return false;
    }

    const newTask = await db('tasks').where({ task_id: result }).select().first();
    if (!newTask) {
        return false;
    }

    return newTask;
};

const getTaskForUser = async (userId, taskId) => {

    const task = await db('tasks')
        .where({ task_id: taskId, owner: userId }).select().first();
    if (!task) {
        return false;
    }

    return task;
};

const editTask = async (description, state, taskId) => {

    const changes = {};
    if (description) {
        changes.description = description;
    }

    if (state) {
        changes.state = state;
        changes.completed_at = Date.now();
    }

    const result = await db('tasks').where({ task_id: taskId }).update(changes);
    if (!result) {
        return false;
    }

    const editedTask = await db('tasks').where({ task_id: taskId }).select().first();
    if (!editTask) {
        return false;
    }

    return editedTask;
};

const deleteTask = async (taskId) => {

    const result = await db('tasks').where({ task_id: taskId }).del();
    if (!result) {
        return false;
    }

    return true;
};

const getTasksForUser = async (userId, filter, orderBy) => {

    const filterOption = { owner: userId };
    if (filter !== 'ALL') {
        filterOption.state = filter;
    }

    const tasks = await db('tasks')
        .where(filterOption).orderBy(orderBy).select();
    return tasks;
};

const login = async (email, password) => {

    const validEmail = await emailExists(email);
    if (!validEmail) {
        return false;
    }

    const user = await db('users').where({ email }).select().first();
    const validPassword = await Bcrypt.compare(password, user.password);
    if (!validPassword) {
        return false;
    }

    delete user.password;
    delete user.token;

    const token = Jwt.token.generate({
        user
    }, Config.key);

    await db('users').where({ user_id: user.user_id }).update({ token, token_expire_date: (Date.now() + Config.tokenDefaultDuration) });

    return token;
};

const checkTokenValid = async (token) => {

    const user = await db('users').where({ token }).select().first();
    if (!user) {
        return false;
    }

    if (user.token_expire_date < Date.now()) {
        return false;
    }

    return user;
};

const invalidateUserToken = async (token) => {

    const success = await db('users').where({ token }).update({ token_expire_date: (Date.now() - 10000) });
    return success === 1;
};

const getUser = async (token) => {

    const user = await db('users').column('user_id', 'name', 'email').where({ token }).select().first();
    if (!user) {
        return false;
    }

    return user;
};

const editUser = async (token, name, email) => {

    const user = await db('users').column('user_id', 'name', 'email').where({ token }).select().first();
    if (!user) {
        return false;
    }

    const editedUser = await db('users').where({ token }).update({ name, email });
    return editedUser;
};

//Checks if an email exists in the database
const emailExists = async (email) => {

    const result = await db('users').where({ email }).select('user_id');
    return result.length > 0;
};

module.exports = {
    createDatabaseStructure,
    createUser,
    login,
    checkTokenValid,
    invalidateUserToken,
    getUser,
    editUser,
    createTask,
    getTaskForUser,
    editTask,
    deleteTask,
    getTasksForUser
};

