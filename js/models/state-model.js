// The state of Spark Edit is handled in a Backbone model
Drupal.edit.StateModel = Backbone.Model.extend({
  defaults: {
    // We always begin in view mode.
    isViewing: true,
    entityBeingHighlighted: [],
    fieldBeingHighlighted: [],
    fieldBeingEdited: [],
    highlightedEditable: null,
    editedEditable: null,
    editedFieldView: null,
    formLoadedFor: null,
    wysiwygReady: false
  }
});
