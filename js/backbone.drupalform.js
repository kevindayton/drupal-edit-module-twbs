Backbone.defaultSync = Backbone.sync;
Backbone.sync = function(method, model, options) {
  if (options.widgetType === 'drupalFormWidget') {
    return Backbone.syncDrupalFormWidget(method, model, options);
  }
  else {
    return Backbone.syncDirect(method, model, options);
  }

}


Backbone.syncDrupalFormWidget = function(method, model, options) {
  switch (method) {
    case 'update':
      var predicate = options.predicate;
      var edit_id = model.getSubjectUri() + '/' + predicate;
      var $field = Drupal.edit.util.findFieldForID(edit_id);
      var $editable = Drupal.edit.util.findEditablesForFields($field);

      // Figure out the submit button for this form.
      var $submit = Drupal.edit.form.get($editable).find('.edit-form-submit');
      var base = $submit.attr('id');

      // handle the saveForm callback (edit_field_form_saved).
      var formEditableFormSubmittedCallback = function (ajax, response, status) {
        var edit_id = model.getSubjectUri() + '/' + predicate;
        // response.data contains the updated rendering of the field, if any.
        if (response.data) {
          // Stop the editing.
          var currentEditorView = Drupal.edit.state.get('editedFieldView');
          if (currentEditorView) {
            // @todo: trigger event on the currentEditorView.
            currentEditorView.disableEditor();
          }
          // this is different from edit.module. did not understand what the
          // stuff was about.
          var $inner = jQuery(response.data).html();
          $editable.html($inner);
        }
        // Remove this Drupal.ajax[base]?
        delete Drupal.ajax[base];
        options.success();
      };
      // Setup of a closure to handle the response at last minute.
      Drupal.ajax[base].commands.edit_field_form_saved = formEditableFormSubmittedCallback;
      $submit.trigger('click.edit');
      break;
  };
}


Backbone.syncDirect = function(method, model, options) {
  switch (method) {
    case 'update':
      var predicate = options.predicate;
      var edit_id = model.getSubjectUri() + '/' + predicate;
      var $field = Drupal.edit.util.findFieldForID(edit_id);
      var $editable = Drupal.edit.util.findEditablesForFields($field);

      var value = model.get(predicate);

      var submitDirectForm = function (value) {
      var $submit = jQuery('#edit_backstage form .edit-form-submit');
      var base = $submit.attr('id');

      // Shove the value into any field that isn't hidden or a submit button.
      jQuery('#edit_backstage form').find(':input[type!="hidden"][type!="submit"]').val(value);
      Drupal.edit.log('submitDirectForm', $submit, base, jQuery('#edit_backstage form'));
      // Set the callback.
      Drupal.ajax[base].commands.edit_field_form_saved = function (ajax, response, status) {
        // Direct forms are stuffed into #edit_backstage, apparently.
        // that's why Drupal.edit.form.remove($editable); doesn't work.
        jQuery('#edit_backstage form').remove();
        // Removing Drupal.ajax-thingy.
        delete Drupal.ajax[base];
        // @note: title currently returns success but no response.data.
        // Stop the editing.
        var currentEditorView = Drupal.edit.state.get('editedFieldView');
        if (currentEditorView) {
          // @todo: trigger event on the currentEditorView.
          currentEditorView.disableEditor();
        }
        // First argument is TRUE if response.data was returned.
        /* callback(!!response.data, $editable);*/

        options.success();
      };
      $submit.trigger('click.edit');
    };

    // If form doesn't already exist, create it and then submit.
    if (Drupal.edit.form.get($editable).length === 0) {
      Drupal.edit.form.create($editable, function ($editable, $field) {
        // Submit the value.
        submitDirectForm(value);
      });
    } else {
      // Submit the value.
      submitDirectForm(value);
    }
  }
}
