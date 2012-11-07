(function ($, undefined) {
  // @todo: clarify whether we should move this to Drupal.edit.views namespace
  // and views/ directory?
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.EditAppView = Backbone.View.extend({
    vie: null,
    domService: null,

    // Configuration.
    activeEditorStates: [],
    singleEditorStates: [],

    // State.
    state: null,
    activeEditor: null,
    $entityElements: [],

    /**
     * Returns the active property editor.
     *
     * @return object|null
     *   The active property editor, or null if none is active.
     */
    getActiveEditor: function() {
      return this.activeEditor;
    },

    initialize: function() {
      // VIE instance for Editing
      this.vie = new VIE();
      // Use our custom DOM parsing service until RDFa is available
      this.vie.use(new this.vie.SparkEditService());
      this.domService = this.vie.service('edit');

      // Instantiate configuration.
      this.activeEditorStates = ['activating', 'active'];
      this.singleEditorStates = _.union(['highlighted'], this.activeEditorStates);

      // Instantiate StateModel
      this.state = new Drupal.edit.models.StateModel();
      this.$el.createStorage({
        vie: this.vie,
        editableNs: 'createeditable'
      });

      // Create a backstage area. This is where we store the form when editing a
      // type=direct field, so that it's hidden from view (hence "backstage").
      // @todo: this belongs in formwidget.js; don't Create.js' editWidgets have
      // an initialization phase, e.g. to prefetch CSS/JS?
      $(Drupal.theme('editBackstage', {})).appendTo(this.$el);

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
            appView.stateChange(data.previous, data.current, data.predicate, data.context, data);
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
        state: this.state
      });

      // Instantiate MenuView
      var editMenuView = new Drupal.edit.views.MenuView({
        state: this.state
      });
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
      if (this.state.get('isViewing')) {
        if (to !== 'inactive') {
          accept = false;
        }
      }
      // Handling of edit mode state changes is more granular.
      else {
        // Ensure only one editor (field) at a time may be higlighted or active.
        if (from === 'candidate' && _.indexOf(this.singleEditorStates, to) !== -1) {
          if (this.getActiveEditor()) {
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
      }

      Drupal.edit.log("accept state:", accept ? 'A' : 'R', from, to, predicate, (context) ? context.reason : undefined);
      callback(accept);
    },

    /**
     * Track global state and pass on the events to the editor widgets.
     */
    stateChange: function(from, to, predicate, context, data) {
      // Only in the initialization phase the predicate is not yet available; we
      // don't care about those state changes.
      if (!predicate) {
        return;
      }

      var editor = data.propertyEditor;

      // Keep track of the active editor in the global state.
      if (_.indexOf(this.activeEditorStates, to) !== -1 && this.activeEditor != editor) {
        this.activeEditor = editor;
      }
      else if (_.indexOf(this.activeEditorStates, from) !== -1 && to === 'candidate') {
        this.activeEditor = null;
      }

      // @todo Propagate the state change to the predicate editors.
      // @todo Ensure Create.js sets the widgetType as a property on
      // propertyEditor, so we can get rid of this filth.
      // var editorWidgetType = editor.element.data('createWidgetName');
      // Drupal.edit.log('editor state:', from, to, predicate, editorWidgetType, editor);
      // editor.decorationView.createEditableStateChange({}, data);
      // editor.toolbarView.createEditableStateChange({}, data);
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

      // Set up Backbone Views.
      editor.decorationView = new Drupal.edit.views.FieldDecorationView({
        state: appView.state,
        predicate: predicate,
        // TRICKY: the Editable element instead of the editing (editor)
        // widget element, because events are triggered on the Editable
        // element, not on the editor element. This is mostly because in
        // our implementation, editable == field wrapper (formerly $field)
        // and editor == actual part that's being edited (formerly
        // $editable). For type=form field wrapper == part that's being
        // edited, for type=direct, this is different.
        // @todo: We should pass data.element instead, and pass
        // data.editable.element separately, just for it to be able to
        // listen to state changes.
        el: $editableElement,
        entity: entity
      });
      editor.toolbarView = new Drupal.edit.views.ToolbarView({
        predicate: predicate,
        // TRICKY: idem.
        el: $editableElement,
        entity: entity
      });

      // Editor-specific event handling.
      $editorElement
      // Start hover: transition to 'highlight' state.
      .mouseenter(function(event) {
        Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
          editable.setState('highlighted', predicate);
          event.stopPropagation();
        });
      })
      // Stop hover: back to 'candidate' state.
      .mouseleave(function(event) {
        Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
          editable.setState('candidate', predicate, { reason: 'mouseleave' });
          event.stopPropagation();
        });
      })
      // custom events for initiating saving / cancelling
      .bind('editsave.edit', function(event, data) {
        appView.handleSave($editorElement, entity, predicate);
      })
      .bind('editcancel.edit', function(event, data) {
        editable.setState('candidate', predicate, { reason: 'cancel' });
      });
    },

    handleSave: function($editable, entity, predicate) {
      // @todo: i know this is *NOT* the editable instead the form container!
      // but i now "hangs" in the EditingWidget (formwidget.js) - and needs to
      // be made accessible somehow.
      var $formContainer = Drupal.edit.form.get($editable);
      var editableWidgetInstance = $editable.data('createEditable');
      // @todo: this is a quick hack - i still need to *pick* by predicate (i.e. options.property == predicate).
      var $editingWidgetElement = editableWidgetInstance.options.editables[0];
      // We need to pass on the widgetType to the Backbone.sync.
      var editingWidgetType = $editingWidgetElement.data('createWidgetName');

      var that = this;
      // Use Create.js' Storage widget to handle saving. (Uses Backbone.sync.)
      this.$el.createStorage('saveRemote', entity, {
        // Successfully saved without validation errors.
        success: function (model) {
          $editable.createEditable('setState', 'candidate', predicate);

          // Replace the old content with the new content.
          var updatedField = model.get(predicate + '/rendered');
          var $inner = jQuery(updatedField).html();
          $editable.html($inner);

          // @todo: VIE doesn't seem to like this? :) It seems that if I delete/
          // overwrite an existing field, that VIE refuses to find the same
          // predicate again for the same entity?
          // self.$el.replaceWith(updatedField);
          // debugger;
          // console.log(self.$el, self.el, Drupal.edit.domService.findSubjectElements(self.$el));
          // Drupal.edit.domService.findSubjectElements(self.$el).each(Drupal.edit.prepareFieldView);
        },
        // Save attempted but failed due to validation errors.
        error: function (validationErrorMessages) {
          $editable
            .find('.edit-form')
            .addClass('edit-validation-error')
            .find('form')
            .prepend(validationErrorMessages);
        },
        $formContainer: $formContainer,
        predicate: predicate,
        widgetType: editingWidgetType
      });
    },
    _triggerCancel: function($editable) {
    },
    bindAppStateChanges: function() {
      var that = this;
      this.state.on('change:isViewing', function() {
        var newEditableEntityState = (that.state.get('isViewing'))
          ? 'inactive'
          : 'candidate';
        that.$entityElements.each(function() {
          $(this).createEditable('setState', newEditableEntityState);
        });
      });
    }
  });
})(jQuery);
