/*
 * Request Handlers
 *
 */

// Dependencies
var helpers = require('./helpers');
var _users = require('./handlers/users_handler');
var _tokens = require('./handlers/tokens_handler');
var _purchase = require('./handlers/purchase_handler');
var _shopping_cart = require('./handlers/shopping_cart_handler');
//var debug = require('debug')('handlers');

// Define all the handlers
var handlers = {};

/*
 * HTML Handlers
 *
 */

// Index
handlers.index = function (data, callback) {

    // Prepare data for interpolation
    var templateData = {
        'head.title': 'Crazy Pizza Restaurant',
        'head.description': 'We offer the best pizza in town!',
        'body.class': 'index'
    };

    helpers.createHtmlHandler(data.method, 'index', templateData, callback);
};

// Create Account
handlers.accountCreate = function (data, callback) {

    let templateData = {
        'head.title': 'Create an Account',
        'head.description': 'Signup once, order pizzas forever!',
        'body.class': 'accountCreate'
    };

    helpers.createHtmlHandler(data.method, 'accountCreate', templateData, callback);
};

// Create New Session
handlers.sessionCreate = function (data, callback) {

    let templateData = {
        'head.title': 'Login to your account.',
        'head.description': 'Please enter your email and password to access your account.',
        'body.class': 'sessionCreate'
    };

    helpers.createHtmlHandler(data.method, 'sessionCreate', templateData, callback);
};

// Edit Your Account
handlers.accountEdit = function (data, callback) {

    let templateData = {
        'head.title': 'Account Settings',
        'body.class': 'accountEdit'
    };

    helpers.createHtmlHandler(data.method, 'accountEdit', templateData, callback);
};

// Session has been deleted
handlers.sessionDeleted = function (data, callback) {

    var templateData = {
        'head.title': 'Logged Out',
        'head.description': 'You have been logged out of your account.',
        'body.class': 'sessionDeleted'
    };

    helpers.createHtmlHandler(data.method, 'sessionDeleted', templateData, callback);
};

// Account has been deleted
handlers.accountDeleted = function (data, callback) {

    var templateData = {
        'head.title': 'Account Deleted',
        'head.description': 'Your account has been deleted.',
        'body.class': 'accountDeleted'
    };

    helpers.createHtmlHandler(data.method, 'accountDeleted', templateData, callback);
};

// Create a new order
handlers.ordersCreate = function (data, callback) {

    var templateData = {
        'head.title': 'Create a New Order',
        'body.class': 'ordersCreate'
    };

    helpers.createHtmlHandler(data.method, 'ordersCreate', templateData, callback);
};

// Dashboard (view all orders)
handlers.ordersList = function (data, callback) {

    let templateData = {
        'head.title': 'Shopping cart',
        'body.class': 'ordersList'
    };

    helpers.createHtmlHandler(data.method, 'ordersList', templateData, callback);
};

// Edit a Order
handlers.ordersEdit = function (data, callback) {

    let templateData = {
        'head.title': 'Order Details',
        'body.class': 'ordersEdit'
    };

    helpers.createHtmlHandler(data.method, 'ordersEdit', templateData, callback);
};

// Purchase (pay for an order)
handlers.purchaseCreate = function (data, callback) {

    let templateData = {
        'head.title': 'Pay for the Order',
        'body.class': 'purchase'
    };

    helpers.createHtmlHandler(data.method, 'purchase', templateData, callback);
};

// Favicon
handlers.favicon = function (data, callback) {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Read in the favicon's data
        helpers.getStaticAsset('favicon.ico', function (err, data) {
            if (!err && data) {
                // Callback the data
                callback(200, data, 'favicon');
            } else {
                callback(500);
            }
        });
    } else {
        callback(405);
    }
};

// Public assets
handlers.public = function (data, callback) {
    // Reject any request that isn't a GET
    if (data.method == 'get') {
        // Get the filename being requested
        var trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
        if (trimmedAssetName.length > 0) {
            // Read in the asset's data
            helpers.getStaticAsset(trimmedAssetName, function (err, data) {
                if (!err && data) {

                    // Determine the content type (default to plain text)
                    var contentType = 'plain';

                    if (trimmedAssetName.indexOf('.css') > -1) {
                        contentType = 'css';
                    }

                    if (trimmedAssetName.indexOf('.png') > -1) {
                        contentType = 'png';
                    }

                    if (trimmedAssetName.indexOf('.jpg') > -1) {
                        contentType = 'jpg';
                    }

                    if (trimmedAssetName.indexOf('.ico') > -1) {
                        contentType = 'favicon';
                    }

                    // Callback the data
                    callback(200, data, contentType);
                } else {
                    callback(404);
                }
            });
        } else {
            callback(404);
        }
    } else {
        callback(405);
    }
};

/*
 * JSON API Handlers
 *
 */

// Ping
handlers.ping = function (data, callback) {
    callback(200);
};

// Not-Found
handlers.notFound = function (data, callback) {
    callback(404);
};

// Users
handlers.users = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        _users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Tokens
handlers.tokens = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        _tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Orders
handlers.orders = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        _shopping_cart[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Purchase
handlers.purchase = function (data, callback) {
    if ('post' == data.method) {
        _purchase[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Export the handlers
module.exports = handlers;
