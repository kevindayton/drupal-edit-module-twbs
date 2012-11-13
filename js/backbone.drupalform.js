Backbone.defaultSync = Backbone.sync;
Backbone.sync = function(method, model, options) {
  if (options.editorWidgetName === 'drupalFormWidget') {
    return Backbone.syncDrupalFormWidget(method, model, options);
  }
  else {
    return Backbone.syncDirect(method, model, options);
  }
};

/**
 * Performs syncing for drupalFormWidget PredicateEditor widgets.
 *
 * Implemented on top of Form API and the AJAX commands framework. Sets up
 * scoped AJAX command closures specifically for a given PredicateEditor widget
 * (which contains a pre-existing form). By submitting the form through
 * Drupal.ajax and leveraging Drupal.ajax' ability to have scoped (per-intance)
 * command implementations, we are able to update the VIE model, re-render the
 * form when there are validation errors and ensure no Drupal.ajax memory leaks.
 *
 * @see Drupal.edit.form.
 *
 * @todo: HTTP status handling.
 */
Backbone.syncDrupalFormWidget = function(method, model, options) {
  if (method === 'update') {
    var predicate = options.predicate;

    var $formContainer = options.editorSpecific.$formContainer;
    var $submit = $formContainer.find('.edit-form-submit');
    var base = $submit.attr('id');

    // Successfully saved.
    Drupal.ajax[base].commands.edit_field_form_saved = function(ajax, response, status) {
      // Get rid of the Drupal.ajax instance that saved the form.
      delete Drupal.ajax[ajax.selector.substring(1)];
      jQuery(ajax.element).unbind(ajax.event);

      // Call Backbone.sync's success callback with the rerendered field.
      var changedAttributes = {};
      changedAttributes[predicate] = '@todo: JSON-LD representation N/A yet.';
      changedAttributes[predicate + '/rendered'] = response.data;
      options.success(changedAttributes);
    };

    // Unsuccessfully saved; validation errors.
    Drupal.ajax[base].commands.edit_field_form_validation_errors = function(ajax, response, status) {
      // Call Backbone.sync's error callback with the validation error messages.
      options.error(response.data);
    };

    // The edit_field_form AJAX command is only called upon loading the form for
    // the first time, and when there are validation errors in the form; Form
    // API then marks which form items have errors. Therefor, we have to replace
    // the existing form, unbind the existing Drupal.ajax instance and create a
    // new Drupal.ajax instance.
    Drupal.ajax[base].commands.edit_field_form = function(ajax, response, status) {
      Drupal.ajax.prototype.commands.insert(ajax, {
        data: response.data,
        selector: '#' + $formContainer.attr('id') + ' form'
      });

      // Create a Drupa.ajax instance for the re-rendered ("new") form.
      var $newSubmit = $formContainer.find('.edit-form-submit');
      Drupal.edit.form._setupAjaxForm(ajax.$editable, ajax.$field, $newSubmit);

      // Get rid of the Drupal.ajax instance that saved the form.
      // No need to unbind; the DOM element on which an event was bound was
      // deleted by the above AJAX insert command.
      delete Drupal.ajax[ajax.selector.substring(1)];
    };

    // Click the form's submit button; the scoped AJAX commands above will
    // handle the server's response.
    $submit.trigger('click.edit');
  }
};

/**
 * @todo: HTTP status handling.
 */
Backbone.syncDirect = function(method, model, options) {
  if (method === 'update') {
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
};
