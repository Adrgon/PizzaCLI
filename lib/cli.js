/*
 * CLI related tasks
 * 
 */

// #region Dependencies
var readline = require('readline');
var _data = require('./data');
var helpers = require('./helpers');
//var debug = require('debug')('cli');
var events = require('events');
var config = require('./config');
var fs = require('fs');
// #endregion

// #region Classes
class _events extends events { };
var e = new _events();
// #endregion

// Instantiate the CLI module object
var cli = {};

// #region Core functions
// Init
cli.init = function () {

    // Print out the start message in green
    console.log('\x1b[32m%s\x1b[0m', 'The CLI is running');

    // Create the interface (prompt)
    // Have it global so printOutError can use it to reset the prompt
    _interface = readline.createInterface(
        {
            input: process.stdin,
            output: process.stdout,
            prompt: ''
        });

    // Create an initial prompt
    _interface.prompt();

    //Handle each line of input separately
    _interface.on('line', function (str) {

        //Send to the input processor
        cli.processInput(str);

        // Reinitialize the prompt
        _interface.prompt();
    });

    // If the user stops the CLI, kill the associated process
    _interface.on('close', function () {

        process.exit(0);
    });
};

cli.processInput = function (str) {

    str = helpers.validateString(str, 1);

    if (str) {

        //Codify the unique questions allowed to be asked
        var uniqueInputs = [
            'man',
            'help',
            'exit',
            'menu',
            'list users',
            'more user info',
            'list orders',
            'more order info'
        ];

        //Find a match
        var matchFound = false;

        uniqueInputs.some(function (input) {
            if (str.toLowerCase().indexOf(input) > -1) {

                matchFound = true;
                //Emit the event matching the unique input
                e.emit(input, str);
                return true;
            }
        });

        //No match is found, tell the user to try again
        if (!matchFound)
            console.log('Sorry, invalid command. Type man for help.');
    }
};
// #endregion

// #region Input handlers
// Bind to the 'man' command
e.on('man', function (str) {
    cli.responders.help();
});

e.on('help', function (str) {
    cli.responders.help();
});

e.on('exit', function (str) {
    cli.responders.exit();
});

e.on('menu', function (str) {
    cli.responders.menu();
});

e.on('list users', function (str) {
    cli.responders.listUsers();
});

e.on('more user info', function (str) {
    cli.responders.moreUserInfo(str);
});

e.on('list orders', function (str) {
    cli.responders.listOrders();
});

e.on('more order info', function (str) {
    cli.responders.moreOrderInfo(str);
});
// #endregion

// #region Responders
// Responders
cli.responders = {};

// Help / Man
cli.responders.help = function () {

    var commands = {
        'exit': 'Kill the CLI (and the rest of the application)',
        'man': 'Show this help page',
        'help': 'Alias of the "man" command',
        'menu': 'View all the current menu items',
        'list orders': 'Show all the recent orders in the system (orders placed in the last 24 hours)',
        'more order info --{orderId}': 'Show details of a specified order',
        'list users': 'Show a list of all the users who have signed up in the last 24 hours',
        'more user info --{userEmail}': 'Show detailed info of a specified user'
    };

    //Show a header
    cli.horizontalHalfLine();
    cli.halfCentered('CLI MANUAL');
    cli.horizontalHalfLine();

    // Show each command, followed by its explanation in white and yellow
    for (var key in commands) {

        if (commands.hasOwnProperty(key)) {

            var value = commands[key]; // Description
            var line = '\x1b[33m' + key + '\x1b[0m'; //Print command name in yellow
            var padding = 60 - line.length;

            for (i = 0; i < padding; ++i) {
                line += ' ';
            }

            line += value;
            console.log(line);
        }
    }
    cli.verticalSpace(1);
};

cli.responders.exit = function () {

    process.exit(0); //0 means no errors
};

