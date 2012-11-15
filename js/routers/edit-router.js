// Define Drupal.edit.routers.EditRouter.
Drupal.edit = Drupal.edit || {};
Drupal.edit.routers = {};
Drupal.edit.routers.EditRouter = Backbone.Router.extend({
  routes: {
    "quick-edit": "edit",
    "view": "view",
    "": "view"
  },
  initialize: function(options) {
    this.appView = options.appView;
  },
  edit: function() {
    this.appView.model.set('isViewing', false);
  },
  view: function(query, page) {
    var that = this;

    // If there's an active editor, attempt to set its state to 'candidate', and
    // then act according to the user's choice.
    var activeEditor = this.appView.model.get('activeEditor');
    if (activeEditor) {
      var editableEntity = activeEditor.options.widget;
      var predicate = activeEditor.options.property;
      editableEntity.setState('candidate', predicate, { reason: 'menu' }, function(accepted) {
        if (accepted) {
          that.appView.model.set('isViewing', true);
        }
        else {
          that.navigate('#quick-edit');
        }
      });
    }
    // Otherwise, we can switch to view mode directly.
    else {
      that.appView.model.set('isViewing', true);
    }
  }
});
