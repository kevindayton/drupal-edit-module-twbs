/**
 * @file
 * Form-based Create.js widget for structured content in Drupal.
 */
(function ($, Drupal) {

"use strict";

  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {

    id: null,
    $formContainer: null,

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
      // Sets the state to 'activating' upon clicking the element.
      var that = this;
      this.element.bind("click.edit", function(event) {
        event.stopPropagation();
        event.preventDefault();
        that.options.activating();
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
            this.disable();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          this.enable();
          break;
        case 'active':
          break;
        case 'changed':
          break;
        case 'saving':
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    },

    /**
     * Enables the widget.
     */
    enable: function () {
      var $editorElement = $(this.options.widget.element);
      var propertyID = Drupal.edit.util.calcPropertyID(this.options.entity, this.options.property);

      // Generate a DOM-compatible ID for the form container DOM element.
      this.id = 'edit-form-for-' + propertyID.replace(/\//g, '_');

      // Render form container.
      this.$formContainer = $(Drupal.theme('editFormContainer', {
        id: this.id,
        loadingMsg: Drupal.t('Loading…')}
      ));
      this.$formContainer
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editorElement.css('background-color'));

      // Insert form container in DOM.
      if ($editorElement.css('display') === 'inline') {
        // @todo: this is untested in Drupal 8, because in Drupal 8 we don't yet
        // have the ability to edit the node title/author/date, because they
        // haven't been converted into Entity Properties yet, and they're the
        // only examples in core of "display: inline" properties.
        this.$formContainer.prependTo($editorElement.offsetParent());

        var pos = $editorElement.position();
        this.$formContainer.css('left', pos.left).css('top', pos.top);
      }
      else {
        this.$formContainer.insertBefore($editorElement);
      }

      // Load form, insert it into the form container and attach event handlers.
      var widget = this;
      var formOptions = {
        propertyID: propertyID,
        $editorElement: $editorElement,
        nocssjs: false
      };
      Drupal.edit.util.form.load(formOptions, function(form, ajax) {
        Drupal.ajax.prototype.commands.insert(ajax, {
          data: form,
          selector: '#' + widget.id + ' .placeholder'
        });

        var $submit = widget.$formContainer.find('.edit-form-submit');
        Drupal.edit.util.form.ajaxifySaving(formOptions, $submit);
        widget.$formContainer
          .delegate(':input', 'formUpdated.edit', function () {
            // Sets the state to 'changed'.
            widget.options.changed();
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode === 13) {
              return false;
            }
          });

        // Sets the state to 'activated'.
        widget.options.activated();
      });
    },

    /**
     * Disables the widget.
     */
    disable: function () {
      if (this.$formContainer === null) {
        return;
      }

      Drupal.edit.util.form.unajaxifySaving(this.$formContainer.find('.edit-form-submit'));
      this.$formContainer
        .undelegate(':input', 'change.edit')
        .undelegate('input', 'keypress.edit')
        .remove();
      this.$formContainer = null;
    }
  });

})(jQuery, Drupal);
