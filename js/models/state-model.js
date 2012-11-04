// The state of Spark Edit is handled in a Backbone model
Drupal.edit = Drupal.edit || {};
Drupal.edit.models = Drupal.edit.models || {};
Drupal.edit.models.StateModel = Backbone.Model.extend({
  defaults: {
    // We always begin in view mode.
    isViewing: true,
    entityBeingHighlighted: [],
    fieldBeingHighlighted: [],
    fieldBeingEdited: [],
    highlightedEditable: null,
    editedEditable: null,
    editedFieldView: null,
    formLoadedFor: null
  }
});
