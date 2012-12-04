/**
 * @file
 * Behaviors for Edit, including the one that initializes Edit's EditAppView.
 */
(function ($, Backbone, Drupal) {

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

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    var $context = $(context);

    // Initialize the Edit app.
    $context.find('#toolbar-tab-edit').once('edit-init', Drupal.edit.init);

    // As soon as there is at least one editable property, show the Edit tab in
    // the toolbar.
    if ($context.find('.edit-field.edit-allowed').length) {
      $('.toolbar .icon-edit.edit-nothing-editable-hidden').removeClass('edit-nothing-editable-hidden');
    }

    // Find editable properties, make them editable.
    if (Drupal.edit.app) {
      Drupal.edit.app.findEditableProperties($context);
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
}

})(jQuery, Backbone, Drupal);
