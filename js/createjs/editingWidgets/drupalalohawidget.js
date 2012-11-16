/**
 * @file drupalalohawidget.js
 *
 * Override of Create.js' default Aloha Editor widget.
 */

(function (jQuery, undefined) {
  jQuery.widget('Drupal.drupalAlohaWidget', jQuery.Create.alohaWidget, {

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: get rid of this once https://github.com/bergie/create/issues/142
     * is solved.
     */
    _init: function() {},

    /**
     * Implements Create's _initialize() method.
     */
    _initialize: function() {
      var that = this;

      // Sets the state to 'activated' upon clicking the element.
      this.element.bind("click.edit", function(event) {
        event.stopPropagation();
        event.preventDefault();
        that.options.activated();
      });

      // Immediately initialize Aloha, this can take some time. By doing it now
      // already, it will most likely already be ready when the user actually
      // wants to use Aloha Editor.
      Drupal.aloha.init();
    },

    /**
     * Makes this PropertyEditor widget react to state changes.
     *
     * @todo revisit this once https://github.com/bergie/create/issues/133 is
     * solved.
     */
    stateChange: function(from, to) {
      switch (to) {
        case 'inactive':
          break;
        case 'candidate':
          if (from !== 'inactive') {
            this.disable();
            this._removeValidationErrors();
            this._cleanUp();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          break;
        case 'active':
          this.enable();
          break;
        case 'changed':
          break;
        case 'saving':
          this._removeValidationErrors();
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    },

    /**
     * Removes validation errors' markup changes, if any.
     *
     * Note: this only needs to happen for type=direct, because for type=direct,
     * the property DOM element itself is modified; this is not the case for
     * type=form.
     */
    _removeValidationErrors: function() {
      this.element
        .removeClass('edit-validation-error')
        .next('.edit-validation-errors').remove();
    },

    /**
     * Cleans up after the widget has been saved.
     *
     * Note: this is where the Create.Storage and accompanying Backbone.sync
     * abstractions "leak" implementation details. That is only the case because
     * we have to use Drupal's Form API as a transport mechanism. It is
     * unfortunately a stateful transport mechanism, and that's why we have to
     * clean it up here. This clean-up is only necessary when canceling the
     * editing of a property after having attempted to save at least once.
     */
    _cleanUp: function() {
      Drupal.edit.util.form.unajaxifySaving(jQuery('#edit_backstage form .edit-form-submit'));
      jQuery('#edit_backstage form').remove();
    }
  });
})(jQuery);
