/**
 * Controller for all account management functionality
 */
'use strict';

var util = require('util'),
	bot = require('../../bot'),
	config = require('../../config'),
	db = require('../../db'),
	log = require('../../log');

module.exports = function(site) {
	/**
	 * POST to register as a new user
	 */
	site.post('/account/register', function(req, res) {		
		req.assert('jid', 'Invalid Jabber ID').isEmail();
		var errors = req.validationErrors();
		if (errors) {
			// TODO: Display error message nicely
			res.send('Validation errors: ' + util.inspect(errors));
			return;
		}

		var jid = req.param('jid');

		// Check if this user has already registered and they're in the database
		db.Account.find({ where: { jid: jid }}).success(function (account) {
			// See if they already have an account code
			if (account) {
				// Already in the database, so assume they're on the contact list
				// Just send the message directly
				bot.sendRegistrationMessage(account.jid, account.accountCode);
			} else {
				// Not in the database, so assume they're not a contact yet
				// Add them as a contact - The bot will send the registration message once they accept
				bot.addContact(jid);
			}
		});

		res.render('account/registered', {
			title: 'Registered',
			botJid: config.xmpp.username
		});
	});

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