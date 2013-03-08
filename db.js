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
	 */
	createOrUpdate: function (whereProperties, params) {
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
					if (error.code == 'ER_DUP_ENTRY') {
						self.createOrUpdate(whereProperties, params);
						return;
					}
					// If it's any other error, just throw it back
					throw error;
				});
			} else {
				// Record exists, so just do an update
				record.updateAttributes(params);
			}
		});
	}
};

// Initialise Sequelize
var seq = new Sequelize(config.database.name, config.database.username, config.database.password, {
	logging: false,
	define: {
		charset: 'utf8',
		collate: 'utf8_general_ci',
		classMethods: extraClassMethods
	}
});

// Models
module.exports = {
	Account: seq.define('Account', {
		jid: { type: Sequelize.STRING, unique: true },
		username: { type: Sequelize.STRING, unique: true },
		state: Sequelize.STRING,
		statusText: Sequelize.STRING
	})
};

// Create all missing tables
seq.sync();