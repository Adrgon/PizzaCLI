/*
Request handlers
*/

//Dependencies
var _data = require('../data');
var _tokens = require('./tokens_handler');
var helpers = require('../helpers');
var config = require('../config');
//var debug = require('debug')('users');

//Private container
_users = {};

// USERS - POST
// Required data: firstName, lastName, email, password, streetAddress, tosAgreement
// Optional data: none
// Required header: none
_users.post = function (data, callback) {

    //debug(`Trying to create a user from:\n${JSON.stringify(data.payload)}`);

    // Order that all required fields are filled out
    var firstName = helpers.validateString(data.payload.firstName);
    var lastName = helpers.validateString(data.payload.lastName);
    var email = helpers.validateEmail(data.payload.email);
    var password = helpers.validateString(data.payload.password, 8);
    var streetAddress = helpers.validateString(data.payload.streetAddress, 1, 300);
    var tosAgreement = helpers.getBoolean(data.payload.tosAgreement);

    if (firstName && lastName && email && password && tosAgreement) {
        //Make sure that the user doesn't already exist
        _data.read(config.usersFolder, email, function (err, data) {
            if (err) {
                // Hash the password
                var hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'email': email,
                        'hashedPassword': hashedPassword,
                        'streetAddress': streetAddress,
                        'tosAgreement': true,
                        'signedInDate' : Date.now()
                    };

                    // Store the user
                    _data.create(config.usersFolder, email, userObject, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'Could not hash the user\'s password.' });
                }

            } else {
                // User already exists
                callback(400, { 'Error': 'A user with that email already exists' });
            }
        });

    } else {
        if (!tosAgreement)
            callback(400, { 'Error': `You have to agree to the terms and conditions.` });
        else
            callback(400, { 'Error': `Missing or invalid required fields.` });
    }
};

// USERS - GET
// Required query string parameter: email
// Optional data: none
// Required header: token
_users.get = function (data, callback) {

    //debug(`Trying to load user's data from queryStringObject:\n${JSON.stringify(data.queryStringObject)}`);

    //Validate the email
    var email = helpers.validateString(data.queryStringObject.email);

    if (email) {
        // Get the token from the headers
        var token = helpers.validateString(data.headers.token);

        // Verify that the given token is valid for the email
        _tokens.verifyToken(token, function (tokenIsValid) {

            if (tokenIsValid) {
                //debug(`token is valid/`);


                //Lookup the user
                _data.read(config.usersFolder, email, function (err, data) {
                    if (!err && data) {
                        //debug(`Read user's data\n${JSON.stringify(data)}`);

                        //Remove the hashed password before returning it to the requester
                        delete data.hashedPassword;
                        callback(200, data);
                    }
                    else {
                        //debug(`Invalid email`);
                        callback(404, { 'Error': 'Invalid email.' });
                    }
                });

            } else {
                //debug('Invalid token .', token);
                callback(403, { 'Error': 'Missing required token in header or token is invalid for this user.' });
            }
        });
    }
    else {
        //debug('Missing required field email.');
        callback(400, { 'Error': 'Missing required field email.' });
    }
};

// USERS - PUT
// Required data: email
// Optional data: firstName, lastName, password (at least one must be specified)
// Required header: token
_users.put = function (data, callback) {

    //debug(`Trying to modify user. Payload:\n${JSON.stringify(data.payload)}`);

    //Check for the required field
    var email = helpers.validateString(data.payload.email);
    //Check for the optional fields
    var firstName = helpers.validateString(data.payload.firstName);
    var lastName = helpers.validateString(data.payload.lastName);
    var password = helpers.validateString(data.payload.password);
    var streetAddress = validateStreetAddress(data.payload.address);

    //Error if email is invalid
    if (email) {
        //Error if nothing is sent to update
        if (firstName || lastName || password || streetAddress) {
            //Get the token from the headers
            var token = helpers.validateString(data.headers.token);

            _tokens.verifyTokenAndEmail(token, email, function (tokenIsValid) {
                if (tokenIsValid) {
                    //Lookup the user 
                    _data.read(config.usersFolder, email, function (err, userData) {
                        if (!err && userData) {
                            //Update the fields
                            if (firstName) { userData.firstName = firstName; }
                            if (lastName) { userData.lastName = lastName; }
                            if (password) { userData.hashedPassword = helpers.hash(password); }
                            if (streetAddress) { userData.streetAddress = streetAddress; }

                            //Store the new updates
                            _data.update('users', email, userData, function (err) {
                                if (!err) {
                                    callback(200, { 'Message': 'User\'s account been updated.' }); //Success
                                } else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Error saving the updates.' });
                                }
                            });
                        }
                        else {
                            callback(400, { 'Error': 'The specified user does not exist.' });
                        }
                    });
                } else {
                    callback(403, { 'Error': 'Missing required token in header or token is invalid.' });
                }
            });
        }
        else {
            callback(400, { 'Error': 'Missing fields to update. Specify at least one field.' });
        }
    }
    else {
        callback(400, { 'Error': 'Missing or invalid email.' });
    }
};

// USERS - DELETE
// Required data: email
// Optional data: none
// Required header: token
_users.delete = function (data, callback) {
    //Check the email is valid
    var email = helpers.validateString(data.payload.email);

    //Error if email is invalid
    if (email) {
        var token = helpers.validateString(data.headers.token);

        _tokens.verifyTokenAndEmail(token, email, function (tokenIsValid) {

            if (tokenIsValid) {
                //Lookup the user
                _data.read(config.usersFolder, email, function (err, userData) {
                    if (!err && userData) {
                        _data.delete(config.usersFolder, email, function (err) {
                            if (!err) {

                                // List all items in the directory containing the user's name (email)
                                _data.listContaining(config.ordersFolder, email, function (err, fileList) {

                                    if (err && config.showMessagesInCommandLine) {
                                        console.log('\nError deleting orders of user : ' + email + '\n');
                                    }
                                    else {

                                        fileList.forEach(function (fileName) {
                                            _data.delete(config.ordersFolder, fileName, function (err) {

                                                if (err && config.showMessagesInCommandLine) {
                                                    console.log('\nError deleting order: ' + email + '\n');
                                                }
                                            });
                                        });
                                    }
                                });

                                callback(200, { 'Message': 'Successfully deleted the user.' });
                            }
                            else {
                                callback(500, { 'Error': 'Could not delete the user.' });
                            }
                        });
                    }
                    else {
                        callback(404, { 'Error': 'The specified user does not exist.' });
                    }
                });
            }
            else {
                callback(403, { 'Error': 'Missing required token in header or token is invalid.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required email field.' });
    }
};


//Helper function for user handler
const validateStreetAddress = function (input) {
    return helpers.validateString(input, 1, config.maxCharsStreetAddress);
}

//Export the module
module.exports = _users;