/**
 * Main code for the XMPP bot. Connects to XMPP and handles XMPP events.
 */
'use strict';

var xmpp = require('simple-xmpp'),
	crypto = require('crypto'),
	config = require('./../config'),
	db = require('./../db'),
	log = require('./../log');

/**
 * Fired when the bot connects to the XMPP server
 */
xmpp.on('online', function() {
	log.info('Connected to XMPP!');
});

/**
 * Fired when a chat message is received
 */
xmpp.on('chat', function(from, message) {
	log.info('Received from ' + from + ': ' + message);
	
	// Resend the registration message
	db.Account.find({ where: { jid: from }}).success(function (account) {
		exports.sendRegistrationMessage(from, account.accountCode);	
	});
});

/**
 * Fired when an error occurs
 */
xmpp.on('error', function(err) {
	log.error('Error in XMPP: ', err);
});

/**
 * Fired when a contact changes their status
 */
xmpp.on('buddy', function(jid, state, statusText) {
	// Ignore the bot's own status changes
	if (jid === config.xmpp.username) {
		return;
	}

	// Persist this change to the database
	db.Account.createOrUpdate(['jid'], {
		jid: jid,
		state: state,
		statusText: statusText
	});

	log.info(jid + ' changed state to "' + state + '" (' + statusText + ')');
});

/**
 * Fired when a user subscribes to the bot
 */
xmpp.on('subscribe', function(from) {
	// Accept the subscription
	log.info('Accepting subscribe request from ' + from);
	xmpp.acceptSubscription(from);
	xmpp.subscribe(from);

	exports.sendRegistrationMessage(from);
});

/**
 * Starts the XMPP bot.
 */
exports.start = function() {
	log.info('Connecting using ' + config.xmpp.username);
	xmpp.connect({
		jid: config.xmpp.username,
		password: config.xmpp.password,
		reconnect: true
	});

	// check for incoming subscription requests
	xmpp.getRoster();
};

/**
 * Send the registration message to the specified contact, so they can finish their registration
 * @param jid Jabber ID of the user
 * @param accountCode Account code for accessing their account
 */
exports.sendRegistrationMessage = function(jid, accountCode) {
	// Generate an account code for verification
	crypto.randomBytes(28, function(ex, buf) {
		// Only replace the account code if we didn't already have one
		if (!accountCode) {
			accountCode = buf.toString('hex');
			db.Account.createOrUpdate(['jid'], {
				jid: jid,
				accountCode: accountCode
			});
		}

		log.info('Sending registration message to ' + jid);
		xmpp.send(jid, 'Please go to this URL to complete your MyStatus registration: ' + config.site.baseUrl + 'account/' + accountCode);
	});
};

/**
 * Add the specified Jabber ID as a contact
 * @param jid Jabber ID
 */
exports.addContact = function(jid) {
	log.info('Adding ' + jid + ' as contact');
	xmpp.subscribe(jid);
};