'use strict';
var currentEnv = process.env.NODE_ENV || 'development',
	config = {
		env: {
			// Current environment name as a string
			current: currentEnv,
			// Handy booleans for current environment
			development: currentEnv === 'development',
			test: currentEnv === 'test',
			staging: currentEnv === 'staging',
			production: currentEnv === 'production',
			// Both staging and prod are considered live
			live: currentEnv === 'staging' || currentEnv === 'production'
		},
		log: {
			// Paths to save log files to
			file: __dirname + '/logs/log_' + currentEnv + '.log',
			exceptions: __dirname + '/logs/exceptions_' + currentEnv + '.log'
		},
		site: {
			// Port for website to listen on
			port: process.env.PORT || 8083
		},
		xmpp: {
			username: 'example@jabber.org',
			password: 'changeme'
		},
		database: {
			host: 'localhost',
			username: 'root',
			password: 'password',
			name: 'mystatus'
		}
	};

module.exports = config;