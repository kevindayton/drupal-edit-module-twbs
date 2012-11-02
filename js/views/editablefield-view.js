Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
// ## EditableFieldView
//
// This element is a subtype of the FieldView that adds the controlling
// needed for direct editables (as provided by Create.js editable widget)
// to the FieldView
//
// @todo if this is is really only fir type=direct fields, then that should be
// reflected in the name? Plus, enableEditor() suggestes this is only for
// type=direct-with-wysiwyg
Drupal.edit.views.EditableFieldView = Drupal.edit.views.FieldView.extend({

  events: {
    'mouseenter': 'mouseEnter',
    'mouseleave': 'mouseLeave',
    'click':      'enableEditor',
    'createeditableenable': 'editorEnabled',
    'createeditabledisable': 'editorDisabled'
  },

  initialize: function (options) {
    // Call the parent's initialize-method.
    Drupal.edit.views.FieldView.prototype.initialize.call(this, options);

    _.bindAll(this, 'stateChange');
    this.state.on('change:isViewing', this.stateChange);
  },

  stateChange: function () {
    if (this.state.get('isViewing')) {
      this.model.set('state', this.model.STATE_INACTIVE);
      // @todo: move stopEditable
      this.stopEditable();
      return;
    }
    this.model.set('state', this.model.STATE_CANDIDATE);
    // @todo: move startEditable
    this.startEditable();
  },

  // Entered edit state
  startEditable: function () {
    this.$el.createEditable({
      model: this.model.getVieEntity(),
      vie: this.vie,
      disabled: true
    });
  },

  // Left edit state
  stopEditable: function () {
    if (!this.model.isEditable()) {
      return;
    }
    this.disableEditor();
  },

  enableEditor: function (event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.model.isEditable()) {
      // Not in edit state, ignore
      return;
    }

    if (this.model.isEditing()) {
      // Already editing, ignore
      return;
    }


    var that = this;
    var _enableEditor = function() {
      that.model.set('state', that.model.STATE_ACTIVE);

      // Ensure others are not editable when we are
      if (that.state.get('editedFieldView')) {
        that.state.get('editedFieldView').disableEditor();
      }
      // @todo: we currently need to set that to access the current FieldView
      // in ui-editable.js which is horrible.
      that.state.set('editedFieldView', that);
      // Start the Create.js editable widget
      that.enableEditableWidget();
      // Enable the toolbar with the save and close buttons
      that.enableToolbar();

      that.state.set('fieldBeingEdited', that.$el);
      that.state.set('editedEditable', Drupal.edit.util.getID(that.$el));
      that.state.set('editedFieldView', that);
    };

    // Let's make sure we do not lose any changes, if there is a currently
    // active editableField?
    if (this.state.get('editedFieldView') && this.state.get('editedFieldView').isDirty()) {
      // (Async) confirmation of possibly losing changes.
      Drupal.edit.confirm(Drupal.t('Currently edited field has changes, do you want to proceed?'), {}, function(confirmed) {
        if (!confirmed) {
          return false;
        }
        _enableEditor();
      });
    } else {
      _enableEditor();
    }
  },

  enableEditableWidget: function () {
    this.$el.createEditable({
      vie: this.vie,
      disabled: false
    });
  },

  disableEditor: function () {
    Drupal.edit.log('disableEditor', this.model.getVieEntity().id, this.predicate);
    // Stop the Create.js editable widget
    this.disableEditableWidget();
    this.disableToolbar();

    // @todo: refactor this.
    jQuery('#edit_backstage form').remove();

    this.state.set('fieldBeingEdited', []);
    this.state.set('editedEditable', null);
    this.state.set('editedFieldView', null);
  },

  disableEditableWidget: function () {
    this.$el.createEditable({
      vie: this.vie,
      disabled: true
    });
  },

  editorEnabled: function () {
    Drupal.edit.log("editorenabled", this.model.getVieEntity().id, this.predicate);

    this.model.set('state', this.model.STATE_ACTIVE);
    // @todo: refactor ToolbarView  to listen to model state.
    this.getToolbarView().show('wysiwyg-tabs');
    this.getToolbarView().show('wysiwyg');
    // Show the ops (save, close) as well.
    this.getToolbarView().show('ops');

    this.$el.trigger('edit-form-loaded.edit');
  },

  saveClicked: function (event) {
    this.$el.blur();
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // Find entity and predicate.
    var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject(this.$el));
    var predicate = this.predicate;
    // Drupal.edit.form.saveForm loads and saves form if necessary.
    Drupal.edit.form.saveForm(entity, predicate, this.$el, this.model.getVieEntity().get(this.predicate), function() {
      // Editable has been saved.
    });
  },

  closeClicked: function (event) {
    event.stopPropagation();
    event.preventDefault();
    // @TODO - handle dirty state.
    // Disable the editor for the time being, but allow the editable to be
    // re-enabled on click if needed.
    this.disableEditor();
  },

  editorDisabled: function () {
    // @todo: this needs to go into the fielddecorator-view.js
    this.$el.removeClass('edit-validation-error');
    this.$el.removeClass('ui-state-disabled');
    this.$el.removeClass('edit-wysiwyg-attached');

    this.setDirty(false);
  }
});
