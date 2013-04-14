(function($) {
	'use strict';

	var Account = window.Pages.Account = {
		init: function() {
			// Attach event handlers to the "get the code" buttons
			$('#statusImages .get-code').click(function() {
				var url = $(this).data('url');

				$('#url').val(url);
				$('#html').val('<img src="' + url + '">');
				$('#bbcode').val('[img]' + url + '[/img]');
				$('#codeModal').modal();
			});

			$('#codeModal input').click(function () {
				this.select();
			});
		},
		jsonCallback: function(data) {
			// Very simple JSON beautification :-)
			var rawJson = JSON.stringify(data),
				beautifulJson = '',
				currentLevel = 0,
				SPACE_SIZE = 4;

			function addLineBreak() {
				var spacesToAdd = SPACE_SIZE * (currentLevel - 1);
				beautifulJson += '<br />';
				while (spacesToAdd-- > 0) {
					beautifulJson += ' ';
				}
			}

			for (var i = 0, length = rawJson.length; i < length; i++) {
				var character = rawJson.charAt(i);
				beautifulJson += character;

				switch (character) {
					case '{':
						currentLevel++;
						addLineBreak();
						break;
					case '}':
						// Remove '}' already added since it needs to go to the next line
						beautifulJson = beautifulJson.slice(0, -1);
						currentLevel--;
						addLineBreak();
						beautifulJson += '}';
						break;
					case ',':
						addLineBreak();
						break;
				}
			}

			$('#jsonData').html(beautifulJson);
		}
	};

	Account.init();
}(window.jQuery));