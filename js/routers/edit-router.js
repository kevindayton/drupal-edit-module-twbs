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
    this.appView.state.set('isViewing', false);
  },
  view: function(query, page) {
    // Let's make sure we do not lose any changes, if there is a currently
    // active editableField?
    // @note: will go away here once we do the state-transtion gards in one place.
    if (this.appView.state.get('editedFieldView') && this.appView.state.get('editedFieldView').hasModifications()) {
      var that = this;
      Drupal.edit.confirm(Drupal.t('Currently edited field has changes, do you want to proceed?'), {}, function(confirmed) {
        if (!confirmed) {
          that.navigate('#quick-edit');
          return false;
        } else {
          that.appView.state.set('isViewing', true);
          return true;
        }
      });
    } else {
      that.appView.state.set('isViewing', true);
    }
  }
});
