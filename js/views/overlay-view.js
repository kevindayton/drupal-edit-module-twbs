Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.OverlayView = Backbone.View.extend({
    state: null,

    events: {
      'click': 'escapeEditor'
    },

    initialize: function (options) {
      this.state = options.state;
      _.bindAll(this, 'stateChange', 'escapeEditor');
      this.state.bind('change:isViewing', this.stateChange);
    },
    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.hideOverlay();
        return;
      }
      this.showOverlay();
    },
    // @todo .bind('click.edit', Drupal.edit.clickOverlay); is missing, thus it
    // is effectively impossible to click out of a editing a field by clicking
    // the overlay.
    showOverlay: function () {
      jQuery(Drupal.theme('editOverlay', {}))
      .appendTo('body')
      .addClass('edit-animate-slow edit-animate-invisible');

      // Animations
      jQuery('#edit_overlay').css('top', jQuery('#navbar').outerHeight());
      jQuery('#edit_overlay').removeClass('edit-animate-invisible');

      // @todo: it is not necessary to disable contextual links in edit mode;
      // the overlay already prevents that!?
      // Disable contextual links in edit mode.
      jQuery('.contextual-links-region')
      .addClass('edit-contextual-links-region')
      .removeClass('contextual-links-region');
    },

    hideOverlay: function () {
      jQuery('#edit_overlay')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.constants.transitionEnd, function (event) {
        jQuery('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, .edit-curtain, .edit-validation-errors').remove();
      });

      // Enable contextual links in edit mode.
      jQuery('.edit-contextual-links-region')
      .addClass('contextual-links-region')
      .removeClass('edit-contextual-links-region');
    },

    // @todo: this doesn't actually check whether there is no modal active!
    escapeEditor: function () {
      var editor = this.state.get('fieldBeingEdited');
      if (editor.length === 0) {
        return;
      }

      var editedFieldView = this.state.get('editedFieldView');
      // No modals open and user is in edit state, close editor by
      // triggering a click to the cancel button
      editedFieldView.getToolbarElement().find('a.close').trigger('click.edit');
    }
  });
