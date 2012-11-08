Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.MenuView = Backbone.View.extend({
  /**
   * Initalize view instance.
   *
   * @param options
   */
  initialize: function (options) {
    _.bindAll(this, 'stateChange');
    this.model.bind('change:isViewing', this.stateChange);
    // we have to call stateChange here, because theme_menu_local_task links
    // do not take URL-fragments for consideration.
    this.stateChange();
  },

  /**
   * Listen to global state changes (isViewing).
   */
  stateChange: function () {
    this.$('a.edit_view-edit-toggle').removeClass('active');
    this.$('a.edit_view-edit-toggle').parent().removeClass('active');
    this.$('a.edit_view-edit-toggle.edit-' + (this.model.get('isViewing') ? 'view' : 'edit')).addClass('active').parent().addClass('active');
  }
});
