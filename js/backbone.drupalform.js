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

      // Set up AJAX command closures.
      Drupal.ajax[base].commands.edit_field_form_saved = function(ajax, response, status) {
        // Clean up; the form has saved (there is no rebuilding going on), so we
        // can get rid of this Drupal.ajax instance.
        delete Drupal.ajax[base];

        // Call Backbone.sync's success callback with the rerendered field.
        var changedAttributes = {};
        changedAttributes[predicate] = '@todo: JSON-LD representation N/A yet.';
        changedAttributes[predicate + '/rendered'] = response.data;
        options.success(changedAttributes);
      };

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
