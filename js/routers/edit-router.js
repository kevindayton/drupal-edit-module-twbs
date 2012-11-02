// Define Drupal.edit.routers.EditRouter.
Drupal.edit = Drupal.edit || {};
Drupal.edit.routers = {};
Drupal.edit.routers.EditRouter = Backbone.Router.extend({
  routes: {
    "quick-edit": "edit",
    "view": "view",
    "": "view"
  },
  edit: function() {
    Drupal.edit.state.set('isViewing', false);
  },
  view: function(query, page) {
    // Let's make sure we do not lose any changes, if there is a currently
    // active editableField?
    if (Drupal.edit.state.get('editedFieldView') && Drupal.edit.state.get('editedFieldView').isDirty()) {
      var that = this;
      Drupal.edit.confirm(Drupal.t('Currently edited field has changes, do you want to proceed?'), {}, function(confirmed) {
        if (!confirmed) {
          that.navigate('#quick-edit');
          return false;
        } else {
          Drupal.edit.state.set('isViewing', true);
          return true;
        }
      });
    } else {
      Drupal.edit.state.set('isViewing', true);
    }
  }
});
