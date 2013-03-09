/**
 * REST controller handling output of the status data.
 */
'use strict';
var db = require('../../db'),
	log = require('../../log');

module.exports = function(app) {
	/**
	 * JSON feed for the specified user's status.
	 */
	app.get('/:username.json', function(req, res) {
		var username = req.params.username;
		db.Account.find({ where: { username: username }}).success(function (account) {
			// Ensure it exists
			if (!account) {
				log.info('Tried to access non-existent user: ' + username);
				res.jsonp(404, { error: 'User not found' });
				return;
			}

			res.set({
				'Last-Modified': account.updatedAt
			}).jsonp({
				state: account.getFriendlyState(),
				statusText: account.statusText,
				createdAt: account.createdAt,
				updatedAt: account.updatedAt
			});
		});
	});
};