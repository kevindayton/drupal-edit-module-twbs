Drupal.edit = Drupal.edit || {};
Drupal.edit.models = Drupal.edit.models || {};
Drupal.edit.models.EditAppModel = Backbone.Model.extend({
  defaults: {
    // We always begin in view mode.
    isViewing: true,
    highlightedEditor: null,
    activeEditor: null
  }
});
