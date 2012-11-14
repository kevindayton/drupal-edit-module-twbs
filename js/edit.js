(function ($, VIE) {

Drupal.edit = Drupal.edit || {};

Drupal.behaviors.editDiscoverEditables = {
  attach: function(context) {
    // @todo: we need to separate the discovery of editables if we want updated
    // or new content (added by code other than Edit) to be detected
    // automatically. Once we implement this, we'll be able to get rid of all
    // calls to Drupal.edit.domService.findSubjectElements() :)
  }
};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit_view-edit-toggles').once('edit-init', Drupal.edit.init);
  }
};

Drupal.edit.init = function() {
  // Instantiate EditAppView, which is the controller of it all. StateModel
  // instance tracks global state (viewing/editing in-place).
  var appView = new Drupal.edit.EditAppView({
    el: $('body'),
    model: new Drupal.edit.models.StateModel()
  });

  // Instantiate EditRouter.
  var editRouter = new Drupal.edit.routers.EditRouter({
    appView: appView
  });

  // Start Backbone's history/route handling.
  Backbone.history.start();
};

})(jQuery, VIE);
