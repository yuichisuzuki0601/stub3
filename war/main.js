var main = {};

main.mainRouter = null;

main.MainRouter = Backbone.Router.extend({
	routes : {
		'' : 'home',
		'create/:reload' : 'create',
		'edit/:key' : 'edit',
	},
	initialize : function() {
		this.collection = new models.Comments();
		this.headerView = new main.HeaderView({
			el : $('#header-view'),
		});
		this.postView = new main.PostView({
			el : $('#post-view'),
			collection : this.collection,
		});
		this.commentsView = new main.CommentsView({
			el : $('#comments-view'),
			collection : this.collection,
		});
		this.me = null;
	},
	render : function(reload) {
		this.headerView.model = this.me;
		this.headerView.render();
		this.postView.me = this.me;
		this.postView.render();
		this.commentsView.me = this.me;
		if (reload === 'yes') {
			this.commentsView.render();
		}
	},
	home : function() {
		auth.getMe(_.bind(function(me) {
			if (me) {
				this.me = me;
				main.mainRouter.navigate('create/yes', {
					trigger : true,
				});
				return;
			} else {
				auth.invalidate();
				this.me = new models.Account({
					'userId' : 'guest',
					'password' : '',
				});
				this.postView.btnCaption = '-';
				this.render('yes');
			}
		}, this));
	},
	create : function(reload) {
		if (this.me && this.me.id) {
			this.postView.model = new models.Comment(null, {
				collection : this.collection,
			});
			this.postView.btnCaption = 'post comment';
			this.render(reload);
		} else {
			main.mainRouter.navigate('', {
				trigger : true,
			});
		}
	},
	edit : function(key) {
		if (this.me && this.me.id) {
			this.postView.model = this.collection.get(key);
			this.postView.btnCaption = 'edit comment';
			this.render('no');
		} else {
			main.mainRouter.navigate('', {
				trigger : true,
			});
		}
	}
});

main.HeaderView = Backbone.View.extend({
	events : {
		'click #btn-login' : 'login',
		'click #btn-make-account' : 'makeAccount',
		'click #btn-change-password' : 'changePassword',
		'click #btn-delete-account' : 'deleteAccount',
		'click #btn-logout' : 'logout',
	},
	initialize : function() {
		this.$btnNotAuth = $('.btn-not-auth');
		this.$btnInAuth = $('.btn-in-auth');
		this.$changePassword = $('#change-password');
	},
	render : function() {
		$('#my-info').text('hello!! ' + this.model.get('userId'));
		this.$changePassword.val(this.model.get('password'));
		if (!this.model.id) {
			this.$btnNotAuth.show();
			this.$btnInAuth.hide();
		} else {
			this.$btnNotAuth.hide();
			this.$btnInAuth.show();
		}
	},
	login : function() {
		var $userId = $('#user-id');
		var $password = $('#password');
		var param = {
			'userId' : $userId.val(),
			'password' : $password.val(),
		};
		this.model.fetch({
			data : param,
		}).done(_.bind(function() {
			alert('succeed!! ' + $userId.val() + '/' + $password.val());
			$userId.val('');
			$password.val('');
			auth.createSession(this.model.id);
			$('#div-login').modal('hide');
			$('.navbar-collapse').collapse('hide');
			main.mainRouter.navigate('create/yes', {
				trigger : true,
			});
		}, this)).fail(_.bind(function(res) {
			if (res.status === 404) {
				alert('The user id or password you entered is incorrect.');
			} else {
				console.log(res.responseText);
			}
		}, this));
	},
	makeAccount : function() {
		var $makeUserId = $('#make-user-id');
		var $makePassword = $('#make-password');
		var account = new models.Account({
			'userId' : $makeUserId.val(),
			'password' : $makePassword.val(),
		});
		account.save().done(_.bind(function() {
			alert('complete!! ' + $makeUserId.val() + '/' + $makePassword.val());
			$makeUserId.val('');
			$makePassword.val('');
			$('#div-make-account').modal('hide');
		}, this)).fail(function(res) {
			if (res.status === 409) {
				alert('The user id is already in used.');
			} else {
				console.log(res.responseText);
			}
		});
	},
	changePassword : function() {
		var pre = this.model.get('password');
		this.model.set('password', this.$changePassword.val());
		this.model.save().done(_.bind(function() {
			var post = this.model.get('password');
			alert('succeed!! [' + pre + ' -> ' + post + ']');
			$('#div-change-password').modal('hide');
			$('.navbar-collapse').collapse('hide');
		}, this));
	},
	deleteAccount : function() {
		if (window.confirm('delete account ok?')) {
			this.model.destroy().done(_.bind(function() {
				alert('succeed!!');
				this.logout();
			}, this));
		}
	},
	logout : function() {
		auth.invalidate();
		$('.navbar-collapse').collapse('hide');
		main.mainRouter.navigate('', {
			trigger : true,
		});
	},
});

main.PostView = Backbone.View.extend({
	events : {
		'click #btn-post-comment' : 'postComment',
	},
	initialize : function() {
		this.$text = $('#text');
	},
	render : function() {
		if (this.model) {
			this.$text.val(this.model.get('text'));
		}
		$('#btn-post-comment').text(this.btnCaption);
	},
	postComment : function() {
		if (this.me.id) {
			this.model.save({
				'myKey' : this.me.id,
				'text' : this.$text.val(),
			}).done(_.bind(function() {
				this.collection.add(this.model, {
					merge : true,
				});
				Backbone.history.fragment = '_';
				main.mainRouter.navigate('/create/no', {
					trigger : true,
				});
			}, this));
		} else {
			alert('plz login!!');
		}
	},
});

main.CommentsView = Backbone.View.extend({
	initialize : function() {
		this.listenTo(this.collection, 'add', this.addCommentView);
	},
	render : function() {
		this.$el.empty();
		this.collection.fetch({
			silent : true,
		}).done(_.bind(function() {
			this.collection.each(function(comment) {
				this.addCommentView(comment);
			}, this);
		}, this));
	},
	addCommentView : function(comment) {
		this.$el.prepend(new main.CommentView({
			model : comment,
			me : this.me,
		}).render().el);
	},
});

main.CommentView = Backbone.View.extend({
	tmpl : _.template($('#tmpl-comment-view').html()),
	events : {
		'click .btn-edit-comment' : 'editComment',
		'click .btn-delete-comment' : 'deleteComment',
	},
	initialize : function(options) {
		this.me = options.me;
		this.owner = this.model.get('account');
		this.model.unset('account');
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'destroy', this.onDestroy);
	},
	render : function() {
		var json = this.model.toJSON();
		json.myComment = this.me ? this.me.id === this.owner.key : false;
		json.ownerId = this.owner.userId;
		this.$el.html(this.tmpl(json));
		return this;
	},
	editComment : function() {
		main.mainRouter.navigate('edit/' + this.model.id, {
			trigger : true,
		});
	},
	deleteComment : function() {
		this.model.destroy();
	},
	onDestroy : function() {
		this.remove();
	},
});

main.init = function(me) {
	main.mainRouter = new main.MainRouter();
	Backbone.history.start();
};

$(document).ready(function() {
	main.init();
});