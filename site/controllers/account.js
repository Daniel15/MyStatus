/**
 * Controller for all account management functionality
 */
'use strict';

var util = require('util'),
	config = require('../../config'),
	db = require('../../db'),
	log = require('../../log');

module.exports = function(site) {
	/**
	 * GET for the main account page
	 */
	site.get('/account/:accountCode', function(req, res) {
		// Check for an account with this account code
		db.Account.find({ where: { accountCode: req.params.accountCode }}).success(function (account) {
			if (!account) {
				log.info('Tried to access non-existent account with account code: ' + req.params.accountCode);
				res.send(404, 'User not found');
				return;
			}

			res.render('account/index', {
				title: 'Account',
				account: account,
				jsonUrl: config.site.baseUrl + account.username + '.json'
			});
		});
	});

	/**
	 * POSTting to set the username 
	 */
	site.post('/account/:accountCode', function(req, res) {
		db.Account.find({ where: { accountCode: req.params.accountCode }}).success(function (account) {
			// Ensure this username is not already in use
			db.Account.find({ where: { username: req.param('username') }}).success(function (existingAccount) {
				if (existingAccount) {
					// TODO: Display error message nicely
					res.send('That username is already taken.');
					return;
				}

				account.username = req.param('username');
				// Validate that the username is valid
				var errors = account.validate();
				if (errors) {
					// TODO: Display error message nicely
					res.send(errors.username[0]);
					return;
				}

				account.save();
				res.redirect('/account/' + account.accountCode);
			});
		});
	});
};