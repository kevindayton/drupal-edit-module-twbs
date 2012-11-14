(function ($, undefined) {
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.EditAppView = Backbone.View.extend({
    vie: null,
    domService: null,

    // Configuration for state handling.
    states: [],
    activeEditorStates: [],
    singleEditorStates: [],

    // State.
    state: null,
    highlightedEditor: null,
    activeEditor: null,
    $entityElements: [],

    initialize: function() {
      // VIE instance for Editing
      this.vie = new VIE();
      // Use our custom DOM parsing service until RDFa is available
      this.vie.use(new this.vie.SparkEditService());
      this.domService = this.vie.service('edit');

      // Instantiate configuration for state handling.
      this.states = [
        null, 'inactive', 'candidate', 'highlighted',
        'activating', 'active', 'changed', 'saving', 'saved', 'invalid'
      ];
      this.activeEditorStates = ['activating', 'active'];
      this.singleEditorStates = _.union(['highlighted'], this.activeEditorStates);

      // Use Create's Storage widget.
      this.$el.createStorage({
        vie: this.vie,
        editableNs: 'createeditable'
      });

      var appView = this;

      // Instantiate EditableEntity widgets.
      this.$entityElements = this.domService.findSubjectElements().each(function() {
        var subject = appView.domService.getElementSubject(this);
        var predicate = appView.domService.getElementPredicate(this);
        var $entityElement = $(this);

        // Create an Editable widget for each predicate (field).
        $entityElement.createEditable({
          vie: appView.vie,
          disabled: true,
          state: 'inactive',
          acceptStateChange: _.bind(appView.acceptStateChange, appView),
          statechange: function(event, data) {
            appView.stateChange(data.previous, data.current, data.propertyEditor);
          },
          decoratePropertyEditor: function(data) {
            appView.decorateEditor(data.entityElement, data.propertyElement, data.editableEntity, data.propertyEditor, data.entity, data.predicate);
          }
        });
      });

      // Setup handling of "app" state changes (is viewing/quick edit).
      this.bindAppStateChanges();

      // Instantiate OverlayView
      var overlayView = new Drupal.edit.views.OverlayView({
        appView: this,
        model: this.model
      });

      // The OverlayView triggers the escapedEditor event if is clicked
      this.bind('escapeEditor', function() {
        // Ensure to prompt for confirmation if the active editor has pending
        // changes.
        appView.revertActiveEditorToCandidate();
      });

      // Instantiate MenuView
      var editMenuView = new Drupal.edit.views.MenuView({
        el: this.el,
        model: this.model
      });
    },

    /**
     * If there is an active editor, attempt to revert the active editor back to
     * candidate. Prompts user to confirm transition, if changes can be lost in
     * that process.
     */
    revertActiveEditorToCandidate: function(cb) {
      if (this.activeEditor) {
        // Get reference to the EntityEditable from the activeEditor.
        var editable = this.activeEditor.options.widget;
        var predicate = this.activeEditor.predicate;
        // Check if this state change is acceptable - this can trigger a modal dialog.
        this.acceptStateChange(editable.getState(), 'candidate', predicate, {}, function(accept) {
          if (accept) {
            // Pass {confirmed: true} to avoid showing the modal again.
            editable.setState('candidate', predicate, {confirmed: true});
          }
          if (_.isFunction(cb)) {
            cb(accept);
          }
        });
      } else {
        if (_.isFunction(cb)) {
          cb(true);
        }
      }
    },

    /**
     * Accepts or reject state changes.
     *
     * This is what ensures that the app is in control of what happens.
     */
    acceptStateChange: function(from, to, predicate, context, callback) {
      var accept = true;

      // If the app is in view mode, then reject all state changes except for
      // those to 'inactive'.
      if (this.model.get('isViewing')) {
        if (to !== 'inactive') {
          accept = false;
        }
      }
      // Handling of edit mode state changes is more granular.
      else {
        // In general, enforce the states sequence. Disallow going back from a
        // "later" state to an "earlier" state, except in explicitly allowed
        // cases.
        if (_.indexOf(this.states, from) > _.indexOf(this.states, to)) {
          accept = false;
          // Allow: activating/active -> candidate.
          // Necessary to stop editing a property.
          if (_.indexOf(this.activeEditorStates, from) !== -1 && to === 'candidate') {
            accept = true;
          }
          // Allow: changed/invalid -> candidate.
          // Necessary to stop editing a property when it is changed or invalid.
          else if ((from === 'changed' || from === 'invalid') && to === 'candidate') {
            accept = true;
          }
          // Allow: highlighted -> candidate.
          // Necessary to stop highlighting a property.
          else if (from === 'highlighted' && to === 'candidate') {
            accept = true;
          }
          // Allow: saved -> candidate.
          // Necessary when successfully saved a property.
          else if (from === 'saved' && to === 'candidate') {
            accept = true;
          }
          // Allow: invalid -> saving.
          // Necessary to be able to save a corrected, invalid property.
          else if (from === 'invalid' && to === 'saving') {
            accept = true;
          }
        }

        // If it's not against the general principle, then here are more
        // disallowed cases to check.
        if (accept) {
          // Ensure only one editor (field) at a time may be higlighted or active.
          if (from === 'candidate' && _.indexOf(this.singleEditorStates, to) !== -1) {
            if (this.highlightedEditor || this.activeEditor) {
              accept = false;
            }
          }
          // Reject going from activating/active to candidate because of a
          // mouseleave.
          else if (_.indexOf(this.activeEditorStates, from) !== -1 && to === 'candidate') {
            if (context && context.reason === 'mouseleave') {
              accept = false;
            }
          }
          // When attempting to stop editing a changed/invalid property, ask for
          // confirmation.
          else if ((from === 'changed' || from === 'invalid') && to === 'candidate') {
            if (context && context.reason === 'mouseleave') {
              accept = false;
            }
            else {
              // Check whether the transition has been confirmed?
              if (context && context.confirmed) {
                accept = true;
              }
              // Confirm this transition.
              // @todo: revive Drupal.edit.modal for this!
              else if (window.confirm('You have unsaved changes. Continuing will drop them. Do you want to continue?')) {
                accept = true;
              }
              else {
                accept = false;
              }
            }
          }
        }
      }

      Drupal.edit.util.log("accept state:", accept ? 'A' : 'R', from, to, predicate, (context) ? context.reason : undefined);
      callback(accept);
    },

    /**
     * Reacts to PropertyEditor state changes; tracks global state.
     *
     * @param from
     *   The previous state.
     * @param to
     *   The new state.
     * @param editor
     *   The PropertyEeditor widget object.
     */
    stateChange: function(from, to, editor) {
      // @todo get rid of this once https://github.com/bergie/create/issues/133 is solved.
      if (!editor) {
        return;
      }
      else {
        editor.stateChange(from, to);
      }

      // Keep track of the highlighted editor in the global state.
      if (_.indexOf(this.singleEditorStates, to) !== -1 && this.highlightedEditor !== editor) {
        this.highlightedEditor = editor;
      }
      else if (this.highlightedEditor === editor && to === 'candidate') {
        this.highlightedEditor = null;
      }

      // Keep track of the active editor in the global state.
      if (_.indexOf(this.activeEditorStates, to) !== -1 && this.activeEditor !== editor) {
        this.activeEditor = editor;
      }
      else if (this.activeEditor === editor && to === 'candidate') {
        this.activeEditor = null;
      }

      // Propagate the state change to the decoration and toolbar views.
      editor.decorationView.stateChange(from, to);
      editor.toolbarView.stateChange(from, to);
    },

    /**
     * Decorates each editor.
     *
     * Upon the page load, all appropriate editors are initialized and decorated
     * (i.e. even before anything of the editing UI becomes visible; even before
     * edit mode is enabled).
     */
    decorateEditor: function($editableElement, $editorElement, editable, editor, entity, predicate) {
      var appView = this;

      editor.decorationView = new Drupal.edit.views.FieldDecorationView({
        el: $editorElement,
        entity: entity,
        predicate: predicate,
        editorName: editor.options.editorName
      });
      // Toolbars are rendered "on-demand" (highlighting or activating).
      // They are a sibling element before the $editorElement.
      editor.toolbarView = new Drupal.edit.views.ToolbarView({
        entity: entity,
        predicate: predicate,
        editorName: editor.options.editorName,
        $editorElement: $editorElement
      });

      // Editor-specific event handling.
      $editorElement
      // Start hover: transition to 'highlight' state.
      .bind('mouseenter.edit', function(event) {
        Drupal.edit.util.ignoreHoveringVia(event, '#' + editor.toolbarView.getId(), function () {
          editable.setState('highlighted', predicate);
          event.stopPropagation();
        });
      })
      // Stop hover: back to 'candidate' state.
      .bind('mouseleave.edit', function(event) {
        Drupal.edit.util.ignoreHoveringVia(event, '#' + editor.toolbarView.getId(), function () {
          editable.setState('candidate', predicate, { reason: 'mouseleave' });
          event.stopPropagation();
        });
      })
      // custom events for initiating saving / cancelling
      .bind('editsave.edit', function(event, data) {
        appView.saveProperty(editor, editable, $editorElement, entity, predicate);
      })
      .bind('editcancel.edit', function(event, data) {
        editable.setState('candidate', predicate, { reason: 'cancel' });
      });
    },

    saveProperty: function(editor, editableEntity, $editorElement, entity, predicate) {
      editableEntity.setState('saving', predicate);

      var editorName = editor.options.editorName;

      // We need to pass on the editorName to the Backbone.sync, as well as some
      // editor-specific options.
      var editorSpecificOptions = {};
      var renderValidationErrors = null;
      if (editorName === 'form') {
        editorSpecificOptions.$formContainer = editor.$formContainer;
      }
      else {
        editorSpecificOptions.$editorElement = $editorElement;
      }

      var that = this;
      // Use Create.js' Storage widget to handle saving. (Uses Backbone.sync.)
      this.$el.createStorage('saveRemote', entity, {
        // Successfully saved without validation errors.
        success: function (model) {
          editableEntity.setState('saved', predicate);

          // Replace the old content with the new content.
          var updatedField = entity.get(predicate + '/rendered');
          var $inner = jQuery(updatedField).html();
          $editorElement.html($inner);

          // @todo: VIE doesn't seem to like this? :) It seems that if I delete/
          // overwrite an existing field, that VIE refuses to find the same
          // predicate again for the same entity?
          // self.$el.replaceWith(updatedField);
          // debugger;
          // console.log(self.$el, self.el, Drupal.edit.domService.findSubjectElements(self.$el));
          // Drupal.edit.domService.findSubjectElements(self.$el).each(Drupal.edit.prepareFieldView);

          editableEntity.setState('candidate', predicate);
        },
        // Save attempted but failed due to validation errors.
        error: function (validationErrorMessages) {
          editableEntity.setState('invalid', predicate);

          if (editorName === 'form') {
            editorSpecificOptions.$formContainer
              .find('.edit-form')
              .addClass('edit-validation-error')
              .find('form')
              .prepend(validationErrorMessages);
          }
          else {
            var $errors = $('<div class="edit-validation-errors"></div>')
              .append(validationErrorMessages);
            $editorElement
              .addClass('edit-validation-error')
              .after($errors);
          }
        },
        predicate: predicate,
        propertyID: entity.getSubjectUri() + '/' + predicate,
        editorName: editorName,
        editorSpecific: editorSpecificOptions
      });
    },
    bindAppStateChanges: function() {
      var that = this;
      this.model.on('change:isViewing', function() {
        var newEditableEntityState = (that.model.get('isViewing'))
          ? 'inactive'
          : 'candidate';
        that.$entityElements.each(function() {
          $(this).createEditable('setState', newEditableEntityState);
        });
      });
    }
  });
})(jQuery);