cli.responders.menu = function () {

    // Get menu array
    var menu = helpers.getMenu();

    // Get array of pizzas' names
    var pizzaNames = menu.map(item => item.Name);
    // Get the length of the longest pizza's name
    const maxPizzaNameLength = pizzaNames.reduce(function (a, b) { return a.length > b.length ? a : b; }).length;

    // Create header for the table
    const header = `| Id\t| ${'Pizza'.padEnd(maxPizzaNameLength)}\t| Price\t\t| Vegetarian\t| Vegan`;

    // Print out the table
    cli.printOutTable('MENU', header, menu, function (menuItem) {

        return `| ${menuItem.Id}\t| ${menuItem.Name.padEnd(maxPizzaNameLength)}\t| ${menuItem.Price.toFixed(2)} ${config.env.stripe.currencySign}\t| ${menuItem.Vegetarian ? "Yes" : "No"}\t\t| ${menuItem.Vegan ? "Yes" : "No"}`;

    });
};

// List users who have signed up in the last 24 hours
cli.responders.listUsers = function () {

    //debug(`List users`);

    //Get all user file names
    _data.list(config.usersFolder, function (err, fileNames) {

        if (!err && fileNames) {

            //debug(`Getting tokens: ${JSON.stringify(fileNames)}`);

            //Create containter for users' emails
            var usersToPrintOut = [];

            // Get date set to exactly -24h from now
            let yesterday = new Date(helpers.getYesterday());

            // Iterate through the users
            fileNames.forEach(function (fileName) {

                // Read token's data
                _data.read(config.usersFolder, fileName, function (err, userData) {

                    if (!err && userData) {

                        // Foreach user check when their account was created
                        let userCreated = userData.signedInDate;

                        //debug(`Comparing user's data: ${JSON.stringify(new Date(userCreated))} > ${JSON.stringify(yesterday)} == ${userCreated > yesterday}`);

                        // Check if the user has signed in the last 24h
                        if (userCreated >= yesterday) {

                            let email = userData.email;
                            //debug(`Adding email ${email}`);

                            if (!usersToPrintOut.includes(email)) {

                                //Add user's email to the array
                                usersToPrintOut.push(email);
                                // Print out the data
                                printOutUserData(userData);
                            }
                        }
                    }
                });
            });
        } else {
            //debug('Error reading tokens.');
        }
    });
};

// Fetch info about a user
cli.responders.moreUserInfo = function (str) {

    //get userEmail from str
    let params = str.split('--');
    let userEmail = helpers.validateString(params[1]);

    if (userEmail) {
        // Fetch the user data
        _data.read(config.usersFolder, userEmail, function (err, userData) {

            if (!err && userData) {
                // Print their JSON object with text highlighting
                printOutUserData(userEmail);  
            } else {
                cli.printOutError('Error reading user data or user with that email doesn\'t exist.');
            }
        });
    } else {
        cli.printOutError('userEmail parameter not found.');
    }
};

// List orders made in the last 24 hours
cli.responders.listOrders = function () {

    //debug(`List orders`);

    //Get all tokens
    _data.list(config.ordersFolder, function (err, fileNames) {

        if (!err && fileNames) {

            //debug(`Getting orders: ${JSON.stringify(fileNames)}`);

            // Get yesterday's date
            const yesterday = helpers.getYesterday();

            // Iterate through the orders
            fileNames.forEach(function (fileName) {

                // Read order's data
                _data.read(config.ordersFolder, fileName, function (err, orderData) {

                    if (!err && orderData) {
                        // Check if order was place in the last 24h
                        let creationDate = new Date(orderData.id);

                        //debug(`Comparing token data: ${JSON.stringify(creationDate)} > ${JSON.stringify(yesterday)} == ${creationDate > yesterday}`);

                        if (creationDate >= yesterday) {
                            // Print out the data
                            printOutOrderData(orderData);
                        }
                    } else {
                        //debug(`Error reading order: ${fileName}`);
                    }
                });
            });
        } else {
            //debug('Error listing orders.');
        }
    });

    cli.horizontalHalfLine();
};

