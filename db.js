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
			where = {},
			paramsToUpdate = [];

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
				// Get names of all the parameters that are being updated
				for (var i in params) {
					if (params.hasOwnProperty(i) && !where[i]) {
						paramsToUpdate.push(i);
					}
				}
				record.updateAttributes(params, paramsToUpdate);
			}
		}).error(errorHandler || function(error) { throw error; });
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
		accountCode: Sequelize.STRING,
		features: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0
			
		} 
	}, {
		instanceMethods: {
			_featureBits: {
				video: 1,
				voice: 2
			},

			/**
			 * Check whether a certain feature is set for this user
			 * @param featureName Name of the feature
			 * @returns {Boolean}
			 */
			hasFeature: function(featureName) {
				var featureBit = this._featureBits[featureName];
				//noinspection JSHint
				return (this.features & featureBit) === featureBit;
			},
			
			getAllFeatures: function() {
				var features = {};
				
				for (var featureName in this._featureBits) {
					if (this._featureBits.hasOwnProperty(featureName)) {
						features[featureName] = this.hasFeature(featureName);
					}
				}
				
				return features;
			},

			/**
			 * Sets the value of the specified feature
			 * @param featureName Name of the feature to set
			 * @param value True or false
			 */
			setFeature: function(featureName, value) {
				var featureBit = this._featureBits[featureName];
				
				if (value) {
					//noinspection JSHint
					this.features |= featureBit;
				} else {
					//noinspection JSHint
					this.feature &= ~featureBit;
				}
			},
			
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