(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {

    $formContainer: null,

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: get rid of this once https://github.com/bergie/create/issues/142
     * is solved.
     */
    _init: function() {
      // Sets the state to 'activating'.
      this.element.bind("click", this.options.activating);
    },

    /**
     * Implements Create's _initialize() method.
     */
    _initialize: function() {
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
      var propertyID = this.options.entity.getSubjectUri() + '/' + this.options.property;
      var formContainerID = this._formContainerID(propertyID);

      // Render form container.
      this.$formContainer = jQuery(Drupal.theme('editFormContainer', {
        id: formContainerID,
        loadingMsg: Drupal.t('Loading…')}
      ));
      this.$formContainer
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editorElement.css('background-color'));

      // Insert form container in DOM.
      if ($editorElement.css('display') == 'inline') {
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
          selector: '#' + formContainerID + ' .placeholder'
        });

        var $submit = widget.$formContainer.find('.edit-form-submit');
        Drupal.edit.util.form.ajaxifySaving(formOptions, $submit);
        widget.$formContainer
          .delegate(':input', 'formUpdated.edit', function () {
            // Sets the state to 'changed'.
            widget.options.changed();
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode == 13) {
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
    },

    /**
     * Generates a unique form container ID based on a property ID.
     *
     * @param string propertyID
     *   A property ID.
     */
    _formContainerID: function(propertyID) {
      return 'edit-form-for-' + propertyID.split('/').join('_');
    }
  });
})(jQuery);
