(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {
    /**
     * Enables the widget
     */
    enable: function () {
      Drupal.edit.log('Drupal.drupalFormWidget.enable');
      // As the form should be retrieved only when the editable gets *activated*
      // rather than enabled (i.e. candidate/highlighted state). We should
      // consider how to trigger it from the editable.
      var widget = this;
      var activator = function () {
        widget.activate();
        widget.element.unbind("click", activator);
      };
      this.element.bind("click", activator);
    },
    activate: function () {
      // Trigger "activating" state (i.e. loading the form).
      Drupal.edit.log('Drupal.drupalFormWidget.activating');
      this.options.activating();
      // Create the form asynchronously.
      var widget = this;
      Drupal.edit.form.create(this.element, function($editable, $field) {
        widget.options.activated();
        Drupal.edit.log('Drupal.drupalFormWidget.activated');
        Drupal.edit.form.get($editable)
          .delegate(':input', 'formUpdated.edit', function () {
            widget.options.changed();
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode == 13) {
              return false;
            }
          });

        $editable
          .addClass('edit-belowoverlay')
          .removeClass('edit-highlighted edit-editable');

        Drupal.edit.form.get($editable)
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editable.data('edit-background-color'));
      });
    },

    /**
     * Disables the widget.
     */
    disable: function () {
      Drupal.edit.log('Drupal.drupalFormWidget.disable');

      // @todo: handle this better on the basis of the editable type.
      // Currently we stuff forms into two places ...
      Drupal.edit.form.get(this.element).remove();

      // Revert the changes to classes applied in the the enable/loadForm
      // methods above.
      this.element
        .removeClass('edit-belowoverlay')
        .addClass('edit-highlighted edit-editable');

      Drupal.edit.form.get(this.element)
        .undelegate(':input', 'change.edit')
        .undelegate('input', 'keypress.edit');
    },

   /**
     * Initializes the widget functions.
     *
     * Override of Create.editWidget._initialize().
     */
    _initialize: function () {
    }
  });
})(jQuery);
