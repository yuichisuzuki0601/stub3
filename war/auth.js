var auth = {};

auth.ACCOUNT_KEY = 'account-key';

auth.createSession = function(key) {
	localStorage.setItem(auth.ACCOUNT_KEY, key);
};

auth.getMe = function(callBack) {
	var key = localStorage.getItem(auth.ACCOUNT_KEY);
	if (key) {
		var me = new models.Account({
			'key' : key,
		});
		me.fetch().fail(function() {
			alert('authenticate failed.');
			location.href = 'login.html';
		}).done(function() {
			callBack(me);
		});
	} else {
		callBack(null);
	}
};

auth.invalidate = function() {
	localStorage.removeItem(auth.ACCOUNT_KEY);
};