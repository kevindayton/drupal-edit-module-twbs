Drupal.edit.views = Drupal.edit.views || {};
// ## FormEditableFieldView
//
// This view is a subtype of the FieldView that is used for the
// elements Spark edits via regular Drupal forms.
Drupal.edit.views.FormEditableFieldView = Drupal.edit.views.EditableFieldView.extend({

  // Keep track of the form container that is used for editing this field.
  $formContainer: null,

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

        // @todo: VIE doesn't seem to like this? :) It seems that if I delete/
        // overwrite an existing field, that VIE refuses to find the same
        // predicate again for the same entity?
        // self.$el.replaceWith(updatedField);
        // debugger;
        // console.log(self.$el, self.el, Drupal.edit.domService.findSubjectElements(self.$el));
        // Drupal.edit.domService.findSubjectElements(self.$el).each(Drupal.edit.prepareFieldView);
      },
      error:function () {},
      $formContainer: self.$formContainer,
      predicate: this.model.get('predicate'),
      widgetType: 'drupalFormWidget'
    });
  },

  // Refactored from ui-editables.js
  showLoadingFormIndicator: function() {
    // Render form container.
    this.$formContainer = jQuery(Drupal.theme('editFormContainer', {
      id: Drupal.edit.form._id(this.$el),
      loadingMsg: Drupal.t('Loading…')}
    ));

    var $editable = this.$el;
    // Append  & insert in DOM.
    if ($editable.css('display') == 'inline') {
      this.$formContainer.prependTo($editable.offsetParent());

      var pos = $editable.position();
      this.$formContainer.css('left', pos.left).css('top', pos.top);
      // Reset the toolbar's positioning because it'll be moved inside the
      // form container.
      // Drupal.edit.toolbar.get($editable).css('left', '').css('top', '');
      this.getToolbarElement().css('left', '').css('top', '');
    }
    else {
      this.$formContainer.insertBefore($editable);
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
    this.$formContainer
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
    this.$formContainer
      .undelegate(':input', 'change.edit')
      .undelegate('input', 'keypress.edit');
  }
});
