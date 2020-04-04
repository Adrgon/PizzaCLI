/*
 * Primary file for API
 *
 */

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');
var cli = require('./lib/cli');
var _data = require('./lib/data');
var config = require('./lib/config');

// Declare the app
var app = {};

// Init function
app.init = function () {

    //Create data directories
    _data.createDirectoryIfNotExist(''); //Create 'data' base directory
    _data.createDirectoryIfNotExist(config.usersFolder);
    _data.createDirectoryIfNotExist(config.ordersFolder);
    _data.createDirectoryIfNotExist(config.tokensFolder);

    // Start the server
    server.init();

    // Start the workers
    workers.init();

    // Start the CLI as the last
    setTimeout(function () {
        cli.init();
    }, 50);

};

// Self executing
app.init();

// Export the app
module.exports = app;
