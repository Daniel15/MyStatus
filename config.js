'use strict';
var currentEnv = process.env.NODE_ENV || 'development',
	env = {
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
	config = {
		env: env,
		log: {
			// Paths to save log files to
			file: __dirname + '/logs/log_' + currentEnv + '.log',
			exceptions: __dirname + '/logs/exceptions_' + currentEnv + '.log'
		},
		site: {
			// Port for website to listen on
			port: process.env.PORT || 8083,
			baseUrl: null
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

// Set base URL depending on environment
switch (env.current) {
	case 'production':
		config.site.baseUrl = 'http://mystatus.im/';
		break;
	case 'staging':
		config.site.baseUrl =  'http://staging.mystatus.im/';
		break;
	default:
		config.site.baseUrl =  'http://127.0.0.1:8083/';
		break;
}

module.exports = config;