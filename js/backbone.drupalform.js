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
 * Performs syncing for drupalFormWidget (type=form) PredicateEditor widgets.
 *
 * Implemented on top of Form API and the AJAX commands framework. Sets up
 * scoped AJAX command closures specifically for a given PredicateEditor widget
 * (which contains a pre-existing form). By submitting the form through
 * Drupal.ajax and leveraging Drupal.ajax' ability to have scoped (per-intance)
 * command implementations, we are able to update the VIE model, re-render the
 * form when there are validation errors and ensure no Drupal.ajax memory leaks.
 *
 * @see Drupal.edit.form()
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
* Performs syncing for type=direct PredicateEditor widgets.
 *
 * @see Backbone.syncDrupalFormWidget()
 * @see Drupal.edit.form()
 *
 * @todo: HTTP status handling.
 */
Backbone.syncDirect = function(method, model, options) {
  if (method === 'update') {
    var fillAndSubmitForm = function(value) {
      jQuery('#edit_backstage form')
        // Fill in the value in any <input> that isn't hidden or a submit button.
        .find(':input[type!="hidden"][type!="submit"]').val(value).end()
        // Submit the form.
        .find('.edit-form-submit').trigger('click.edit');
    };
    var value = model.get(options.predicate);

    // If form doesn't already exist, create it and then submit.
    if (jQuery('#edit_backstage form').length === 0) {
      Drupal.edit.form.create(options.editorSpecific.$editorElement, function ($editable) {
        var base = jQuery('#edit_backstage form .edit-form-submit').attr('id');

        // Successfully saved.
        Drupal.ajax[base].commands.edit_field_form_saved = function (ajax, response, status) {
          // Get rid of the Drupal.ajax instance that saved the form, and of the
          // form itself.
          delete Drupal.ajax[base];
          jQuery('#edit_backstage form').remove();

          options.success();
        };

        // Unsuccessfully saved; validation errors.
        Drupal.ajax[base].commands.edit_field_form_validation_errors = function(ajax, response, status) {
          // Call Backbone.sync's error callback with the validation error messages.
          options.error(response.data);
        };

        // The edit_field_form AJAX command is only called upon loading the form
        // for the first time, and when there are validation errors in the form;
        // Form API then marks which form items have errors. This is useful for
        // type=form, but pointless for type=direct: the form itself won't be
        // visible at all anyway! Therefor, we ignore the new form and we
        // continue to use the existing form.
        Drupal.ajax[base].commands.edit_field_form = function(ajax, response, status) {
          // no-op
        };

        fillAndSubmitForm(value);
      });
    }
    else {
      fillAndSubmitForm(value);
    }
  }
};
