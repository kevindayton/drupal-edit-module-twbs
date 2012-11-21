/**
 * @file
 * Override of Create.js' default Aloha Editor widget.
 *
 * NOTE: This does in fact use zero code of jQuery.create.alohaWidget.
 */
(function (jQuery, Drupal) {

"use strict";

  jQuery.widget('Drupal.drupalAlohaWidget', jQuery.Create.alohaWidget, {

    // @todo: actually use this when restoring original content, but for that we
    // first need to know how to restore content in a Create.js context
    originalTransformedContent: null,

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
      this._bindEvents();

      // Immediately initialize Aloha, this can take some time. By doing it now
      // already, it will most likely already be ready when the user actually
      // wants to use Aloha Editor.
      Drupal.aloha.init();
    },

    /**
     * Binds to events.
     *
     * @todo: get rid of this helper function and move it into _initialize()
     * once https://github.com/alohaeditor/Aloha-Editor/issues/693 is solved.
     */
    _bindEvents: function() {
      var that = this;

      // Sets the state to 'activated' upon clicking the element.
      this.element.bind("click.edit", function(event) {
        event.stopPropagation();
        event.preventDefault();
        that.options.activating();
      });

      // Sets the state to 'changed' whenever the content has changed.
      this.element.bind('aloha-content-changed', function(event, $alohaEditable, data) {
        if (!data.editable.isModified()) {
          return true;
        }
        that.options.changed(data.editable.getContents());
        data.editable.setUnmodified();
      });
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
            Drupal.aloha.detach(this.element);
            this._removeValidationErrors();
            this._cleanUp();

            // TRICKY: work-around for major AE bug. See:
            //  - http://drupal.org/node/1725032
            //  - https://github.com/alohaeditor/Aloha-Editor/issues/693.
            // @todo: get rid of this once https://github.com/alohaeditor/Aloha-Editor/issues/693 is solved.
            this._bindEvents();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          // When transformation filters have been been applied to the processed
          // text of this field, then we'll need to load a re-rendered version of
          // it without the transformation filters.
          if (this.options.widget.element.hasClass('edit-text-with-transformation-filters')) {
            this.originalTransformedContent = this.element.html();

            var that = this;
            Drupal.edit.util.loadRerenderedProcessedText({
              $editorElement: this.element,
              propertyID: Drupal.edit.util.calcPropertyID(this.options.entity, this.options.property),
              callback: function (rerendered) {
                that.element.html(rerendered);
                that.options.activated();
              }
            });
          }
          // When no transformation filters have been applied: start WYSIWYG
          // editing immediately!
          else {
            this.options.activated();
          }
          break;
        case 'active':
          // Attach Aloha Editor with this field's text format.
          var formatID = this.options.widget.element.attr('data-edit-text-format');
          var format = Drupal.settings.aloha.formats[formatID];
          Drupal.aloha.attach(this.element, format);
          Drupal.aloha.activate(this.element, format);
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

})(jQuery, Drupal);
