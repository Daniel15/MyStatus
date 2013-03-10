/**
 * Bootstrapper for the site itself. Handles initialisation of Express.
 */
'use strict';

var express = require('express'),
	expressValidator = require('express-validator'),
	http = require('http'),
	path = require('path'),
	config = require('../config'),
	log = require('../log');

var site = express();

site.configure(function () {
	site.set('port', config.site.port);
	site.set('views', __dirname + '/views');
});

site.configure(function(){
	site.set('port', config.site.port);
	site.set('views', __dirname + '/views');
	site.set('view engine', 'jade');
	site.set('env', config.env.current);

	// Only log requests in dev
	if (config.env.development) {
		site.use(express.logger({
			format: 'dev',
			stream: {
				write: function (message) {
					log.info(message.trim());
				}
			}
		}));
	}

	site.use(express.bodyParser());
	site.use(express.methodOverride());
	site.use(express.responseTime());
	site.use(expressValidator);
	site.use(site.router);
	site.use(express.static(path.join(__dirname, 'public')));
});

site.configure('development', function(){
	site.use(express.errorHandler());
});

// Add all the controllers
['index', 'status', 'account'].forEach(function(controllerName) {
	require('./controllers/' + controllerName)(site);
});

exports.start = function () {
	http.createServer(site).listen(site.get('port'), function(){
		log.info('Site running on port ' + site.get('port'));
	});
};