(function($) {

/**
 * @file ajax.js
 *
 * AJAX commands for Edit module.
 */

// Hide these in a ready to ensure that Drupal.ajax is set up first.
$(function() {
  Drupal.ajax.prototype.commands.edit_field_form = function(ajax, response, status) {
    console.log('edit_field_form', ajax, response, status);

    // Only apply the form immediately if this form is currently being edited.
    if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-form')) {
      Drupal.ajax.prototype.commands.insert(ajax, {
        data: response.data,
        selector: (Drupal.edit.state.formLoadedFor == response.id)
         ? '.edit-form-container form' // Allow rebuilding forms to work.
         : '.edit-form-container .placeholder'
      });
      Drupal.edit.state.formLoadedFor = response.id;

      // Indicate in the 'info' toolgroup that the form has loaded, but only do
      // it after half a second to prevent it from flashing, which is bad UX.
      setTimeout(function() {
        Drupal.edit.toolbar.removeClass(ajax.$editable, 'info', 'loading');
      }, 500);

      // Detect changes in this form.
      Drupal.edit.form.get(ajax.$editable)
      .delegate(':input', 'formUpdated.edit', function() {
        ajax.$editable
        .data('edit-content-changed', true)
        .trigger('edit-content-changed.edit');
      })
      .delegate('input', 'keypress.edit', function(event) {
        if (event.keyCode == 13) {
          return false;
        }
      });

      var $submit = Drupal.edit.form.get(ajax.$editable).find('.edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);

      // Give focus to the first input in the form.
      //$('.edit-form').find('form :input:visible:enabled:first').focus()
    }
    else if (Drupal.edit.state.editedEditable == response.id && ajax.$field.hasClass('edit-type-direct')) {
      // Currently only allow a single form to live in the backstage.
      // @todo: fix this mess.
      if (Drupal.edit.state.formLoadedFor == response.id) {
        var existingFormId = $('#edit_backstage form .edit-form-submit').attr('id');
        if (typeof existingFormId !== 'undefined' && Drupal.ajax.hasOwnProperty(existingFormId)) {
          delete Drupal.ajax[existingFormId];
        }
        $('#edit_backstage form').remove();
      }

      $('#edit_backstage').append(response.data);
      Drupal.edit.state.formLoadedFor = response.id;

      var $submit = $('#edit_backstage form .edit-form-submit');
      var element_settings = {
        url : $submit.closest('form').attr('action'),
        setClick : true,
        event : 'click.edit',
        progress : { type : 'throbber' },
        // IPE-specific settings.
        $editable : ajax.$editable,
        $field : ajax.$field
      };
      var base = $submit.attr('id');
      Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);
    }
    else {
      console.log('queueing', response);
    }

    // Animations.
    Drupal.edit.toolbar.show(ajax.$editable, 'ops');
    ajax.$editable.trigger('edit-form-loaded.edit');
  };
  Drupal.ajax.prototype.commands.edit_field_rendered_without_transformation_filters = function(ajax, response, status) {
    console.log('edit_field_rendered_without_transformation_filters', ajax, response, status);

    if (Drupal.edit.state.editedEditable == response.id
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
      Drupal.edit.editables._wysiwygify(ajax.$editable);
    }
  };
  Drupal.ajax.prototype.commands.edit_field_form_saved = function(ajax, response, status) {
    console.log('edit_field_form_saved', ajax, response, status);

    // Clean up Drupal.ajax.
    var form_submit_id = '#' + ajax.selector;
    if (Drupal.ajax.hasOwnProperty(form_submit_id)) {
      delete Drupal.ajax[form_submit_id];
    }

    // Stop the editing.
    Drupal.edit.editables.stopEdit(ajax.$editable);

    // Response.data contains the updated rendering of the field, if any.
    if (response.data) {
      // Replace the old content with the new content.
      var $field = $('.edit-field[data-edit-id="' + response.id  + '"]');
      var $parent = $field.parent();
      if ($field.css('display') == 'inline') {
        $parent.html(response.data);
      }
      else {
        $field.replaceWith(response.data);
      }

      // Make the freshly rendered field(s) in-place-editable again.
      Drupal.edit.startEditableFields(Drupal.edit.findEditableFields($parent));
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
