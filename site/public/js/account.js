(function($) {
	'use strict';
	
	// Attach event handlers to the "get the code" buttons
	$('#statusImages .get-code').click(function() {
		var url = $(this).data('url');
		
		$('#url').val(url);
		$('#bbcode').val('[img]' + url + '[/img]');
		$('#codeModal').modal();
	});
	
	$('#codeModal input').click(function () {
		this.select();
	});
	
	window.exampleCallback = function(data) {
		$('#jsonData').html(JSON.stringify(data).replace(/,/g, ',<br />'));
	}	
})(window.jQuery);