cli.responders.moreOrderInfo = function (str) {

    //get orderId from str
    let params = str.split('--');
    let orderId = helpers.validateString(params[1]);

    if (orderId) {
        // Fetch the order data
        _data.read(config.ordersFolder, orderId, function (err, orderData) {

            if (!err && orderData) {
                printOutOrderData(orderData);
            } else {
                cli.printOutError('Error reading order data or orderId doesn\'t exist.');
            }
        });
    } else {
        cli.printOutError('Order id parameter not found.');
    }
};
// #endregion

// #region Helpers

// Print out order data
const printOutOrderData = function (orderData) {

    let currencySign = ' ' + config.env.stripe.currencySign;

    cli.verticalSpace();
    cli.horizontalHalfLine();
    printColumnInColor('Order id', orderData.id);
    printColumnInColor('Order date', new Date(orderData.id));
    printColumnInColor('Pizza id', orderData.pizzaId);
    printColumnInColor('Pizza name', orderData.pizzaName);
    printColumnInColor('Amount\t', orderData.amount);
    printColumnInColor('Price per pizza', orderData.price.toFixed(2) + currencySign);
    printColumnInColor('Total price', orderData.totalPrice.toFixed(2) + currencySign);
    printColumnInColor('User\'s email', orderData.userEmail);
    printColumnInColor('Status\t', orderData.paid ? "Paid" : "Not Paid");
};

// Read file with user data and print it out
const printOutUserData = function (userData) {

    // Calculate the number of orders
    let orderCount = helpers.validateArrayOrEmpty(userData.orders).length;

    cli.verticalSpace();
    cli.horizontalHalfLine();
    printColumnInColor('Name\t', userData.firstName);
    printColumnInColor('Surname\t', userData.lastName);
    printColumnInColor('Email\t', userData.email);
    printColumnInColor('Street address', userData.streetAddress);
    printColumnInColor('Orders count', orderCount);
    cli.verticalSpace();
};

//Print in white and yellow
const printColumnInColor = function (columnName, value) {

    console.log(columnName + '\t\x1b[33m' + value + '\x1b[0m');
};

// Create a vertical space
cli.verticalSpace = function (lines) {
    lines = typeof (lines) == 'number' && lines > 0 ? lines : 1;
    for (i = 0; i < lines; i++) {
        console.log(' ');
    }
};

// Create a horizontal line across the screen
cli.horizontalHalfLine = function () {

    // Get the available screen size
    var width = process.stdout.columns / 2;

    // Put in enough dashes to go across the screen
    var line = '';
    for (i = 0; i < width; i++) {
        line += '.';
    }
    console.log(line);
};

// Create centered text in the half on the screen
cli.halfCentered = function (str) {
    str = typeof (str) == 'string' && str.trim().length > 0 ? str.trim() : '';

    // Get the available screen size
    var width = process.stdout.columns / 2;

    // Calculate the left padding there should be
    var leftPadding = Math.floor((width - str.length) / 2);

    // Put in left padded spaces before the string itself
    var line = '';
    for (i = 0; i < leftPadding; i++) {
        line += ' ';
    }
    line += str;
    console.log(line);
};

cli.printOutError = function (str) {

    if (helpers.validateString(str)) {
        console.log('\x1b[31m' + str + '\x1b[0m'); // Print out in red
    }
};

cli.printOutTable = function (title, header, data, getDataLine) {

    //Validate input
    title = helpers.validateString(title);
    data = helpers.validateArrayOrEmpty(data);
    getDataLine = helpers.validateFunction(getDataLine);

    if (!title || !data || !getDataLine) {
        //debug('Invalid arguments for printOutTable()');
        return;
    }

    // Show a header
    cli.horizontalHalfLine();
    cli.halfCentered(title);
    cli.horizontalHalfLine();

    // Print out header
    if (helpers.validateString(header))
        console.log(header);

    // Show each row in white and yellow
    for (var key in data) {

        if (data.hasOwnProperty(key)) {

            var value = data[key];

            // Print out column
            var line = '\x1b[33m' + getDataLine(value) + '\x1b[0m';
           
            console.log(line);
            cli.verticalSpace();
        }
    }

    // Show end of table
    cli.horizontalHalfLine();
};
// #endregion

module.exports = cli;