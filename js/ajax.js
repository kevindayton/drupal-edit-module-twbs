(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
  // these function should never be called as they are overridden by setting the
  // respective Drupal.ajax[{base}].commands.edit_field_form|_saved methods in
  // create/loadForm/saveForm  in ui-editables.
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {};
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {};
  // @todo: refactor this in a similar fashion & figure out where this is
  // needed - probably direct editables.
  // NOTE FROM WIM: this is needed when doing type=direct-with-wysiwyg editing,
  // but only when the processed text already present in the DOM was processed
  // *with* transformation filters. I.e.: it depends on the text format.
  Drupal.ajax.prototype.commands.edit_field_rendered_without_transformation_filters = function(ajax, response, status) {
    console.log('edit_field_rendered_without_transformation_filters', ajax, response, status);
    if (Drupal.edit.state.get('editedEditable') == response.id
        && ajax.$field.hasClass('edit-type-direct')
        && ajax.$field.hasClass('edit-text-with-transformation-filters')
        )
    {
      // Indicate in the 'info' toolgroup that the form has loaded, but only do
      // it after half a second to prevent it from flashing, which is bad UX.
      setTimeout(function() {
        Drupal.edit.toolbar.removeClass(ajax.$editable, 'info', 'loading');
      }, 500);

      // Update the HTML of the editable and enable WYSIWYG editing on it.
      ajax.$editable.html(response.data);
      // @todo: this object doesn't exist anymore.
      Drupal.edit.editables._wysiwygify(ajax.$editable);
    }
  };
  Drupal.ajax.prototype.commands.edit_field_form_validation_errors = function(ajax, response, status) {
    console.log('edit_field_form_validation_errors', ajax, response, status);

    if (response.data) {
      var $field = $('.edit-field[data-edit-id="' + response.id  + '"]');
      if ($field.hasClass('edit-type-form')) {
        Drupal.edit.form.get($field)
          .find('.edit-form')
          .addClass('edit-validation-error')
          .find('form')
          .prepend(response.data);
      }
      else {
        var $editable = Drupal.edit.findEditablesForFields($field);

        if ($field.hasClass('edit-type-direct-with-wysiwyg')) {
          Drupal.edit.editables._wysiwygify($editable);
        }

        var $errors = $('<div class="edit-validation-errors"></div>')
          .append(response.data);
        $editable
          .addClass('edit-validation-error')
          .after($errors);
      }
    }
  };
});

})(jQuery);
