/**
 * REST controller handling output of the status data.
 */
'use strict';
var gm = require('gm'),
	config = require('../../config'),
	db = require('../../db'),
	log = require('../../log');

var cacheMins = 1;

/**
 * Get the path to the icon for the specified state. Normalises the state (eg. both "online" and "chat" appear as the 
 * online icon)
 * 
 * @param state State to get icon for
 * @param suffix Suffix for icon file (eg. "blah" will use "online-blah", "busy-blah" and "offline-blah")
 * @returns {string} Path to the icon file
 */
function getIconPath(state, suffix) {
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
	
	if (suffix) {
		icon += '-' + suffix;
	}
	
	return 'img/icons/' + icon + '.png';
}

/**
 * Gets the full absolute URL to the specified state icon
 * 
 * @param state State to get icon for
 * @returns {string} Full URL to the icon
 */
function getIconUrl(state) {
	return config.site.baseUrl + getIconPath(state);
}

/**
 * Gets the full absolute URL to the specified feature state icon
 * 
 * @param account Account to get icon for
 * @param feature Feature to check for
 * @param iconSuffix Suffix to use on icon filename
 * @returns {string} Full URL to the icon
 */
function getFeatureIconUrl(account, feature, iconSuffix) {
	var state = account.state,
		supportsFeature = account.hasFeature(feature);

	// Always show as offline if the user's client doesn't support this feature
	if (!supportsFeature) {
		state = 'offline';
	}
	
	return config.site.baseUrl + getIconPath(state, iconSuffix);
}

/**
 * Set the caching headers for this response
 * 
 * @param account Account to set caching headers based off
 * @param res Result
 */
function setCacheHeaders(account, res) {
	res.set({
		'Last-Modified': account ? account.updatedAt : new Date(),
		'Expires': new Date(Date.now() + (cacheMins * 60 * 1000))
	});
}

/**
 * Send the icon for the specified state
 * 
 * @param account Account to send icon for
 * @param state State to send icon for
 * @param res Result
 * @param iconSuffix Suffix to use on icon filename
 */
function sendIcon(account, state, res, iconSuffix) {
	setCacheHeaders(account, res);
	res.sendfile(getIconPath(state, iconSuffix), {
		root: __dirname + '/../public/'
	});
}

/**
 * Renders the specified text to the result
 * 
 * @param text Text to render
 * @param res Result
 */
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

			res.set('Content-Type', 'image/png');
			stdout.pipe(res);
		});
}

/**
 * Log an error that occured while retrieving a status
 * 
 * @param error Error to log
 * @param username Username that caused the error
 */
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
				icons: {
					status: getIconUrl(account.state),
					video: getFeatureIconUrl(account, 'video', 'video'),
					voice: getFeatureIconUrl(account, 'voice', 'voice')
				},
				statusText: account.statusText,
				features: account.getAllFeatures(),
				createdAt: account.createdAt,
				updatedAt: account.updatedAt
			});
		}).error(function (error) {
			logError(error, username);
			res.jsonp(500, { error: 'Could not retrieve status: ' + error });
		});
	});
	
	// TODO: Clean up the copypasta (db.Account.find(....)) below!

	app.get('/:username/icon.png', function(req, res) {		
		db.Account.find({ where: { username: req.params.username }}).success(function (account) {
			// Just display offline if the account doesn't exist
			var state = account ? account.state : 'offline';
			sendIcon(account, state, res);
		}).error(function (error) {
			logError(error, req.params.username);
			// Just display offline if there was a database error
			sendIcon(null, 'offline', res);
		});
	});

	/**
	 * Load the user's account and send a relevant icon for the specified feature
	 * 
	 * @param req Request
	 * @param res Response
	 * @param feature Feature to get icon for
	 * @param iconSuffix Suffix to use on icon filename
	 */
	function featureIcon(req, res, feature, iconSuffix) {
		db.Account.find({ where: { username: req.params.username }}).success(function (account) {
			// Just display offline if the account doesn't exist
			var state = account ? account.state : 'offline',
				supportsFeature = account ? account.hasFeature(feature) : false;
	
			// Always show as offline if the user's client doesn't support this feature
			if (!supportsFeature) {
				state = 'offline';
			}
	
			sendIcon(account, state, res, iconSuffix);
		}).error(function (error) {
			logError(error, req.params.username);
			// Just display offline if there was a database error
			sendIcon(null, 'offline', res, iconSuffix);
		});
	}

	app.get('/:username/video.png', function(req, res) {
		return featureIcon(req, res, 'video', 'video');
	});

	app.get('/:username/voice.png', function(req, res) {
		return featureIcon(req, res, 'voice', 'voice');
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