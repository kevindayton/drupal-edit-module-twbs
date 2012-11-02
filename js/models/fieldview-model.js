// The state of Spark Edit is handled in a Backbone model
Drupal.edit.models = Drupal.edit.models || {};
Drupal.edit.models.FieldViewModel = Backbone.Model.extend({
  defaults: {
    subject: null,
    predicate: null,
    entity: null,
    state: 1,
    modified: false,
    hasError: false,
    errorMsg: null
  },
  /* State Changes */
  STATE_CANDIDATE: 1,
  STATE_HIGHLIGHTED: 2,
  STATE_EDITING: 3,
  /* Retrieve VIE Entity for subject */
  getVieEntity: function() {
    return this.get('entity');
  },
  /* Editing can only be cancelled */
  canCancelEditing: function() {
    return (this.get('state') == this.STATE_EDITING && !this.get('modified'));
  }
});
