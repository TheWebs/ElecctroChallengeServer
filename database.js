'use strict';

const Knex = require('knex');
const Bcrypt = require('bcrypt');

const saltRounds = 10;
const tokenConfig = {
    defaultDuration: 1000 * 60 * 60 * 24 * 3 //Token is valid for 3 days after creation (unless manually invalidated)
};

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

//Returns false if unsuccessful and user_id id successful
const createUser = async (user) => {

    const invalidEmail = await emailExists(user.email);
    if (invalidEmail) {
        return false;
    }

    const password = await Bcrypt.hash(user.password, saltRounds);
    return db('users').insert({ name: user.name, email: user.email, token: 'sdfgsdfgsdfg', token_expire_date: (Date.now() + tokenConfig.defaultDuration), password });
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

    return user;
};

const loginWithToken = async (token) => {

    const user = await db('users').where({ token }).select().first();
    if (!user) {
        return false;
    }

    if (user.token_expire_date < Date.now()) {
        return false;
    }

    return user;
};

const invalidateUserToken = async (userId) => {

    const success = await db('users').where({ user_id: userId }).update({ token_expire_date: (Date.now() - 10000) });
    return success === 1;
};

//Checks if an email exists in the database
const emailExists = async (email) => {

    const result = await db('users').where({ email }).select('user_id');
    return result.length > 0;
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
            }

            keys[i] = replaceAt(keys[i], location + 1, keys[i][location + 1].toUpperCase());
            keys[i] = keys[i].slice(0, location) + keys[i].slice(location + 1);
            location = keys[i].indexOf('_');
        }

        newObject[keys[i]] = source[originalKey];

    }

    return newObject;
};

//Receives an object and changes its properties from thisCase to this_case
const fromCamelCase = (source) => {

    const keys = Object.keys(source);
    const newObject = {};
    for ( let i = 0; i < keys.length; i += 1) {
        const originalKey = keys[i];
        const matches = keys[i].match(/[A-Z]/g);
        for (const capital of matches) {
            keys[i] = keys[i].replace(capital, `_${capital.toLowerCase()}`);
        }

        newObject[keys[i]] = source[originalKey];
    }

    return newObject;
};

module.exports = {
    createDatabaseStructure,
    createUser,
    login,
    loginWithToken,
    invalidateUserToken,
    toCamelCase,
    fromCamelCase
};

const replaceAt = (text, index, replacement) => {

    return text.substr(0, index) + replacement + text.substr(index + replacement.length);
};
