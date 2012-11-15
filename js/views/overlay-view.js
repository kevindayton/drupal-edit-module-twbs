/**
 * @file overlay-view.js
 *
 * A Backbone View that provides the app-level overlay.
 *
 * The overlay sits on top of the existing content, the properties that are
 * candidates for editing sit on top of the overlay.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.OverlayView = Backbone.View.extend({

  appView: null,

  events: {
    'click': 'onEscapeEditor'
  },

  /**
   * Implements Backbone Views' initialize() function.
   */
  initialize: function(options) {
    this.appView = options.appView;

    _.bindAll(this, 'stateChange');
    this.model.bind('change:isViewing', this.stateChange);
  },

  /**
   * Listen to app state changes.
   */
  stateChange: function() {
    if (this.model.get('isViewing')) {
      this.remove();
      return;
    }
    this.render();
  },

  /**
   * Trigger escapeEditor event on parent appView.
   * @todo event handling still needs to be implemented.
   *
   * @param event
   */
  onEscapeEditor: function(event) {
    event.preventDefault();
    this.appView.trigger('escapeEditor');
  },

  /**
   * Inserts the overlay element and appends it to the body.
   */
  render: function() {
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
  remove: function() {
    var that = this;
    this.$el
    .addClass('edit-animate-invisible')
    .bind(Drupal.edit.util.constants.transitionEnd, function (event) {
      that.$el.remove();
      // @todo - should the overlay really do this?
      jQuery('.edit-form-container, .edit-toolbar-container, #edit_modal, .edit-curtain, .edit-validation-errors').remove();
    });
  }
});
