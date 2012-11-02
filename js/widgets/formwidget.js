(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {
    options: {
      editorOptions: {},
      disabled: true
    },
    // @todo: add a callback to do this in an proper async fashion.
    enable: function () {
      console.log('Drupal.drupalFormWidget.enable');
      this.options.disabled = false;
      this.loadForm();
    },

    loadForm: function () {
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

    disable: function () {
      console.log('Drupal.drupalFormWidget.disable');
      this.options.disabled = true;
      // @todo: handle this better on the basis of the editable type.
      // Currently we stuff forms into two places ...
      Drupal.edit.form.get(this.element).remove();
      $('#edit_backstage form').remove();

      // Revert the changes to classes applied in the the enable/loadForm
      // methods above.
      this.element
        .removeClass('edit-belowoverlay')
        .addClass('edit-highlighted edit-editable');
    },

    _initialize: function () {
      var self = this;
      // @todo: this is *extremely* vague. self.options is declared at the top
      // of this file, but all of a sudden there apear to exist functions that
      // we haven't declared. It traces back to
      // jquery.Midgard.midgardEditable.js' _enableProperty(), and there
      // activated() sets even more things (e.g. options.model). It seems
      // "options" is doing too many things?
      $(this.element).bind('focus', function (event) {
        self.options.activated();
      });

      $(this.element).bind('blur', function (event) {
        self.options.deactivated();
      });
    }
  });
})(jQuery);
