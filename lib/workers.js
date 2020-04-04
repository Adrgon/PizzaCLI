/*
 * Worker-related tasks
 *
 */

//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
//var debug = require('debug')('workers');
var config = require('./config');

var workers = {};

// Init script
workers.init = function () {

    //Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    //Delete expired tokens and old paid orders
    workers.deleteExpiredFiles();

    //Call the loop so deleteExpiredFiles() will be executed later on too
    workers.loop();
};

workers.deleteExpiredFiles = function () {

    //debug("\n\nStarting to delete expired tokens...\n");

    workers.gatherAll(config.tokensFolder, ["expires"], function (date) {
        return (date && date <= Date.now()) ? true : false;
    });

    //debug("\n\nStarting to delete old paid orders...\n");

    let weekAgo = helpers.getDate(-7);

    workers.gatherAll(config.ordersFolder, ["id", "paid"], function (order) {

        let orderDate = new Date(order.id);

        //debug(`(paid && orderDate < weekAgo) == ${order.paid} & ${orderDate} < ${weekAgo}`);
        return (order.paid && orderDate < weekAgo) ? true : false;
    });
};

//Timer to execute the deletion once time set in config
workers.loop = function () {
    setInterval(function () {
        workers.deleteExpiredFiles();
    }, config.workersLoopTime);
};

//Lookup files and send them to validator
workers.gatherAll = function (folder, fieldToValidate, validationFunction) {

    //Get all the files that exist in the folder
    _data.list(folder, function (err, fileNames) {

        if (!err && fileNames && fileNames.length > 0) {

            fileNames.forEach(function (fileName) {
                //Read in the data
                _data.read(folder, fileName, function (err, data) {

                    //Remove all the files where the field exceed maxValue
                    if (!err && data) {
                        workers.validateData(folder, fileName, data, fieldToValidate, validationFunction);
                    } else {
                        //debug("Error reading from file: " + fileName);
                    }
                });
            });

        } else {
            //debug("Error: Could not find any orders to process.");
        }
    });
};

workers.validateData = function (folder, fileName, data, fieldsToValidate, validationFunction) {

    //debug('Validating data...');

    data = helpers.validateObject(data);
    fieldsToValidate = helpers.validateArray(fieldsToValidate);

    // Signal the problem with field array
    if (!fieldsToValidate) {
        //debug("fieldsToValidate is not a valid array. It is: ", JSON.stringify(fieldsToValidate));
        return;
    }

    let fieldValuesObject = {};
    // Gather all fields to validate from object
    fieldsToValidate.forEach(function (fieldName) {

        fieldValuesObject[fieldName] = data[fieldName];
    });

    //debug("File " + fileName + " should be deleted: " + validationFunction(fieldValuesObject));

    //If the orderDate is invalid or is paid for and it exceeds its lifespan, delete the file
    //If the token 'expires' is greater than Date.now(), delete the file
    if (validationFunction(fieldValuesObject)) {
        _data.delete(folder, fileName, function (err) {

            if (!err) {
                //debug("Successfully deleted file by workers: " + fileName);
            } else {
                //debug("Error deleting one of files by workers.");
            }
        });
    }
};

module.exports = workers;