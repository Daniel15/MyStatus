/**
 * REST controller handling output of the status data.
 */
'use strict';
var gm = require('gm'),
	config = require('../../config'),
	db = require('../../db'),
	log = require('../../log');

var cacheMins = 1;

function getIconPath(state) {
	var icon = 'offline';

	//noinspection FallthroughInSwitchStatementJS
	switch (state) {
		case 'online':
		case 'chat':
			icon = 'online';
			break;
		case 'dnd':
			icon = 'busy';
			break;
		case 'away':
		case 'xa':
			icon = 'away';
			break;
	}
	
	return 'img/icons/' + icon + '.png';
}

function getIconUrl(state) {
	return config.site.baseUrl + getIconPath(state);
}

function setCacheHeaders(account, res) {
	res.set({
		'Last-Modified': account ? account.updatedAt : new Date(),
		'Expires': new Date(Date.now() + (cacheMins * 60 * 1000))
	});
}

function renderText(text, res) {
	gm()
		.font('/usr/share/fonts/truetype/msttcorefonts/Arial.ttf')
		.background('transparent')
		.out('label:' + text)
		.stream('output.png', function (err, stdout, stderr)  {
			// TODO: Proper error handling
			if (err) {
				throw err;
			}

			stdout.pipe(res);
		});
}

function logError(error, username) {
	log.error('Error retrieving status for ' + username + ': ' + error);
}

module.exports = function(app) {	
	/**
	 * JSON feed for the specified user's status.
	 */
	app.get('/:username.json', function(req, res) {
		var username = req.params.username;
		db.Account.find({ where: { username: username }}).success(function (account) {
			// Ensure it exists
			if (!account) {
				log.error('Tried to access non-existent user: ' + username);
				res.jsonp(404, { error: 'User not found' });
				return;
			}

			setCacheHeaders(account, res);
			res.jsonp({
				state: account.getFriendlyState(),
				rawState: account.state,
				icon: getIconUrl(account.state),
				statusText: account.statusText,
				createdAt: account.createdAt,
				updatedAt: account.updatedAt
			});
		}).error(function (error) {
			logError(error, username);
			res.jsonp(500, { error: 'Could not retrieve status: ' + error });
		});
	});

	app.get('/:username/icon.png', function(req, res) {
		
		function sendIcon(account, state) {
			setCacheHeaders(account, res);
			res.sendfile(getIconPath(state), {
				root: __dirname + '/../public/'
			});
		}
		
		db.Account.find({ where: { username: req.params.username }}).success(function (account) {
			// Just display offline if the account doesn't exist
			var state = account ? account.state : 'offline';
			sendIcon(account, state);
		}).error(function (error) {
			logError(error, req.params.username);
			// Just display offline if there was a database error
			sendIcon(null, 'offline');
		});
	});
	
	app.get('/:username/status.png', function(req, res, next) {
		db.Account.find({ where: { username: req.params.username }}).success(function (account) {
			// Just display offline if the account doesn't exist
			var state = account ? account.getFriendlyState() : 'Offline';
			
			setCacheHeaders(account, res);
			renderText(state, res);
		}).error(function (error) {
			logError(error, req.params.username);
			// Just display offline if there was a database error
			renderText('Offline', res);
		});
	});

	app.get('/:username/statustext.png', function(req, res, next) {
		db.Account.find({ where: { username: req.params.username }}).success(function (account) {
			// Just display offline if the account doesn't exist
			var state = account ? account.getFriendlyState() : 'Offline';
			
			if (account && account.statusText && account.statusText !== state) {
				state += ' (' + account.statusText + ')';
			}

			setCacheHeaders(account, res);
			renderText(state, res);
		}).error(function (error) {
			logError(error, req.params.username);
			// Just display offline if there was a database error
			renderText('Offline', res);
		});
	});
};