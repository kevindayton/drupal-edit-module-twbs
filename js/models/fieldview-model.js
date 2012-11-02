// The state of Spark Edit is handled in a Backbone model
Drupal.edit.models = Drupal.edit.models || {};
Drupal.edit.models.FieldViewModel = Backbone.Model.extend({
  defaults: {
    subject: null,
    predicate: null,
    entity: null,
    state: 0,
    errorMsg: null
  },
  /* State Changes cf. https://github.com/bergie/create/blob/gh-pages/guide/_posts/2012-06-04-editable.md */

  /* editable has been loaded but is inactive - it is not indicated or possible to activate via UI/Webpage */
  STATE_INACTIVE: 0,
  /* editable has been loaded and it will have indicators that can be used to activate it */
  STATE_CANDIDATE: 1,
  /* editable is currently in focus (e.g. mouse over) and will be visually highlighted */
  STATE_HIGHLIGHTED: 2,
  /* editable and editor widgets are loaded, visible and can be used but no changes have taken place yet */
  STATE_ACTIVE: 3,
  /* editable value has been modified */
  STATE_MODIFIED: 4,
  /* editable value has validation errors */
  STATE_INVALID: 5,

  /* Retrieve VIE Entity for subject */
  getVieEntity: function() {
    return this.get('entity');
  },
  /* isEditable: currently means: is it "possible" to activate or already active */
  isEditable: function() {
    // it is "editable", if it is STATE_CANDIDATE, STATE_HIGHLIGHT, STATE_ACTIVE, STATE_MODIFIED, STATE_INVALID
    // i.e. anything but inactive.
    return this.get('state') != this.STATE_INACTIVE;
  },
  /* isEditing: is active, modified or invalid */
  isEditing: function() {
    // it is "editing", if it is STATE_ACTIVE, STATE_MODIFIED, STATE_INVALID
    return this.get('state') >= this.STATE_ACTIVE;
  },
  /* Has modifications */
  hasModifications: function() {
    return this.get('state') == this.STATE_MODIFIED || this.get('state') == this.STATE_INVALID;
  }
});
