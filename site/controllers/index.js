/**
 * Controller for the main index page
 */
'use strict';

var config = require('../../config');

module.exports = function(site) {
	site.get('/', function(req, res) {
		res.render('index', {
			title: 'MyStatus',
			botJid: config.xmpp.username
		});
	});
};