/*
Request handlers
*/

//Dependencies
var _data = require('../data');
var helpers = require('../helpers');
var config = require('../config');
var _tokens = require('./tokens_handler');
var https = require('https');
var querystring = require('querystring');
//var debug = require('debug')('purchase');

//Private container
_purchase = {};

// ORDERS - POST - pay for order
// Required data: orderId
// Optional data: none
_purchase.post = function (data, callback) {

    //debug(`Trying to make a purchase. Payload:\n`, JSON.stringify(data.payload));

    //Check if the user is logged in
    _tokens.verifyToken(data.headers.token, function (tokenIsValid, tokenData) {

        if (!tokenIsValid) {
            callback(403, { 'Error': config.messages.invalidToken });
        }
        else {
            // Order if orderId header is set
            var orderId = data.payload.id;

            if (!orderId) {
                callback(500, { 'Error': 'Missing required field id.' });
                return;
            }

            //Read order data
            _data.read(config.ordersFolder, orderId, function (err, fullOrderData) {

                if (err || fullOrderData == null) {
                    callback(404, 'Error reading the order or order id is invalid.');
                } else {

                    orderData = helpers.validatePizza(fullOrderData);

                    //debug(`Order data read:`, JSON.stringify(orderData));
                    //debug(`Validated pizza:`, JSON.stringify(fullOrderData));

                    if (orderData) {

                        processOrder(tokenData.email, orderData, function (err) {
                            if (err) {
                                callback(400, { 'Error': config.messages.errorPayment });
                            } else {

                                // Modify 'paid' field in the order data
                                fullOrderData.paid = true;

                                _data.update(config.ordersFolder, orderId, fullOrderData, function (err) {
                                    if (!err) {
                                        //debug(`Updated order data:`, JSON.stringify(fullOrderData));

                                        // Lookup the user's object to get all their orders
                                        _data.read(config.usersFolder, tokenData.email, function (err, userData) {
                                            if (!err) {
                                                var userOrders = Array.isArray(userData.orders) ? userData.orders : [];

                                                // Remove the paid order from their list of orders
                                                var orderPosition = userOrders.indexOf(parseInt(orderId));
                                                if (orderPosition > -1) {
                                                    userOrders.splice(orderPosition, 1);
                                                    // Re-save the user's data
                                                    userData.orders = userOrders;
                                                    _data.update(config.usersFolder, tokenData.email, userData, function (err) {
                                                        if (!err) {
                                                            callback(200, 'Your payment was received.');
                                                        } else {
                                                            callback(500, { 'Error': 'Could not update the user\'s shopping cart.' });
                                                        }
                                                    });
                                                } else {
                                                    callback(500, { "Error": "Could not find the order on the user's object, so could not remove it." });
                                                }
                                            } else {
                                                callback(500, { "Error": "Could not find the user who created the order, so could not remove the order from the list of orders on their user object." });
                                            }
                                        });
                                    } else {
                                        callback(500, { 'Error': 'Could not remove order\'s data.' });
                                    }
                                });
                            }
                        });
                    } else {
                        callback(500, 'Error reading the order. Please try again later.');
                    }
                }
            });
        }
    });
};

/*
    Helper functions
*/
const processOrder = function (receiverEmail, orderData, callback) {

    // In the test mode, use developer's email to send the receipt
    const receiver = config.env.isTesting ? config.env.testEmail : receiverEmail;

    let charge = (orderData.totalPrice * 100).toFixed(0);
    let desc = createDescription(orderData);

    var orderPayload = createOrderPayload(charge, desc, receiver);
    var orderDetails = createStripeRequest(orderPayload);

    //debug(`Order payload:\n`, JSON.stringify(orderPayload));
    //debug(`Order details:\n`, JSON.stringify(orderDetails));

    purchase(orderDetails, orderPayload, function (err) {
        if (err) {
            callback(true);
        } else {
            callback(false);

            // If the payment was accepted, send the receipt via email
            const sender = config.env.mailGun.senderMail;

            sendReceipt(sender, receiver, "Crazy Pizza receipt", desc, function (err) {
                if (err) {
                    //debug('Error while sending receipt: ' + err);
                } else {
                    //debug('Sent receipt.');
                }
            });
        }
    });
};

