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
	 * Renders the "Choose username" page
	 * @param req     Request
	 * @param res     Response
	 * @param account Account
 	 * @param errors  Any error messages to display
	 */
	function chooseUsername(req, res, account, errors) {
		res.render('account/choose-username', {
			title: 'Choose Your Username',
			account: account,
			errors: errors
		});
	}
	
	/**
	 * GET for the main account page
	 */
	site.get('/account/:accountCode', function(req, res) {
		// Check for an account with this account code
		db.Account.find({ where: { accountCode: req.params.accountCode }}).success(function (account) {
			if (!account) {
				log.error('Tried to access non-existent account with account code: ' + req.params.accountCode);
				res.send(404, 'User not found');
				return;
			}
			
			// If they haven't chosen a username, get to it!
			if (!account.username) {
				return chooseUsername(req, res, account, null);
			}
			
			var usernameBasePath = config.site.baseUrl + account.username;

			res.render('account/index', {
				title: 'Your Account',
				account: account,
				
				statusImages: [
					{ format: 'Icon', url: usernameBasePath + '/icon.png' },
					{ format: 'Status', url: usernameBasePath + '/status.png' },
					{ format: 'Status and status text', url: usernameBasePath + '/statustext.png' }
				],
				url: {
					json: usernameBasePath + '.json',
					jsonp: usernameBasePath + '.json?callback=exampleCallback'
				}
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
					return chooseUsername(req, res, account, 'That username is already taken.');
				}

				account.username = req.param('username');
				// Validate that the username is valid
				var errors = account.validate();
				if (errors) {
					return chooseUsername(req, res, account, errors.username[0]);
				}

				account.save();
				res.redirect('/account/' + account.accountCode);
			});
		});
	});
};