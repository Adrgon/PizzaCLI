/*
 * Frontend Logic for application
 *
 */
// Container for frontend application
var app = {};

// Config
app.config = {
    'sessionToken': false
};

// AJAX Client (for RESTful API)
app.client = {};

// Interface for making API calls
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {

    // Set defaults
    headers = typeof (headers) == 'object' && headers !== null ? headers : {};
    path = typeof (path) == 'string' ? path : '/';
    method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
    queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof (payload) == 'object' && payload !== null ? payload : {};
    callback = typeof (callback) == 'function' ? callback : false;

    // For each query string parameter sent, add it to the path
    var requestUrl = path + '?';
    var counter = 0;
    for (var queryKey in queryStringObject) {
        if (queryStringObject.hasOwnProperty(queryKey)) {
            counter++;
            // If at least one query string parameter has already been added, preprend new ones with an ampersand
            if (counter > 1) {
                requestUrl += '&';
            }
            // Add the key and value
            requestUrl += queryKey + '=' + queryStringObject[queryKey];
        }
    }

    // Form the http request as a JSON type
    var xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader("Content-type", "application/json");

    // For each header sent, add it to the request
    for (var headerKey in headers) {
        if (headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    // If there is a current session token set, add that as a header
    if (app.config.sessionToken) {
        xhr.setRequestHeader("token", app.config.sessionToken.id);
    }

    // When the request comes back, handle the response
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;

            // Callback if requested
            if (callback) {
                try {
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                } catch (e) {
                    callback(statusCode, false);
                }

            }
        }
    }

    // Send the payload as JSON
    var payloadString = JSON.stringify(payload);
    console.log(`Trying to send payload:\n${payloadString}`);
    xhr.send(payloadString);

};

// Bind the logout button
app.bindLogoutButton = function () {
    document.getElementById("logoutButton").addEventListener("click", function (e) {

        // Stop it from redirecting anywhere
        e.preventDefault();

        // Log the user out
        app.logUserOut();

    });
};

