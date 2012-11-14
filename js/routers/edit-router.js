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
    // If there is an active editor, try to revert it to candidate first; this
    // will prompt user for confirmation if changes may be lost in that process.
    that.appView.revertActiveEditorToCandidate(function(accept) {
      if (accept) {
        that.appView.model.set('isViewing', true);
      } else {
        that.navigate('#quick-edit');
      }
    });
  }
});
