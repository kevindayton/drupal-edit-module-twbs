Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.OverlayView = Backbone.View.extend({
  // Reference to a EditAppView instance.
  appView: null,

  // Events
  events: {
    'click': 'onEscapeEditor'
  },

  /**
   * Initalize view instance.
   *
   * @param options
   */
  initialize: function (options) {
    this.appView = options.appView;

    _.bindAll(this, 'stateChange');
    this.model.bind('change:isViewing', this.stateChange);
  },

  /**
   * Trigger escapeEditor event on parent appView.
   * @todo event handling still needs to be implemented.
   *
   * @param event
   */
  onEscapeEditor: function (event) {
    event.preventDefault();
    this.appView.trigger('escapeEditor');
  },

  /**
   * Listen to global state changes (isViewing).
   */
  stateChange: function () {
    if (this.model.get('isViewing')) {
      this.remove();
      return;
    }
    this.render();
  },

  /**
   * Inserts the overlay element and appends it to the body.
   */
  render: function () {
    this.setElement(
      jQuery(Drupal.theme('editOverlay', {}))
      .appendTo('body')
      .addClass('edit-animate-slow edit-animate-invisible')
    );
    // Animations
    this.$el.css('top', jQuery('#navbar').outerHeight());
    this.$el.removeClass('edit-animate-invisible');
  },

  /**
   * Remove the overlay element.
   */
  remove: function () {
    var that = this;
    this.$el
    .addClass('edit-animate-invisible')
    .bind(Drupal.edit.constants.transitionEnd, function (event) {
      that.$el.remove();
      // @todo - should the overlay really do this?
      jQuery('.edit-form-container, .edit-toolbar-container, #edit_modal, .edit-curtain, .edit-validation-errors').remove();
    });
  }
});
