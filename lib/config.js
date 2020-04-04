/*
 * Create and export configuration variables
 *
 */
var path = require('path');

// Containter for configuration variables
var config = {};

//Variables for workers
config.workersLoopTime = 1000 * 60 * 15; // 15 minutes

//Variables for tokens
config.tokenExpirationTimeInMiliseconds = 1000 * 60 * 60; // 1 hour
config.tokenLength = 20;

//Folder names
config.usersFolder = 'users';
config.ordersFolder = 'orders';
config.tokensFolder = 'tokens';

// Paths to resources
config.menuFile = path.join(__dirname, 'menu.json');
config.logoTextFile = path.join(__dirname, 'logo.txt');

// Bussiness constants
config.maxCharsStreetAddress = 300;
config.maxEmailSubjectLength = 78;
config.maxAmountPerOrderItem = 10;
config.maxOrderItems = 10;
config.maxOrders = 5;
config.senderName = 'Pizza';
config.currencySign = '$';

// Messages for user
config.messages = {
    'invalidToken': 'Missing required token in header or token is invalid/expired.',
    'emptyCart': 'Your shopping cart is empty. Please make an order via POST shoppingcart route :)',
    'errorCart': 'Error loading your shopping cart.',
    'invalidOrder': `Array of orders is invalid or empty.` +
        ` Please send a JSON array of {\'itemId\' : number, \'amount\': number (between 1 - ${config.maxAmountPerOrderItem}) }.` +
        ` Max number of items is ${config.maxOrderItems}.`,
    'errorPayment': 'Error while processing your payment. Please try again.'
};

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'isTesting' : true,
    'testEmail': 'prueba@gmail.com',
    'hashingSecret': 'pizzaIsDelicious',
    'stripe': {
        'publicKey': 'pk_test_xxx',
        'secretKey': 'sk_test_xxx',
        'currency': 'usd',
        'currencySign': '$',
        'source': 'tok_visa'
    },
    'mailGun': {
        'hostname': 'api.mailgun.net',
        'domain': 'pruebaXXXX.mailgun.org',
        'apiKey': 'apikeyhere',
        'senderMail': 'Pizza <notreply@pruebaXXXX.mailgun.org>'
    },
    'templateGlobals': {
        'appName': 'Pizza',
        'companyName': 'Pizza Company.',
        'yearCreated': '2020',
        'baseUrl': 'http://localhost:3000/',
        'maxOrders': config.maxOrders,
        'maxAmountPerOrderItem': config.maxAmountPerOrderItem,
        'currencySign': '$'
    }
};

// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'isTesting' : false,
    'hashingSecret': 'pizzaIsDelicious',
    'stripe': {
        'publicKey': 'pk_test_xxx',
        'secretKey': 'sk_test_xxx',
        'currency': 'usd',
        'currencySign': '$',
        'source': 'tok_visa'
    },
    //To be changed in real-life solution, but never to be published
    'mailGun': {
        'hostname': 'api.mailgun.net',
        'domain': 'pruebaXXXX.mailgun.org',
        'apiKey': 'apikeyhere',
        'senderMail': 'Pizza <notreply@pruebaXXXX.mailgun.org>'
    },
    'templateGlobals': {
        'appName': 'Pizza',
        'companyName': 'Pizza Company.',
        'yearCreated': '2020',
        'baseUrl': 'http://localhost:3000/',
        'maxOrders': config.maxOrders,
        'maxAmountPerOrderItem': config.maxAmountPerOrderItem,
        'currencySign': '$'
    }
};

//Determine which environment was passed as a command line arg
var currentEnvironment = typeof (process.argv[2]) == 'string' ? process.argv[2].toLowerCase() : '';

//Check that the current environment is one of the environments above, default is staging
config.env = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

//Export the module
module.exports = config;