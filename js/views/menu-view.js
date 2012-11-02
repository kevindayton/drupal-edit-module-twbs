Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.MenuView = Backbone.View.extend({
  initialize: function (options) {
    this.state = options.state;
    _.bindAll(this, 'stateChange');
    this.state.bind('change:isViewing', this.stateChange);
    // we have to call stateChange here, because theme_menu_local_task links
    // do not take URL-fragments for consideration.
    this.stateChange();
  },
  stateChange: function () {
    jQuery('a.edit_view-edit-toggle').removeClass('active');
    jQuery('a.edit_view-edit-toggle').parent().removeClass('active');
    jQuery('a.edit_view-edit-toggle.edit-' + (this.state.get('isViewing') ? 'view' : 'edit')).addClass('active').parent().addClass('active');
  }
});
