# Crazy Pizza CLI
4th homework assignment for [Pirple's NodeJS master class](https://pirple.thinkific.com/courses/the-nodejs-master-class).
This project adds CLI to a frontend website that inteacts with JSON RESTful API free of 3rd-party dependencies for a pizza-delivery company utilizing Stripe and MailGun external services.

## Features
- [x] View all the current menu items
- [x] View all the recent orders in the system (orders placed in the last 24 hours)
- [x] Lookup the details of a specific order by order ID
- [x] View all the users who have signed up in the last 24 hours
- [x] Lookup the details of a specific user by email address

## Manual

### Set up
0. Download the project.
1. Open the command prompt

`cd PizzaCLI`

2. Run the app:

`node index.js`

Optionally, one can set the environment as command line argument (with value of 'production' or 'staging'). The default is 'staging'.

`node index.js production` (for Windows)

`NODE_ENV=production node index.js` (for Linux)

3. The app informs which ports are active and that the Console is active.
4. In the console, enter a command. Find the available commands in a table below.
5. Enter `exit` to stop the app.

#### Use CLI in Chrome web browser

1. Start the application as described in **Set up**
2. Open up Chrome and and go to the address that the app printed out: `localhost:3000` or `localhost:5000`.
2. With the website opened, click F12 to show up console.
3. Enter a command. Find the available commands in the table below.

### CLI Commands

|Command|Description|
|-------------|----------------------------------------------------------------|
|`exit`       | Kill the CLI (the rest of the application)                     |
|`man`        | Show this help page                                            |
|`help`       | Alias of the "man" command                                     |
|`menu`       | View all the current menu items                                |
|`list orders`| Show all the recent orders in the system (orders placed in the last 24 hours) |
|`more order info --{orderId}`| Show details of a specified order              |
|`list users` | Show a list of all the users who have signed up in the last 24 hours |
|`more user info --{userEmail}`| Show detailed info of a specified user        |

