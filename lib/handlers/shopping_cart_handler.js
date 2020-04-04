/*
	Shapping cart request handlers
*/

//Dependencies
var _data = require('../data');
var helpers = require('../helpers');
var config = require('../config');
var _tokens = require('./tokens_handler');
//var debug = require('debug')('shopping_cart');

//Private container
_shopping_cart = {};

// Shopping cart - GET
// Required header: token
// Required query string: id
_shopping_cart.get = function (data, callback) {

	//debug(`Trying to read an order from:\n${JSON.stringify(data.queryStringObject)}`);

	// Verify that the given token is valid
	_tokens.verifyToken(data.headers.token, function (tokenIsValid) {

		if (!tokenIsValid) {
			callback(403, { 'Error': config.messages.invalidToken });
			return;
		}
		else {

			// Get the order id from query string
			const id = helpers.validateString(data.queryStringObject.id);

			if (id) {

				//Read order's data
				_data.read(config.ordersFolder, id, function (err, orderData) {

					if (err || orderData == null) {
						callback(404, { 'Error': config.messages.errorCart });
						return;
					}
					else {
						callback(200, orderData);
					}
				});

			} else {
				callback(400, { 'Error': 'Missing required id field, or field invalid' });
			}
		}
	});
};

// Shopping cart - POST
// Required data: token, a pizza object (id field is required, amount is optional)
// Optional data: none

_shopping_cart.post = function (data, callback) {

	//debug(`Trying to create an order from payload:\n${JSON.stringify(data.payload)}`);

	// Verify that the given token is valid
	_tokens.verifyToken(data.headers.token, function (tokenIsValid, tokenData) {

		if (!tokenIsValid) {
			callback(403, { 'Error': config.messages.invalidToken });
			return;
		}
		else {
			//Lookup the user
			var userEmail = tokenData.email;

			_data.read(config.usersFolder, userEmail, function (err, userData) {

				if (!err && userData) {

					var userOrders = Array.isArray(userData.orders) ? userData.orders : [];

					// Verify that user has less than the number of max-orders per user
					if (userOrders.length < config.maxOrders) {

						//Get input data
						let pizzaId = data.payload.pizzaId;
						let amount = data.payload.amount == undefined ? 1 : data.payload.amount;

						//Validate the input
						const pizzaObject = helpers.validatePizza({ "pizzaId": pizzaId, "amount": amount });

						//debug(`Input validated: ${JSON.stringify(pizzaObject)}`);

						if (!pizzaObject) {
							callback(403, { 'Error': (!pizzaId) ? 'Pizza id not valid' : `Invalid amount. Max: ${config.maxAmountPerOrderItem}` });
							return;
						}

						// Create order id
						const orderId = Date.now();

						// Create order object including userEmail
						const orderObject = {
							'id': orderId,
							'userEmail': userEmail,
							'pizzaId': pizzaId,
							'pizzaName': pizzaObject.pizzaName,
							'amount': amount,
							'price': pizzaObject.price,
							'totalPrice': pizzaObject.totalPrice,
							'paid': false
						};

						// Save the object
						_data.create(config.ordersFolder, orderId, orderObject, function (err) {
							if (!err) {
								// Add order id to the user's object
								userData.orders = userOrders;
								userData.orders.push(orderId);

								// Save the new user data
								_data.update(config.usersFolder, userEmail, userData, function (err) {
									if (!err) {
										// Return the data about the new order
										callback(200, orderObject);
									} else {
										callback(500, { 'Error': 'Could not update the user with the new order.' });
									}
								});
							} else {
								callback(500, { 'Error': 'Could not create the new order' });
							}
						});
					} else {
						callback(400, { 'Error': 'The user already has the maximum number of orders (' + config.maxOrders + ').' })
					}
				} else {
					callback(403);
				}
			});
		}
	});
};

