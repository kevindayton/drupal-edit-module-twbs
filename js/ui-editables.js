(function($) {

/**
 * @file ui-editables.js
 *
 * UI components for editables: form.
 */

Drupal.edit = Drupal.edit || {};

Drupal.edit.form = {
  create: function($editable, cb) {
    // @todo: this needs to be refactored, we should have access to the view
    // rather than the $editable/$el of the view.
    var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject($editable));
    var predicate = Drupal.edit.util.getElementPredicate($editable);
    var $field = Drupal.edit.util.findFieldForEditable($editable);
    var fieldView = Drupal.edit.state.get('editedFieldView');
    var edit_id = Drupal.edit.util.getID($field);
    // We only create a placeholder-div/form for the form-based instances.
    if (Drupal.edit.form.get($editable).length > 0) {
      return false;
    }

    // Show a loading form indicator
    fieldView.showLoadingFormIndicator();

    // TRICKY: for type=direct fields, this gets called when SAVING (load form,
    //fill it, submit it), instead of LOADING.
    var onLoadCallback = function(status, form, ajax) {
      // @todo: re-factor
      var $submit;
      if ($field.hasClass('edit-type-form')) {
        var formWrapperId = Drupal.edit.form._id($editable);
        Drupal.ajax.prototype.commands.insert(ajax, {
          data: form,
          selector: (Drupal.edit.state.get('formLoadedFor') == edit_id)
            ? '#' + formWrapperId + ' form'
            : '#' + formWrapperId + ' .placeholder'
        });
        Drupal.edit.state.set('formLoadedFor', edit_id);

        $submit = Drupal.edit.form.get($editable).find('.edit-form-submit');
      }
      else {
        // Direct forms are stuffed into #edit_backstage, apparently.
        $('#edit_backstage').append(form);
        $submit = $('#edit_backstage form .edit-form-submit');
      }
      Drupal.edit.form._setupAjaxForm($editable, $field, $submit);

      // Trigger that the form has loaded.
      $editable.trigger('edit-form-loaded.edit');

      // callback to be able to decorate / continue with the editable...
      cb($editable, $field);
    };

    this.loadForm(entity, predicate, onLoadCallback);
  },
  // @todo: complete refactoring.
  _setupAjaxForm: function($editable, $field, $submit) {
    // Re-wire the form to handle submit.
    var element_settings = {
      url: $submit.closest('form').attr('action'),
      setClick: true,
      event: 'click.edit',
      progress: {type:'throbber'},
      // IPE-specific settings.
      $editable: $editable,
      $field: $field,
      submit: { nocssjs : ($field.hasClass('edit-type-direct')) }
    };
    var base = $submit.attr('id');
    // Removing existing Drupal.ajax-thingy.
    if (Drupal.ajax.hasOwnProperty(base)) {
      delete Drupal.ajax[base];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);
  },
  get: function($editable) {
    return ($editable.length === 0)
      ? $([])
      : $('#' + this._id($editable));
  },

  remove: function($editable) {
    Drupal.edit.log('Drupal.edit.form.remove', Drupal.edit.form.get($editable));
    Drupal.edit.form.get($editable).remove();
  },

  _id: function($editable) {
    var edit_id = Drupal.edit.util.getID($editable);
    return 'edit-form-for-' + edit_id.split(':').join('_');
  },

  /**
   * Loads a drupal form for a given vieEntity
   *
   * @todo: we need to use this for non-form-based FieldView-instances as well.
   * @todo: error handling etc.
   *
   * @param vieEntity object vieEntity
   * @param predicate string predicate ("field name")
   * @param callback callback callback once form is loaded callback(status, $form)
   */
  loadForm: function (vieEntity, predicate, callback) {
    var edit_id = vieEntity.getSubjectUri() + '/' + predicate;
    var $field = Drupal.edit.util.findFieldForID(edit_id);
    var $editable = Drupal.edit.util.findEditablesForFields($field);
    var element_settings = {
      url      : Drupal.edit.util.calcFormURLForField(edit_id),
      event    : 'edit-internal.edit',
      $field   : $field,
      $editable: $editable,
      submit   : { nocssjs : ($field.hasClass('edit-type-direct')) },
      progress : { type : null } // No progress indicator.
    };
    // Removing existing Drupal.ajax-thingy.
    if (Drupal.ajax.hasOwnProperty(edit_id)) {
      delete Drupal.ajax[edit_id];
      $editable.unbind('edit-internal.edit');
    }
    Drupal.ajax[edit_id] = new Drupal.ajax(edit_id, $editable, element_settings);
    // Some form of closure.
    Drupal.ajax[edit_id].commands.edit_field_form = function(ajax, response, status) {
      // @todo only call the callback if response.id matches edit_id. If that's
      // not the case, we're preloading forms.
      callback(status, response.data, ajax);
    };
    $editable.trigger('edit-internal.edit');
  },
  /**
   * Saves (trigger submit) a edit.module form that has been loaded via
   * Drupal.edit.form.loadForm method. Replaces the old editable with the
   * response.
   *
   * @todo: validation handling.
   *
   * @param vieEntity object vieEntity
   * @param predicate string  predicate ("field name")
   * @param $editable object  editable object
   * @param value object? form value - ignored in form-based
   * @param callback  callback after form has been submitted cb(error, $el);
   */
  saveForm: function (vieEntity, predicate, $editable, value, callback) {
    var edit_id = vieEntity.getSubjectUri() + '/' + predicate;
    var $field = Drupal.edit.util.findFieldForID(edit_id);
    // Handle form FormEditableFieldView
    if ($field.hasClass('edit-type-form')) {
      // Figure out the submit button for this form.
      var $submit = Drupal.edit.form.get($editable).find('.edit-form-submit');
      var base = $submit.attr('id');

      // handle the saveForm callback (edit_field_form_saved).
      var formEditableFormSubmittedCallback = function(ajax, response, status) {
        var edit_id = vieEntity.getSubjectUri() + '/' + predicate;
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
          var $inner = $(response.data).html();
          $editable.html($inner);
        }
        // Remove this Drupal.ajax[base]?
        delete Drupal.ajax[base];
        callback(null, $editable);
      };
      // Setup of a closure to handle the response at last minute.
      Drupal.ajax[base].commands.edit_field_form_saved = formEditableFormSubmittedCallback;
      $submit.trigger('click.edit');
    } else {
      // EditableFieldView (direct or wysiwyg).

      var submitDirectForm = function(value) {
        var $submit = $('#edit_backstage form .edit-form-submit');
        var base = $submit.attr('id');

        // Shove the value into any field that isn't hidden or a submit button.
        $('#edit_backstage form').find(':input[type!="hidden"][type!="submit"]').val(value);
        Drupal.edit.log('submitDirectForm', $submit, base, $('#edit_backstage form'));
        // Set the callback.
        Drupal.ajax[base].commands.edit_field_form_saved = function(ajax, response, status) {
          // Direct forms are stuffed into #edit_backstage, apparently.
          // that's why Drupal.edit.form.remove($editable); doesn't work.
          $('#edit_backstage form').remove();
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
          callback(!!response.data, $editable);
        };
        $submit.trigger('click.edit');
      };

      // If form doesn't already exist, create it and then submit.
      if (Drupal.edit.form.get($editable).length === 0) {
        Drupal.edit.form.create($editable, function($editable, $field) {
          // Submit the value.
          submitDirectForm(value);
        });
      } else {
        // Submit the value.
        submitDirectForm(value);
      }
    }
  }
};

})(jQuery);
