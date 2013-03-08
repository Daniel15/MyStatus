/**
 * Logging facade, handles logging via Winston
 */
'use strict';
var winston = require('winston'),
	config = require('./config'),
	winstonConfig = {
		transports: [
			new (winston.transports.Console)({
				json: false,
				timestamp: true,
				colorize: true
			}),
			new winston.transports.File({
				filename: config.log.file
			})
		],
		exitOnError: false
	};

// Log exceptions to log file in production
if (config.env.live) {
	winstonConfig.exceptionHandlers = [
		new (winston.transports.Console)({
			json: false,
			timestamp: true,
			colorize: true
		}),
		new winston.transports.File({
			filename: config.log.exceptions,
			json: false
		})
	];
}

var logger = module.exports = new (winston.Logger)(winstonConfig);