// Orders - PUT
// Required data: orderid
// Optional data: pizzaId, amount (one must be sent)
_shopping_cart.put = function (data, callback) {
	// Check for required field
	let orderId = helpers.validateString(data.payload.id);

	// Error if id is invalid
	if (orderId) {

		// Check for optional fields

		let pizzaId = data.payload.pizzaId == undefined ? 1 : data.payload.pizzaId;
		let amount = data.payload.amount == undefined ? 1 : data.payload.amount;

		//Validate the input
		const fieldsAreValid = false !== helpers.validatePizza({ "pizzaId": pizzaId, "amount": amount });

		// Error if nothing is sent to update
		if (fieldsAreValid) {
			// Lookup the order
			_data.read(config.ordersFolder, orderId, function (err, orderData) {
				if (!err && orderData) {

					// Get the token that sent the request
					var token = helpers.validateString(data.headers.token);

					// Verify that the given token is valid and belongs to the user who created the order
					_tokens.verifyTokenAndEmail(token, orderData.userEmail, function (tokenIsValid) {

						if (tokenIsValid) {
							// Update order data where necessary
							if (pizzaId) {
								orderData.pizzaId = pizzaId;
							}
							if (amount) {
								orderData.amount = amount;
							}

							//Calculate the price and pizza name
							let updatedPizza = helpers.validatePizza({ "pizzaId": orderData.pizzaId, "amount": orderData.amount });

							const orderObject = {
								'id': parseInt(orderId),
								'userEmail': orderData.userEmail,
								'pizzaId': orderData.pizzaId,
								'pizzaName': updatedPizza.pizzaName,
								'amount': updatedPizza.amount,
								'price': updatedPizza.price,
								'totalPrice': updatedPizza.totalPrice,
								'paid': false
							};

							// Store the new updates
							_data.update(config.ordersFolder, orderId, orderObject, function (err) {
								if (!err) {
									callback(200);
								} else {
									callback(500, { 'Error': 'Could not update the order.' });
								}
							});
						} else {
							callback(403);
						}
					});
				} else {
					callback(400, { 'Error': 'Order ID does not exist.' });
				}
			});
		} else {
			callback(400, { 'Error': 'Missing fields to update or fields invalid.' });
		}
	} else {
		callback(400, { 'Error': 'Missing required id field.' });
	}
};


// Shopping cart - DELETE
// Required data: token, orderId
// Optional data: none
_shopping_cart.delete = function (data, callback) {

	//debug(`Trying to delete order ${data.queryStringObject.id}`);

	// Verify that the given token is valid
	_tokens.verifyToken(data.headers.token, function (tokenIsValid, tokenData) {

		if (tokenIsValid) {

			var orderId = data.queryStringObject.id;

			if (!orderId) {
				callback(403, { 'Error': 'Order id is missing or not a number.' });
				return;
			}

			// Delete the order data
			_data.delete(config.ordersFolder, orderId, function (err) {
				if (!err) {
					// Lookup the user's object to get all their orders
					_data.read(config.usersFolder, tokenData.email, function (err, userData) {
						if (!err) {
							var userOrders = Array.isArray(userData.orders) ? userData.orders : [];

							// Remove the deleted order from their list of orders
							//debug(`Trying to delete order with id ${orderId} of type ${typeof (orderId)} from user's order array ${userOrders}`);

							var orderPosition = userOrders.indexOf(parseInt(orderId));

							//debug(`Order position: ${orderPosition} type : ${typeof (parseInt(orderId))}`);

							if (orderPosition > -1) {
								userOrders.splice(orderPosition, 1);
								// Re-save the user's data
								userData.orders = userOrders;
								_data.update(config.usersFolder, tokenData.email, userData, function (err) {
									if (!err) {
										callback(200);
									} else {
										callback(500, { 'Error': 'Could not update the user.' });
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

		} else {
			callback(403, { 'Error': config.messages.invalidToken });
			return;
		}
	});
};

//Export the module
module.exports = _shopping_cart;