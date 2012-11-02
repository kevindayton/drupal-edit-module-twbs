/**
 * @file
 * All Backbone.Views used for in-place editing.
 *
 * @todo  Split this into one file per view?
 */

(function ($) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.views = Drupal.edit.views || {};

  Drupal.edit.views.ToolbarView = Backbone.View.extend({
    fieldView:null,
    // @todo: this should be the toolbar's $el.
    $toolbar:null,
    initialize:function (options) {
      this.fieldView = options.fieldView;
      _.bindAll(this, 'fieldChanged', 'showLoadingFormIndicator');
      // @note: we're binding events of the parent view. If we had a FieldModel
      // we could bind to changes there.
      this.fieldView.on('fieldChanged', this.fieldChanged);
      this.fieldView.on('showLoadingFormIndicator', this.showLoadingFormIndicator);
    },
    // Adjust colour of Save button, when FieldView state is "dirty".
    fieldChanged: function(dirty) {
      if (dirty) {
        this.getToolbarElement()
          .find('a.save')
          .addClass('blue-button')
          .removeClass('gray-button');
      }
    },
    // Adjust toolbar as editable is loading form.
    showLoadingFormIndicator: function() {
      // var that = this;
      // Indicate in the 'info' toolgroup that the form is loading. Animated.
      /* setTimeout(function() {
        that.addClass('info', 'loading');
      }, 0); */
      // @todo: why do we do this twice?
      // Indicate in the 'info' toolgroup that the form is loading.
      // Drupal.edit.toolbar.addClass($editable, 'primary', 'info', 'loading');
      this.addClass('info', 'loading');
    },

    getEditable:function () {
      return this.fieldView.$el;
    },
    getToolbarElement:function () {
      return $('#' + this._id() );
    },
    // This function contains the former:
    //   - Drupal.edit.toolbar.create()
    //   - Drupal.edit.toolbar.startHighlight()
    //   - Drupal.edit.toolbar.startEdit()
    //   - _updateDirectEditable()
    createToolbar:function () {
      // @START Drupal.edit.toolbar.create()
      if (this.getToolbarElement().length) {
        return true;
      }
      var $editable = this.getEditable();
      // Render toolbar.
      var $toolbar = $(Drupal.theme('editToolbarContainer', {
        id:this._id()
      }));
      // Insert in DOM.
      if ($editable.css('display') == 'inline') {
        $toolbar.prependTo($editable.offsetParent());
        var pos = $editable.position();
        $toolbar.css('left', pos.left).css('top', pos.top);
      }
      else {
        $toolbar.insertBefore($editable);
      }

      // Animate the toolbar into visibility.
      setTimeout(function () {
        $toolbar.removeClass('edit-animate-invisible');
      }, 0);

      // Remove any and all existing toolbars, except for any that are for a
      // currently being edited field.
      $('.edit-toolbar-container:not(:has(.edit-editing))')
        .trigger('edit-toolbar-remove.edit');

      // Event bindings.
      $toolbar
        .bind('mouseenter.edit', function (e) {
          // Prevent triggering the entity's mouse enter event.
          e.stopPropagation();
        })
        .bind('mouseleave.edit', function (e) {
          var el = $editable[0];
          if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
            Drupal.edit.log('triggering mouseleave on ', $editable);
            $editable.trigger('mouseleave.edit');
          }
          // Prevent triggering the entity's mouse leave event.
          e.stopPropagation();
        })
        // Immediate removal whenever requested.
        // (This is necessary when showing many toolbars in rapid succession: we
        // don't want all of them to show up!)
        .bind('edit-toolbar-remove.edit', function (e) {
          $toolbar.remove();
        })
        .delegate('.edit-toolbar, .edit-toolgroup', 'click.edit mousedown.edit', function (e) {
          if (!$(e.target).is(':input')) {
            return false;
          }
        });
      // @END Drupal.edit.toolbar.create()




      // We get the label to show from VIE's type system
      var label = this.fieldView.predicate;
      var attributeDef = this.fieldView.model.get('@type').attributes.get(this.fieldView.predicate);
      if (attributeDef && attributeDef.metadata) {
        label = attributeDef.metadata.label;
      }
      var self = this;



      // @START Drupal.edit.editables.startHighlight(), minus label handling,
      // which is now handled by VIE in the above code block AND minus
      // the adding of the edit-highlighted class (which is animated).
      $toolbar.find('.edit-toolbar:not(:has(.edit-toolgroup.info))')
        .append(Drupal.theme('editToolgroup', {
        classes:'info',
        buttons:[
          {
            url:'#',
            label:label,
            classes:'blank-button label',
            hasButtonRole:false
          }
        ]
      }))
        .delegate('a.label', 'click.edit', function (event) {
          self.fieldView.$el.trigger('click.edit');
          event.stopPropagation();
          event.preventDefault();
        });
      // @END Drupal.edit.editables.startHighlight()




      // @START Drupal.edit.editables.startEdit(), minus the event handling for
      // content-changed.edit, AND minus the background-color handling, AND
      // minus the "prevent multiple simultaneous editables" handling (though
      // Create.js might be doing this for us) AND minus the _updateFormEditable
      // vs. _updateDirectEditable calling, it just includes a subset of the
      // latter directly.
      $toolbar
        .addClass('edit-editing')
        .find('.edit-toolbar:not(:has(.edit-toolgroup.ops))')
        .append(Drupal.theme('editToolgroup', {
        classes:'ops',
        buttons:[
          {
            url:'#',
            label:Drupal.t('Save'),
            classes:'field-save save gray-button'
          },
          {
            url:'#',
            label:'<span class="close"></span>',
            classes:'field-close close gray-button'
          }
        ]
      }))
        .delegate('a.field-save', 'click.edit', function (event) {
          self.fieldView.saveClicked(event);
        })
        .delegate('a.field-close', 'click.edit', function (event) {
          self.fieldView.closeClicked(event);
        });
      // @END Drupal.edit.editables.startEdit()




      // @START Drupal.edit.editables._updateDirectEditable(), minus padding AND
      // minus transformation filter handling AND minus _wysiwify() call AND
      // minus changed content handling
      if ($editable.hasClass('edit-type-direct-with-wysiwyg')) {
        $toolbar
        .find('.edit-toolbar:not(:has(.edit-toolbar-wysiwyg-tabs))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'wysiwyg-tabs',
          buttons: []
        }))
        .end()
        .find('.edit-toolbar:not(:has(.edit-toolgroup.wysiwyg))')
        .append(Drupal.theme('editToolgroup', {
          classes: 'wysiwyg',
          buttons: []
        }));
        // @END Drupal.edit.editables._updateDirectEditable()




        // @todo: No WYSIWYG is attached yet, then this class should not be added!
        this.fieldView.$el.addClass('edit-wysiwyg-attached');
      }
      return true;
    },
    // @todo: proper Backbone.remove() and unbind all events above!
    // @todo: near-identical to Drupal.edit.toolbar.remove()
    removeToolbar:function () {
      var $toolbar  = this.getToolbarElement();
      // Remove after animation.
      $toolbar
        .addClass('edit-animate-invisible')
        // Prevent this toolbar from being detected *while* it is being removed.
        .removeAttr('id')
        .find('.edit-toolbar .edit-toolgroup')
        .addClass('edit-animate-invisible')
        .bind(Drupal.edit.constants.transitionEnd, function (e) {
          $toolbar.remove();
        });
    },
    // Animate into view.
    show:function (toolgroup) {
      this._find(toolgroup).removeClass('edit-animate-invisible');
    },
    hide:function (toolgroup) {
      this._find(toolgroup).addClass('edit-animate-invisible');
    },
    addClass:function (toolgroup, classes) {
      this._find(toolgroup).addClass(classes);
    },
    removeClass:function (toolgroup, classes) {
      this._find(toolgroup).removeClass(classes);
    },
    _find:function (toolgroup) {
      return this.getToolbarElement().find('.edit-toolbar .edit-toolgroup.' + toolgroup);
    },
    _id:function () {
      var edit_id = Drupal.edit.util.getID(this.getEditable());
      return 'edit-toolbar-for-' + edit_id.split(':').join('_');
    }
  });

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
      $('a.edit_view-edit-toggle').removeClass('active');
      $('a.edit_view-edit-toggle').parent().removeClass('active');
      $('a.edit_view-edit-toggle.edit-' + (this.state.get('isViewing') ? 'view' : 'edit')).addClass('active').parent().addClass('active');
    }
  });

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
      $(Drupal.theme('editOverlay', {}))
      .appendTo('body')
      .addClass('edit-animate-slow edit-animate-invisible');

      // Animations
      $('#edit_overlay').css('top', $('#navbar').outerHeight());
      $('#edit_overlay').removeClass('edit-animate-invisible');

      // @todo: it is not necessary to disable contextual links in edit mode;
      // the overlay already prevents that!?
      // Disable contextual links in edit mode.
      $('.contextual-links-region')
      .addClass('edit-contextual-links-region')
      .removeClass('contextual-links-region');
    },

    hideOverlay: function () {
      $('#edit_overlay')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.constants.transitionEnd, function (event) {
        $('#edit_overlay, .edit-form-container, .edit-toolbar-container, #edit_modal, .edit-curtain').remove();
      });

      // Enable contextual links in edit mode.
      $('.edit-contextual-links-region')
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

  // ## FieldView
  //
  // This view wraps a field, and connects it with the state of
  // the Spark Edit module. When state changes to `edit`, the view
  // decorates the view with the necessary DOM and classes to provide
  // the editing tools
  Drupal.edit.views.FieldView = Backbone.View.extend({
    predicate: null,
    state: null,
    editable: false,
    editing: false,
    // dirty state, i.e. unpersisted changes - @todo: move to a FieldModel?
    dirty: false,
    vie: null,
    editableViews: [],
    toolbarView: null,

    events: {
      'mouseenter': 'mouseEnter',
      'mouseleave': 'mouseLeave'
    },
    // @todo - refactor into a Model?
    isDirty: function() {
      return this.dirty === true;
    },
    setDirty: function(value) {
      // @todo - shouldn't we use FieldModel
      this.trigger('fieldChanged', value);
      this.dirty = value;
    },

    initialize: function (options) {
      this.state = this.options.state;
      this.predicate = this.options.predicate;
      this.vie = this.options.vie;

      _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave');

      this.state.on('change:isViewing', this.stateChange);
    },

    stateChange: function () {
      if (this.state.get('isViewing')) {
        this.editable = false;
        this.undecorate();
        return;
      }
      this.editable = true;
      this.decorate();
    },

    decorate: function () {
      this.$el
      .addClass('edit-animate-fast')
      .addClass('edit-candidate edit-editable')
      .data('edit-background-color', Drupal.edit.util.getBgColor(this.$el));
    },

    undecorate: function () {
      // @todo: clarify: undecorating shouldn't remove edit-editable?
      // WIM: why? In view mode, you don't need that information?
      this.$el
        .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay');
    },

    mouseEnter: function (event) {
      if (!this.editable) {
        return;
      }
      // @todo: this should not be necessary; the overlay should prevent this.
      if (this.state.get('editedFieldView')) {
        // Some field is being edited, ignore
        return;
      }
      var self = this;
      Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
        if (!self.editing) {
          Drupal.edit.log('field:mouseenter', self.model.id, self.predicate);
          self.startHighlight();
        }
        event.stopPropagation();
      });
    },

    mouseLeave: function (event) {
      if (!this.editable) {
        return;
      }
      if (this.state.get('editedFieldView')) {
        // Some field is being edited, ignore
        return;
      }
      var self = this;
      Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
        if (!self.editing) {
          Drupal.edit.log('field:mouseleave', self.model.id, self.predicate);
          self.stopHighlight();
        }
        event.stopPropagation();
      });
    },

    startHighlight: function () {
      Drupal.edit.log('startHighlight', this.model.id, this.predicate);

      // Animations.
      var self = this;
      setTimeout(function () {
        self.$el.addClass('edit-highlighted');
        self.getToolbarView().show('info');
      }, 0);

      this.state.set('fieldBeingHighlighted', this.$el);
      this.state.set('highlightedEditable', this.model.id + '/' + this.predicate);
    },

    stopHighlight: function () {
      Drupal.edit.log('stopHighlight', this.model.id, this.predicate);
      // Animations
      this.$el.removeClass('edit-highlighted');
      this.state.set('fieldBeingHighlighted', []);
      this.state.set('highlightedEditable', null);
      // hide info
      this.disableToolbar();

    },

    // @todo: this should be called by startHighlight(); as soon as a field is
    // highlighted the field's label should appear, which is part of the toolbar.
    enableToolbar: function () {
      if (!this.toolbarView) {
        this.toolbarView = new Drupal.edit.views.ToolbarView({
          fieldView: this
        });
      }
      this.toolbarView.createToolbar();
    },
    disableToolbar: function() {
      if (this.toolbarView) {
        this.toolbarView.removeToolbar();
        this.toolbarView.remove();
        // @todo: make sure everything is unbound.
        delete this.toolbarView;
      }
    },
    getToolbarView: function() {
      if (!this.toolbarView) {
        this.enableToolbar();
      }
      return this.toolbarView;
    },
    getToolbarElement: function() {
      return this.getToolbarView().getToolbarElement();
    },

    showLoadingFormIndicator: function() {
      // Trigger this event to propagate to the appropriate ToolbarView.
      this.trigger('showLoadingFormIndicator');
    },
  });

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

      $('#edit_backstage form').remove();

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
      this.$el.removeClass('ui-state-disabled');
      this.$el.removeClass('edit-wysiwyg-attached');

      this.editing = false;
      this.setDirty(false);
    },

    contentChanged: function () {
      this.setDirty(true);
    }
  });

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

      var value = this.model.get(this.predicate);
      var entity = Drupal.edit.vie.entities.get(Drupal.edit.util.getElementSubject(this.$el));
      var that = this;

      Drupal.edit.form.saveForm(entity, this.predicate, this.$el, null, function(error, $el) {
        // Restart the editable.
        that.startEditable();
      });
    },
    // Refactored from ui-editables.js
    showLoadingFormIndicator: function() {
      // Render form container.
      var $form = $(Drupal.theme('editFormContainer', {
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
          that.contentChanged();
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

})(jQuery);
