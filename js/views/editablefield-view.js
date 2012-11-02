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
    'createeditabledisable': 'editorDisabled',
    'createeditablechanged': 'contentChanged'
  },

  initialize: function (options) {
    this.state = this.options.state;
    this.predicate = this.options.predicate;
    this.vie = this.options.vie;

    _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave', 'enableEditor', 'editorEnabled', 'editorDisabled', 'contentChanged');

    this.state.on('change:isViewing', this.stateChange);
  },

  stateChange: function () {
    if (this.state.get('isViewing')) {
      this.stopEditable();
      return;
    }
    this.startEditable();
  },

  // Entered edit state
  startEditable: function () {
    this.editable = true;

     this.$el.createEditable({
        model: this.model,
        vie: this.vie,
        disabled: true
      });

    this.decorate();
  },

  // Left edit state
  stopEditable: function () {
    if (!this.editable) {
      return;
    }

    this.editable = false;

    this.disableEditor();
    this.undecorate();
  },

  enableEditor: function (event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (!this.editable) {
      // Not in edit state, ignore
      return;
    }

    if (this.editing) {
      // Already editing, ignore
      return;
    }


    var that = this;
    var _enableEditor = function() {
      that.startHighlight();
      // @todo: 'edit-candidate' class should be removed at this point in time;
      // it is now no longer a candidate for being edited; it's *actually*
      // being edited!

      that.$el
      .addClass('edit-editing')
      .css('background-color', that.$el.data('edit-background-color'));

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
    Drupal.edit.log('disableEditor', this.model.id, this.predicate);

    this.$el
    .removeClass('edit-editing')
    .css('background-color', '');

    // TODO: Restore curtain height

    // Stop the Create.js editable widget
    this.disableEditableWidget();
    this.disableToolbar();

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
    Drupal.edit.log("editorenabled", this.model.id, this.predicate);
    // Avoid re-"padding" of editable.
    if (!this.editing) {
      this.padEditable();
    }

    this.getToolbarView().show('wysiwyg-tabs');
    this.getToolbarView().show('wysiwyg');
    // Show the ops (save, close) as well.
    this.getToolbarView().show('ops');

    this.setDirty(false);
    this.$el.trigger('edit-form-loaded.edit');
    this.editing = true;
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
    Drupal.edit.form.saveForm(entity, predicate, this.$el, this.model.get(this.predicate), function() {
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

  padEditable: function () {
    var self = this;
    // Add 5px padding for readability. This means we'll freeze the current
    // width and *then* add 5px padding, hence ensuring the padding is added "on
    // the outside".
    // 1) Freeze the width (if it's not already set); don't use animations.
    if (this.$el[0].style.width === "") {
      this.$el
      .data('edit-width-empty', true)
      .addClass('edit-animate-disable-width')
      .css('width', this.$el.width());
    }

    // 2) Add padding; use animations.
    var posProp = Drupal.edit.util.getPositionProperties(this.$el);
    var $toolbar = this.getToolbarElement();
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

      // The whole toolbar must move to the top when it's an inline editable.
      if (self.$el.css('display') == 'inline') {
        $toolbar.css('top', parseFloat($toolbar.css('top')) - 5 + 'px');
      }

      // @todo: adjust this according to the new
      // Drupal.theme.prototype.editToolbarContainer
      // The toolbar must move to the top and the left.
      var $hf = $toolbar.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '6px', left: '-5px' });
      // When using a WYSIWYG editor, the width of the toolbar must match the
      // width of the editable.
      if (self.$el.hasClass('edit-type-direct-with-wysiwyg')) {
        $hf.css({ width: self.$el.width() + 10 });
      }

      // Pad the editable.
      self.$el
      .css({
        'position': 'relative',
        'top':  posProp.top  - 5 + 'px',
        'left': posProp.left - 5 + 'px',
        'padding-top'   : posProp['padding-top']    + 5 + 'px',
        'padding-left'  : posProp['padding-left']   + 5 + 'px',
        'padding-right' : posProp['padding-right']  + 5 + 'px',
        'padding-bottom': posProp['padding-bottom'] + 5 + 'px',
        'margin-bottom':  posProp['margin-bottom'] - 10 + 'px'
      });
    }, 0);
  },

  unpadEditable: function () {
    var self = this;

    // 1) Set the empty width again.
    if (this.$el.data('edit-width-empty') === true) {
      Drupal.edit.log('restoring width');
      this.$el
      .addClass('edit-animate-disable-width')
      .css('width', '');
    }

    // 2) Remove padding; use animations (these will run simultaneously with)
    // the fading out of the toolbar as its gets removed).
    var posProp = Drupal.edit.util.getPositionProperties(this.$el);
    var $toolbar = this.getToolbarElement();

    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

      // Move the toolbar back to its original position.
      var $hf = $toolbar.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '1px', left: '' });
      // When using a WYSIWYG editor, restore the width of the toolbar.
      if (self.$el.hasClass('edit-type-direct-with-wysiwyg')) {
        $hf.css({ width: '' });
      }
      // Undo our changes to the clipping (to prevent the bottom box-shadow).
      $toolbar
      .undelegate('.edit-toolbar', Drupal.edit.constants.transitionEnd)
      .find('.edit-toolbar').css('clip', '');

      // Unpad the editable.
      self.$el
      .css({
        'position': 'relative',
        'top':  posProp.top  + 5 + 'px',
        'left': posProp.left + 5 + 'px',
        'padding-top'   : posProp['padding-top']    - 5 + 'px',
        'padding-left'  : posProp['padding-left']   - 5 + 'px',
        'padding-right' : posProp['padding-right']  - 5 + 'px',
        'padding-bottom': posProp['padding-bottom'] - 5 + 'px',
        'margin-bottom': posProp['margin-bottom'] + 10 + 'px'
      });
    }, 0);
  },

  editorDisabled: function () {
    // Avoid re-"unpadding" of editable.
    if (this.editing) {
      this.unpadEditable();
    }
    this.$el.removeClass('edit-validation-error');
    this.$el.removeClass('ui-state-disabled');
    this.$el.removeClass('edit-wysiwyg-attached');

    this.editing = false;
    this.setDirty(false);
  },

  contentChanged: function () {
    this.setDirty(true);
  }
});
