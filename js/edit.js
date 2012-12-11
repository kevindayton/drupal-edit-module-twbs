/**
 * @file
 * Behaviors for Edit, including the one that initializes Edit's EditAppView.
 */
(function ($, _, Backbone, Drupal, drupalSettings) {

"use strict";

/**
 * The edit ARIA live message area.
 *
 * @todo Eventually the messages area should be converted into a Backbone View
 * that will respond to changes in the application's model. For the initial
 * implementation, we will call the Drupal.edit.setMessage method when an aural
 * message should be read by the user agent.
 */
var $messages;

Drupal.edit = Drupal.edit || {};
Drupal.edit.accessCache = Drupal.edit.accessCache || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    var $context = $(context);
    var $fields = $context.find('.edit-field');

    // Initialize the Edit app.
    $context.find('#toolbar-tab-edit').once('edit-init', Drupal.edit.init);

    var annotateFieldAccess = function(field) {
      if (_.has(Drupal.edit.accessCache, field.editID)) {
        var access = Drupal.edit.accessCache[field.editID];
        field.$el.addClass((access) ? 'edit-allowed' : 'edit-disallowed');
        return true;
      }
      return false;
    };

    // Find all fields in the context without access metadata.
    var fieldsToAnnotate = _.map($fields.not('.edit-allowed, .edit-disallowed'), function(el) {
      var $el = $(el);
      return { $el: $el, editID: $el.attr('data-edit-id') };
    });

    // Fields whose access is known (typically when they were just modified) can
    // be annotated immediately, those remaining must be checked on the server.
    var remainingFieldsToAnnotate = _.reduce(fieldsToAnnotate, function(result, field) {
      if (!annotateFieldAccess(field)) {
        result.push(field);
      }
      return result;
    }, []);

    // Make fields that could be annotated immediately available for editing.
    Drupal.edit.app.findEditableProperties($context);

    if (remainingFieldsToAnnotate.length) {
      $(function() {
        $.ajax({
          url: drupalSettings.edit.accessURL,
          type: 'POST',
          data: { 'fields[]' : _.pluck(remainingFieldsToAnnotate, 'editID') },
          dataType: 'json',
          success: function(results) {
            // Update the access cache.
            _.each(results, function(access, editID) {
              Drupal.edit.accessCache[editID] = access;
            });

            // Annotate the remaining fields based on the updated access cache.
            _.each(remainingFieldsToAnnotate, annotateFieldAccess);

            // As soon as there is at least one editable field, show the Edit
            // tab in the toolbar.
            if ($fields.filter('.edit-allowed').length) {
              $('.toolbar .icon-edit.edit-nothing-editable-hidden')
                .removeClass('edit-nothing-editable-hidden');
            }

            // Find editable fields, make them editable.
            Drupal.edit.app.findEditableProperties($context);
          }
        });
      });
    }
  }
};

Drupal.edit.init = function() {
  // Append a messages element for appending interaction updates for screen
  // readers.
  $messages = $(Drupal.theme('editMessageBox')).appendTo($(this).parent());
  // Instantiate EditAppView, which is the controller of it all. EditAppModel
  // instance tracks global state (viewing/editing in-place).
  var appModel = new Drupal.edit.models.EditAppModel();
  var app = new Drupal.edit.EditAppView({
    el: $('body'),
    model: appModel
  });

  // Instantiate EditRouter.
  var editRouter = new Drupal.edit.routers.EditRouter({
    appModel: appModel
  });

  // Start Backbone's history/route handling.
  Backbone.history.start();

  // For now, we work with a singleton app, because for Drupal.behaviors to be
  // able to discover new editable properties that get AJAXed in, it must know
  // with which app instance they should be associated.
  Drupal.edit.app = app;
};

/**
 * Places the message in the edit ARIA live message area.
 *
 * The message will be read by speaking User Agents.
 *
 * @param {String} message
 *   A string to be inserted into the message area.
 */
Drupal.edit.setMessage = function(message) {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('editMessage');
  $messages.html(Drupal.theme.apply(this, args));
};

})(jQuery, _, Backbone, Drupal, drupalSettings);
