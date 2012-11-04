(function ($, VIE) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.wysiwyg = Drupal.edit.wysiwyg || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.editDiscoverEditables = {
  attach: function(context) {
    // @todo: we need to separate the discovery of editables if we want updated
    // or new content (added by code other than Edit) to be detected
    // automatically. Once we implement this, we'll be able to get rid of all
    // calls to Drupal.edit.domService.findSubjectElements() :)
  }
}
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit_view-edit-toggles').once('edit-init', Drupal.edit.init);
  }
};

Drupal.edit.constants = {};
Drupal.edit.constants.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

// Temporary helper function: logging.
Drupal.edit.debug = true;
Drupal.edit.log = function() {
  if (Drupal.edit.debug && window.console) {
    console.log(Array.prototype.slice.call(arguments));
  }
};

// Temporary helper function: (async) confirm dialog.
Drupal.edit.confirm = function(message, options, cb) {
  // @todo: use whatever confirm-dialog implementation we need.
  if (window.confirm(message)) {
    cb(true);
  } else {
    cb(false);
  }
};

Drupal.edit.init = function() {
  var appView = new Drupal.edit.EditAppView({
    el: $('body')
  });
  // @todo refactor these globals, if possible (should go away once FieldView and FieldViewModel) dies.
  Drupal.edit.vie = appView.vie;
  Drupal.edit.state = appView.state;

  // Instantiate EditRouter
  var editRouter = new Drupal.edit.routers.EditRouter({
    appView: appView
  });

  // Start Backbone's history/route handling
  Backbone.history.start();

};

})(jQuery, VIE);

