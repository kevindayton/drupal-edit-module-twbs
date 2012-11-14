(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};

Drupal.edit.util.constants = {};
Drupal.edit.util.constants.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

// Temporary helper function: logging.
Drupal.edit.debug = false;
Drupal.edit.util.log = function() {
  if (Drupal.edit.debug && window.console) {
    console.log(Array.prototype.slice.call(arguments));
  }
};

Drupal.edit.util.calcPropertyID = function(entity, predicate) {
  return entity.getSubjectUri() + '/' + predicate;
};

Drupal.edit.util.calcFormURLForField = function(id) {
  var parts = id.split('/');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.fieldFormURL);
  return Drupal.formatString(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2],
    '!langcode'   : parts[3],
    '!view_mode'  : parts[4]
  });

};

Drupal.edit.util.calcRerenderProcessedTextURL = function(id) {
  var parts = id.split('/');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.rerenderProcessedTextURL);
  return Drupal.formatString(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2],
    '!langcode'   : parts[3],
    '!view_mode'  : parts[4]
  });
};

/**
 * Ignore hovering to/from the given closest element, but as soon as a hover
 * occurs to/from *another* element, then call the given callback.
 */
Drupal.edit.util.ignoreHoveringVia = function(e, closest, callback) {
  if ($(e.relatedTarget).closest(closest).length > 0) {
    e.stopPropagation();
  }
  else {
    callback();
  }
};

Drupal.edit.util.form = {
  /**
   * Loads a form, calls a callback to inserts.
   *
   * Leverages Drupal.ajax' ability to have scoped (per-instance) command
   * implementations to be able to call a callback.
   *
   * @param options
   *   An object with the following keys:
   *    - $editorElement (required): the PredicateEditor DOM element.
   *    - propertyID (required): the property ID that uniquely identifies the
   *      property for which this form will be loaded.
   *    - nocssjs (required): boolean indicating whether no CSS and JS should be
   *      returned (necessary when the form is invisible to the user).
   * @param callback
   *   A callback function that will receive the form to be inserted, as well as
   *   the ajax object, necessary if the callback wants to perform other AJAX
   *   commands.
   */
  load: function(options, callback) {
    // Create a Drupal.ajax instance to load the form.
    Drupal.ajax[options.propertyID] = new Drupal.ajax(options.propertyID, options.$editorElement, {
      url: Drupal.edit.util.calcFormURLForField(options.propertyID),
      event: 'edit-internal.edit',
      submit: { nocssjs : options.nocssjs },
      progress: { type : null } // No progress indicator.
    });
    // Implement a scoped edit_field_form AJAX command: calls the callback.
    Drupal.ajax[options.propertyID].commands.edit_field_form = function(ajax, response, status) {
      callback(response.data, ajax);
      // Delete the Drupal.ajax instance that called this very function.
      delete Drupal.ajax[options.propertyID];
      options.$editorElement.unbind('edit-internal.edit');
    };
    // This will ensure our scoped edit_field_form AJAX command gets called.
    options.$editorElement.trigger('edit-internal.edit');
  },

  /**
   * Creates a Drupal.ajax instance that is used to save a form.
   *
   * @param options
   *   An object with the following keys:
   *    - nocssjs (required): boolean indicating whether no CSS and JS should be
   *      returned (necessary when the form is invisible to the user).
   *
   * @return
   *   The key of the Drupal.ajax instance.
   */
  ajaxifySaving: function(options, $submit) {
    // Re-wire the form to handle submit.
    var element_settings = {
      url: $submit.closest('form').attr('action'),
      setClick: true,
      event: 'click.edit',
      progress: { type:'throbber' },
      submit: { nocssjs : options.nocssjs }
    };
    var base = $submit.attr('id');

    Drupal.ajax[base] = new Drupal.ajax(base, $submit[0], element_settings);

    return base;
  },

  /**
   * Cleans up the Drupal.ajax instance that is used to save the form.
   *
   * @param $submit
   *   The jQuery-wrapped submit DOM element that should be unajaxified.
   */
  unajaxifySaving: function($submit) {
    delete Drupal.ajax[$submit.attr('id')];
    $submit.unbind('click.edit');
  }
};

})(jQuery);
