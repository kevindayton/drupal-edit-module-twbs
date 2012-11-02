(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {
    /**
     * Enables the widget
     */
    enable: function () {
      Drupal.edit.log('Drupal.drupalFormWidget.enable');
      // Create the form asynchronously.
      // @todo: use a different "factory" depending on editable type.
      Drupal.edit.form.create(this.element, function($editable, $field) {
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
    },

   /**
     * Initializes the widget functions.
     *
     * Override of Create.editWidget._initialize().
     */
    _initialize: function () {
      var self = this;

      // NOTE: It's extremely vague that we're calling functions on self.options
      // (which is owned by jQuery.widget, FWIW). It's merely an unfortunate
      // location for that code and will be fixed upstream in Create.js.

      $(this.element).bind('drupalFormLoaded', function (event) {
         self.options.activated();
      });

      $(this.element).bind('drupalFormUnloaded', function (event) {
        self.options.deactivated();
      });

      $(this.element).bind('drupalFormModified', function (event) {
        // @todo: Since the changes live in a form, and we cannot derive a
        // meaningful string representation of the Field (predicate), pass in
        // null.
        // Note that modified() will actually propagate this change to the model
        // and it will trigger a 'changed' event on the widget. We don't care
        // about the model because it's impossible to map from the model to this
        // form or vice versa; all we care about is that the 'changed' event
        // gets triggered.
        self.options.modified(null);
      });
    }
  });
})(jQuery);