// Log the user out then redirect them
app.logUserOut = function (redirectUser) {
    // Set redirectUser to default to true
    redirectUser = typeof (redirectUser) == 'boolean' ? redirectUser : true;

    // Get the current token id
    var tokenId = typeof (app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

    // Send the current token to the tokens endpoint to delete it
    var queryStringObject = {
        'id': tokenId
    };
    app.client.request(undefined, 'api/tokens', 'DELETE', queryStringObject, undefined, function (statusCode, responsePayload) {
        // Set the app.config token as false
        app.setSessionToken(false);

        // Send the user to the logged out page
        if (redirectUser) {
            window.location = '/session/deleted';
        }

    });
};

// Bind the forms - catch the event when user submits a form and react to it
app.bindForms = function () {
    if (document.querySelector("form")) {

        var allForms = document.querySelectorAll("form");
        for (var i = 0; i < allForms.length; i++) {
            allForms[i].addEventListener("submit", function (e) {

                // Stop it from submitting
                e.preventDefault();
                var formId = this.id;
                var path = this.action;
                var method = this.method.toUpperCase();

                // Hide the error message (if it's currently shown due to a previous error)
                document.querySelector("#" + formId + " .formError").style.display = 'none';

                // Hide the success message (if it's currently shown due to a previous error)
                if (document.querySelector("#" + formId + " .formSuccess")) {
                    document.querySelector("#" + formId + " .formSuccess").style.display = 'none';
                }

                console.log('Binding form: ', formId, ' Path: ', path, 'Method: ', method);

                // Turn the inputs into a payload
                var payload = {};
                var elements = this.elements;
                for (var i = 0; i < elements.length; i++) {
                    if (elements[i].type !== 'submit') {
                        // Determine class of element and set value accordingly
                        var classOfElement = typeof (elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
                        var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
                        var elementIsChecked = elements[i].checked;
                        // Override the method of the form if the input's name is _method
                        var nameOfElement = elements[i].name;
                        if (nameOfElement == '_method') {
                            method = valueOfElement;
                        } else {
                            // Create an payload field named "id" if the elements name is actually uid
                            if (nameOfElement == 'uid') {
                                nameOfElement = 'id';
                            }
                            // If the element has the class "multiselect" add its value(s) as array elements
                            if (classOfElement.indexOf('multiselect') > -1) {
                                if (elementIsChecked) {
                                    payload[nameOfElement] = typeof (payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                                    payload[nameOfElement].push(valueOfElement);
                                }
                            } else {
                                payload[nameOfElement] = valueOfElement;
                            }
                        }
                    }
                }

                // If the method is DELETE, the payload should be a queryStringObject instead
                var queryStringObject = method == 'DELETE' ? payload : {};

                console.log('Sending payload:', payload);
                console.log('Sending query:', queryStringObject);

                // Call the API
                app.client.request(undefined, path, method, queryStringObject, payload, function (statusCode, responsePayload) {
                    // Display an error on the form if needed
                    if (statusCode !== 200) {

                        if (statusCode == 403) {
                            // log the user out
                            app.logUserOut();

                        } else {

                            // Try to get the error from the api, or set a default error message
                            var error = typeof (responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

                            // Set the formError field with the error text
                            document.querySelector("#" + formId + " .formError").innerHTML = error;

                            // Show (unhide) the form error field on the form
                            document.querySelector("#" + formId + " .formError").style.display = 'block';
                        }
                    } else {
                        // If successful, send to form response processor
                        app.formResponseProcessor(formId, payload, responsePayload);
                    }

                });
            });
        }
    }
};

// Form response processor - redirect the user depending on action taken
app.formResponseProcessor = function (formId, requestPayload, responsePayload) {

    // If account creation was successful, try to immediately log the user in
    if (formId == 'accountCreate') {
        // Take the email and password, and use it to log the user in
        var newPayload = {
            'email': requestPayload.email,
            'password': requestPayload.password
        };

        app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, function (newStatusCode, newResponsePayload) {
            // Display an error on the form if needed
            if (newStatusCode !== 200) {

                // Set the formError field with the error text
                document.querySelector("#" + formId + " .formError").innerHTML = 'Sorry, an error has occured. Please try again.';

                // Show (unhide) the form error field on the form
                document.querySelector("#" + formId + " .formError").style.display = 'block';

            } else {
                // If successful, set the token and redirect the user
                app.setSessionToken(newResponsePayload);
                window.location = '/orders/all';
            }
        });
    }
    // If login was successful, set the token in localstorage and redirect the user
    if (formId == 'sessionCreate') {
        app.setSessionToken(responsePayload);
        window.location = '/orders/all';
    }

    // If forms saved successfully and they have success messages, show them
    var formsWithSuccessMessages = ['accountEdit1', 'accountEdit2', 'ordersEdit1', 'purchase'];
    if (formsWithSuccessMessages.indexOf(formId) > -1) {
        document.querySelector("#" + formId + " .formSuccess").style.display = 'block';
    }

    // If the user just deleted their account, redirect them to the account-delete page
    if (formId == 'accountEdit3') {
        app.logUserOut(false);
        window.location = '/account/deleted';
    }

    // If the user just created a new order successfully, redirect back to the dashboard
    if (formId == 'ordersCreate') {
        window.location = '/orders/all';
    }

    // If the user just deleted a order, redirect them to the dashboard
    if (formId == 'ordersEdit2') {
        window.location = '/orders/all';
    }

    // If the user just purchased an order, deactivate the "purchase" button
    if (formId == 'purchase') {

        // Hide all credit card inputs and purchase button
        var hiddenWrappers = document.querySelectorAll(".inputWrapper");
        for (var i = 0; i < hiddenWrappers.length; i++) {
            hiddenWrappers[i].style.display = 'none';
        }
    }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function () {

    var tokenString = localStorage.getItem('token');

    if (typeof (tokenString) == 'string') {
        try {
            var token = JSON.parse(tokenString);
            app.config.sessionToken = token;
            if (typeof (token) == 'object') {
                app.setLoggedInClass(true);
            } else {
                app.setLoggedInClass(false);
            }
        } catch (e) {
            app.config.sessionToken = false;
            app.setLoggedInClass(false);
        }
    }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function (add) {
    var target = document.querySelector("body");
    if (add) {
        target.classList.add('loggedIn'); //add elements with 'loggedIn' class
    } else {
        target.classList.remove('loggedIn');
    }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function (token) {
    app.config.sessionToken = token;
    var tokenString = JSON.stringify(token);
    localStorage.setItem('token', tokenString);
    if (typeof (token) == 'object') {
        app.setLoggedInClass(true);
    } else {
        app.setLoggedInClass(false);
    }
};

// Renew the token
app.renewToken = function (callback) {
    var currentToken = typeof (app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
    if (currentToken) {
        // Update the token with a new expiration
        var payload = {
            'id': currentToken.id,
            'extend': true,
        };
        app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, function (statusCode, responsePayload) {
            // Display an error on the form if needed
            if (statusCode == 200) {
                // Get the new token details
                var queryStringObject = { 'id': currentToken.id };
                app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
                    // Display an error on the form if needed
                    if (statusCode == 200) {
                        app.setSessionToken(responsePayload);
                        callback(false);
                    } else {
                        app.setSessionToken(false);
                        callback(true);
                    }
                });
            } else {
                app.setSessionToken(false);
                callback(true);
            }
        });
    } else {
        app.setSessionToken(false);
        callback(true);
    }
};

// Load data on the page
app.loadDataOnPage = function () {

    // Get the current page from the body class
    var bodyClasses = document.querySelector("body").classList;
    var primaryClass = typeof (bodyClasses[0]) == 'string' ? bodyClasses[0] : false;

    // Logic for account settings page
    if (primaryClass == 'accountEdit') {
        app.loadAccountEditPage();
    }

    // Logic for dashboard page
    if (primaryClass == 'ordersList') {
        app.loadOrdersListPage();
    }

    // Logic for order details page
    if (primaryClass == 'ordersEdit') {
        app.loadOrdersEditPage();
    }

    // Logic for purchase page
    if (primaryClass == 'purchase') {
        app.loadPurchasePage();
    }
};

// Load the account edit page specifically
app.loadAccountEditPage = function () {

    // Get the email from the current token, or log the user out if none is there
    var email = typeof (app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;

    console.log(`loadAccountEditPage received email: ${email}`);

    if (email) {
        // Fetch the user data
        var queryStringObject = { 'email': email };

        console.log(`Sending request to API: ${email}`);

        app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
            if (statusCode == 200) {

                console.log(`loadAccountEditPage received payload: ${JSON.stringify(responsePayload)}`);

                // Put the data into the forms as values where needed
                document.querySelector("#accountEdit1 .firstNameInput").value = responsePayload.firstName;
                document.querySelector("#accountEdit1 .lastNameInput").value = responsePayload.lastName;
                document.querySelector("#accountEdit1 .displayEmailInput").value = responsePayload.email;
                document.querySelector("#accountEdit1 .addressInput").value = responsePayload.streetAddress;

                // Put the hidden email field into both forms
                var hiddenEmailInputs = document.querySelectorAll("input.hiddenEmailNumberInput");
                for (var i = 0; i < hiddenEmailInputs.length; i++) {
                    hiddenEmailInputs[i].value = responsePayload.email;
                }

            } else {
                // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
                app.logUserOut();
            }
        });
    } else {
        app.logUserOut();
    }
};

// Load the dashboard page specifically
app.loadOrdersListPage = function () {

    // Get the email number from the current token, or log the user out if none is there
    var email = typeof (app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;
    if (email) {
        // Fetch the user data
        var queryStringObject = {
            'email': email
        };

        //Get user's order
        app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
            if (statusCode == 200) {

                // Determine how many orders the user has
                const allOrders = Array.isArray(responsePayload.orders) && responsePayload.orders.length > 0 ? responsePayload.orders : [];

                console.log('User\'s orders: ', JSON.stringify(allOrders));

                if (allOrders.length > 0) {

                    //Count the actual number of successfully read orders
                    let orderCount = 0;

                    // Show each created order as a new row in the table
                    allOrders.forEach(function (orderId) {
                        // Get the data for the order
                        var newQueryStringObject = { 'id': orderId };

                        //Read the order file
                        app.client.request(undefined, 'api/orders', 'GET', newQueryStringObject, undefined, function (statusCode, responsePayload) {
                            if (statusCode == 200) {

                                ++orderCount;
                                var orderData = responsePayload;

                                // Make the order data into a table row
                                var table = document.getElementById("ordersListTable");
                                var tr = table.insertRow(-1);
                                tr.classList.add('orderRow');

                                tr.insertCell(0).innerHTML = new Date(orderData.id).toLocaleString();
                                var td1 = tr.insertCell(1);
                                var td2 = tr.insertCell(2);
                                var td3 = tr.insertCell(3);
                                var td4 = tr.insertCell(4);

                                // td0.innerHTML = new Date(orderData.id).toLocaleString();
                                td1.innerHTML = orderData.pizzaName + ' * ' + orderData.amount;
                                td2.innerHTML = orderData.totalPrice == undefined ? null : orderData.totalPrice.toFixed(2) + '$';
                                td3.innerHTML = '<a class="backButton" href="/orders/edit?id=' + orderId + '">Edit / Delete</a>';
                                td4.innerHTML = '<a class="backButton" href="/purchase?id=' + orderId + '">Purchase</a>';

                            } else {
                                console.log("Error trying to load order ID: ", orderId);
                            }
                        });
                    });

                    if (allOrders.length < 5) {

                        // Show the createOrder CTA
                        document.getElementById("createOrderCTA").style.display = 'block';
                        document.getElementById("maxOrdersMessage").style.display = 'none';

                    } else {

                        document.getElementById("noOrdersMessage").style.display = 'none';
                        document.getElementById("maxOrdersMessage").style.display = 'block';
                    }

                } else {

                    // Show 'you have no orders' message
                    document.getElementById("noOrdersMessage").style.display = 'table-row';
                    document.getElementById("maxOrdersMessage").style.display = 'none';

                    // Show the createOrder CTA
                    document.getElementById("createOrderCTA").style.display = 'block';

                }
            } else {
                // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
                console.log('Couldn\'t get the user');
                app.logUserOut();
            }
        });
    } else {
        console.log('Couldn\'t get the email');
        app.logUserOut();
    }
};

// Load the orders edit page specifically
app.loadOrdersEditPage = function () {

    // Get the order id from the query string, if none is found then redirect back to dashboard
    var id = typeof (window.location.href.split('=')[1]) == 'string' && window.location.href.split('=')[1].length > 0 ? window.location.href.split('=')[1] : false;
    if (id) {
        // Fetch the order data
        var queryStringObject = {
            'id': id
        };
        app.client.request(undefined, 'api/orders', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
            if (statusCode == 200) {

                // Put the hidden id field into both forms
                var hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
                for (var i = 0; i < hiddenIdInputs.length; i++) {
                    hiddenIdInputs[i].value = responsePayload.id;
                }

                // Put the data into the top form as values where needed
                document.querySelector("#ordersEdit1 .displayIdInput").value = new Date(responsePayload.id).toLocaleString();
                document.querySelector("#ordersEdit1 .pizzaIdInput").selectedIndex = responsePayload.pizzaId - 1;
                document.querySelector("#ordersEdit1 .displayAmountInput").value = responsePayload.amount;

            } else {
                // If the request comes back as something other than 200, redirect back to dashboard
                window.location = '/orders/all';
            }
        });
    } else {
        window.location = '/orders/all';
    }
};

// Load purchase page
app.loadPurchasePage = function () {

    console.log('Loading purchase page...');

    // Get the order id from the query string, if none is found then redirect back to dashboard
    var id = typeof (window.location.href.split('=')[1]) == 'string' && window.location.href.split('=')[1].length > 0 ? window.location.href.split('=')[1] : false;
    if (id) {
        // Fetch the order data
        var queryStringObject = {
            'id': id
        };
        app.client.request(undefined, 'api/orders', 'GET', queryStringObject, undefined, function (statusCode, pizzaData) {
            if (statusCode == 200) {

                // Put the hidden id field into both forms
                var hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");

                for (var i = 0; i < hiddenIdInputs.length; i++) {
                    hiddenIdInputs[i].value = pizzaData.id;
                }

                document.getElementById("description").innerText =
                    `You ordered

${pizzaData.amount} * ${pizzaData.pizzaName} (${pizzaData.price.toFixed(2)}$)
---

Total: ${pizzaData.totalPrice.toFixed(2)}$`;

            } else {
                // If the request comes back as something other than 200, redirect back to dashboard
                window.location = '/orders/all';
            }
        });
    } else {
        window.location = '/orders/all';
    }
};

// Loop to renew token often
app.tokenRenewalLoop = function () {
    setInterval(function () {
        app.renewToken(function (err) {
            if (!err) {
                console.log("Token renewed successfully @ " + Date.now());
            }
        });
    }, 1000 * 60);
};

// Init (bootstrapping)
app.init = function () {

    // Bind all form submissions
    app.bindForms();

    // Bind logout button
    app.bindLogoutButton();

    // Fetch the token from local storage
    app.getSessionToken();

    // Renew token
    app.tokenRenewalLoop();

    // Load data on page
    app.loadDataOnPage();

};

// Call the init processes after the window loads
window.onload = function () {
    app.init();
};
