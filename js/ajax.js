(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
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
});

})(jQuery);