const purchase = function (orderDetails, orderPayload, callback) {

    //debug('\nTrying to charge a card via Stripe...\n');

    if (orderDetails && orderPayload) {

        var req = https.request(orderDetails, function (res) {

            if (200 == res.statusCode || 201 == res.statusCode) {
                callback(false);
            } else {
                //debug(res.statusMessage, res.statusCode);
                callback(config.messages.errorPayment);
            }
        });
        req.on('error', function (error) {
            //debug(error);
            callback(config.messages.errorPayment);
        });

        req.write(orderPayload);
        req.end();

    } else {
        //debug('Missing required field or field invalid.');
        callback('Missing required field or field invalid.');
    }
};

const sendReceipt = function (sender, receiver, subject, message, callback) {

    //debug(`\nTrying to send a receipt from ${sender} to ${receiver}.\n`);

    // Validate fields
    sender = helpers.validateEmail(sender);
    receiver = helpers.validateEmail(receiver);
    subject = helpers.validateString(subject, 1, config.maxEmailSubjectLength);
    message = helpers.validateString(message);

    if (sender && receiver && subject && message) {

        // Create the request payload
        const payload = {
            from: sender,
            to: receiver,
            subject: subject,
            text: message
        };

        // Stringify the payload
        var stringPayload = querystring.stringify(payload);

        //debug("\nMail payload:\n" + stringPayload + "\n");

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': config.env.mailGun.hostname,
            'method': 'post',
            'path': `/v2/${config.env.mailGun.domain}/messages`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
                'Authorization': 'Basic ' + Buffer.from('api:' + config.env.mailGun.apiKey, 'utf8').toString('base64')
            }
        };

        // Instantiate the request object
        var req = https.request(requestDetails, function (res) {

            res.on('data', function (data) {
                //debug("\nData from MailGun:\n" + data + "\n");
            });

            res.on('end', function () {
                var status = res.statusCode;
                if (status === 200 || status === 201) {
                    callback(false);
                } else {
                    callback('Status code returned was ' + status, JSON.stringify(res.headers));
                }
            });
        });

        // In case of an error, bubble it up
        req.on('error', function (error) {
            callback(error);
        });

        // Add the payload
        req.write(stringPayload);
        req.end();

    } else {
        callback(`Error: Missing required field. Input data:\nSender: ${sender}\nReceiver: ${receiver}\nSubject: ${subject}\nMessage: ${message}\n`);
    }
};

/*
    Helper functions
*/
const createDescription = function (orderData) {

    return `Your order: \n==========\n${orderData.amount} * ${orderData.pizzaName} (${orderData.price.toFixed(2)} ${config.env.stripe.currencySign}) = ${orderData.totalPrice.toFixed(2)} ${config.env.stripe.currencySign}\nTOTAL: ${orderData.totalPrice.toFixed(2)} ${config.env.stripe.currencySign}\nYour red - hot freshly - baked pizza is on its way!`;
};

const createOrderPayload = function (charge, desc, email) {

    var payload = {
        'currency': config.env.stripe.currency,
        'source': config.env.stripe.source,
        'amount': charge,
        'description': desc,
        'receipt_email': email
    };

    //debug('Mailgun payload:', JSON.stringify(payload));

    // Stringify the payload
    return querystring.stringify(payload);
};

const createStripeRequest = function (content) {

    //debug(`\nSending request to Stripe:\n${content}\n`);

    var requestDetails = {
        'protocol': 'https:',
        'hostname': 'api.stripe.com',
        'method': 'POST',
        'path': '/v1/charges',
        'headers':
        {
            'Authorization': `Bearer ${config.env.stripe.secretKey}`,
            'Content-Length': Buffer.byteLength(content),
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    return requestDetails;
}

//Export the module
module.exports = _purchase;