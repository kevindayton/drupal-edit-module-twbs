Drupal.edit.views = Drupal.edit.views || {};
// ## FormEditableFieldView
//
// This view is a subtype of the FieldView that is used for the
// elements Spark edits via regular Drupal forms.
Drupal.edit.views.FormEditableFieldView = Drupal.edit.views.EditableFieldView.extend({

  enableEditableWidget: function () {
    this.$el.createEditable({
      vie: this.vie,
      disabled: false
    });

    var toolbarView = this.getToolbarView();
    var that = this;
    // @todo - use backbone events.
    this.$el.bind('edit-form-loaded.edit', function() {
      // Indicate in the 'info' toolgroup that the form has loaded.
      // Drupal.edit.toolbar.removeClass($editable, 'primary', 'info', 'loading');
      toolbarView.removeClass('info', 'loading');
      toolbarView.show('ops');

      // Bind events
      that.bindFormChanges();
    });
  },

  disableEditableWidget: function () {
    this.$el.createEditable({
      vie: this.vie,
      disabled: true
    });
    this.$el.unbind('edit-form-loaded.edit');
  },

  saveClicked: function (event) {
    // Stop events.
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Use Create.js' Storage widget to handle saving. (Uses Backbone.sync.)
    var self = this;
    jQuery('body').createStorage('saveRemote', this.model.getVieEntity(), {
      // Successfully saved without validation errors.
      success: function (model) {
        self.disableEditor();
        // Replace the old content with the new content.
        var updatedField = model.get(this.predicate + '/rendered');
        var $inner = jQuery(updatedField).html();
        self.$el.html($inner);
      },
      error:function () {},
      predicate: this.model.get('predicate'),
      widgetType: 'drupalFormWidget'
    });
  },

  // Refactored from ui-editables.js
  showLoadingFormIndicator: function() {
    // Render form container.
    var $form = jQuery(Drupal.theme('editFormContainer', {
      id: Drupal.edit.form._id(this.$el),
      loadingMsg: Drupal.t('Loading…')}
    ));

    var $editable = this.$el;
    // Append  & insert in DOM.
    if ($editable.css('display') == 'inline') {
      $form.prependTo($editable.offsetParent());

      var pos = $editable.position();
      $form.css('left', pos.left).css('top', pos.top);
      // Reset the toolbar's positioning because it'll be moved inside the
      // form container.
      // Drupal.edit.toolbar.get($editable).css('left', '').css('top', '');
      this.getToolbarElement().css('left', '').css('top', '');
    }
    else {
      $form.insertBefore($editable);
    }

    // Move  toolbar inside .edit-form-container, to let it snap to the width
    // of the form instead of the field formatter.
    // Drupal.edit.toolbar.get($editable).detach().prependTo('.edit-form');
    this.getToolbarElement().detach().prependTo('.edit-form');

    // Trigger this event to propagate to the appropriate ToolbarView.
    this.trigger('showLoadingFormIndicator');
  },
  // Refactored from ui-editables.js
  bindFormChanges: function() {
    var that = this;
    // Detect changes in this form.
    Drupal.edit.form.get(this.$el)
      .delegate(':input', 'change.edit', function () {
        // Make sure we track changes
        // @todo: trigger createjs' 'createeditablechanged' event rather
        // than calling the method directly?
        // temporarily using the setDirty because contentChanged has been removed.
        that.setDirty(true);
      })
      .delegate('input', 'keypress.edit', function (event) {
        if (event.keyCode == 13) {
          return false;
        }
      });
  },
  // Refactored from ui-editables.js
  unbindFormChanges: function() {
    Drupal.edit.form.get(this.$el)
      .undelegate(':input', 'change.edit')
      .undelegate('input', 'keypress.edit');
  }
});
