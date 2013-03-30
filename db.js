'use strict';

var Sequelize = require('sequelize'),
	config = require('./config');

// Extra class methods to add to Sequelize
var extraClassMethods = {
	/**
	 * Performs an "upsert" - That is, does an update if a matching record already exists, otherwise does an insert
	 *
	 * @param whereProperties Names of the properties to use in the WHERE clause for matching
	 * @param params Hash of parameters to use in the INSERT or UPDATE
 	 * @param errorHandler Function to call when an error occurs
	 */
	createOrUpdate: function (whereProperties, params, errorHandler) {
		var self = this,
			where = {};

		whereProperties.forEach(function (key) {
			where[key] = params[key];
		});

		// Check if it already exists
		self.find({ where: where }).success(function (record) {
			// Doesn't exist, so try to do an insert
			if (!record) {
				self.create(params).error(function (error) {
					// If it's a duplicate key exception, a record with the same record was probably inserted
					// at exactly the same time, after the check above but before the insert (race condition /
					// threading issue). Just loop around again and re-run the update.
					if (error.code === 'ER_DUP_ENTRY') {
						self.createOrUpdate(whereProperties, params, errorHandler);
						return;
					}
					// If it's any other error, just throw it back
					if (errorHandler)
						errorHandler(error);
				});
			} else {
				// Record exists, so just do an update
				record.updateAttributes(params);
			}
		}).error(errorHandler);
	}
};

// Initialise Sequelize
var seq = new Sequelize(config.database.name, config.database.username, config.database.password, {
	host: config.database.host,
	// Enable logging in development
	logging: config.env.development
		? function(message) { require(__dirname + '/log').info(message); }
		: false,

	define: {
		charset: 'utf8',
		collate: 'utf8_general_ci',
		classMethods: extraClassMethods
	}
});

// Models
module.exports = {
	Account: seq.define('Account', {
		jid: {
			type: Sequelize.STRING,
			unique: true,
			allowNull: false,
			validate: {
				isEmail: true
			}
		},
		username: {
			type: Sequelize.STRING,
			unique: true,
			validate: {
				is: {
					args: /^[a-zA-Z0-9_\-]+$/i,
					msg: 'That username is invalid'
				}
			}
		},
		state: Sequelize.STRING,
		statusText: Sequelize.STRING,
		accountCode: Sequelize.STRING
	}, {
		instanceMethods: {
			/**
			 * Gets a user-friendly version of the state (eg. Online or Busy)
			 * @returns {string} User-friendly state
			 */
			getFriendlyState: function() {
				//noinspection FallthroughInSwitchStatementJS
				switch (this.state) {
					case 'online':
					case 'chat':
						return 'Online';
					case 'dnd':
						return 'Busy';
					case 'away':
					case 'xa':
						return 'Away';
					case 'offline':
						return 'Offline';
					default:
						return 'Unknown [' + this.state + ']';
				}
			}
		}
	})
};

// Create all missing tables
seq.sync();