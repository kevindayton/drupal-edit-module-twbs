(function ($, undefined) {
  // @todo: clarify whether we should move this to Drupal.edit.views namespace
  // and views/ directory?
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.EditAppView = Backbone.View.extend({
    vie: null,
    domService: null,
    state: null,
    activeEditable: null,
    $editableElements: [],
    getActiveEditableElement: function() {
      return this.activeEditable;
    },
    initialize: function() {
      // VIE instance for Editing
      this.vie = new VIE();
      // Use our custom DOM parsing service until RDFa is available
      this.vie.use(new this.vie.SparkEditService());
      this.domService = this.vie.service('edit');

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

      // Instantiate Editable widgets.
      this.$editableElements = this.domService.findSubjectElements().each(function() {
        var subject = appView.domService.getElementSubject(this);
        var predicate = appView.domService.getElementPredicate(this);
        var $element = $(this);
        appView.bindEditableStateChanges($element);

        // Create an Editable widget for each predicate (field).
        $element.createEditable({
          vie: appView.vie,
          disabled: true,
          acceptStateChange: _.bind(appView.acceptStateChange, appView),
          decorateEditor: function(data) {
            appView.decorateEditor(data.editable.element, data.element, data.editable, data.editor, data.entity, data.predicate);
          }
        });

        // Begin as inactive; switch on appView.state.isViewing changes.
        $element.createEditable('setState', 'inactive', predicate);
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
     * Accepts or reject state changes
     *
     * This is what ensures that the app is in control of what happens.
     */
    acceptStateChange: function(from, to, predicate, callback) {
      var accept = true;
      var focusedEditorStates = ['activating', 'active'];
      var singleEditorStates = _.union(['highlighted'], focusedEditorStates);

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
        if (from === 'candidate' && _.indexOf(singleEditorStates, to) !== -1) {
          if (this.getActiveEditableElement()) {
            accept = false;
          }
        }
        // Reject going from activating/active to candidate, except when the
        // the state change was triggered by clicking on the 'cancel' button.
        // @todo: THIS NEEDS TO DISCERN BETWEEN A MOUSELEAVE AND A 'CANCEL'
        // BUTTON CLICK! Possibly this will need a new parameter for Create's
        // setState() and acceptStateChange().
        else if (_.indexOf(focusedEditorStates, from) !== -1 && to === 'candidate') {
          accept = false;
        }
      }

      Drupal.edit.log(accept ? 'accepting' : 'rejecting', from, to, predicate);
      callback(accept);
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
          editable.setState('candidate', predicate);
          event.stopPropagation();
        });
      })
      // custom events for initiating saving / cancelling
      .bind('editsave.edit', function(event, data) {
        appView.handleSave($element, entity, predicate);
      })
      .bind('editcancel.edit', function(event, data) {
        editable.setState('candidate', predicate);
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
    bindEditableStateChanges: function($element) {
      var appView = this;
      $element.bind("createeditablestatechange", function(event, data) {
        // jqueryui-widget, oh my.
        var editableWidgetInstance = $element.data('createEditable');
        // Log all state changes coming from the createEditable.
        switch (data.current) {
          case 'active':
            // entityElement is the HTML element of the createEditable (?)
            appView.activeEditable = data.entityElement;
            break;
        }
        if (data.previous=='active' && this.activeEditable == data.entityElement) {
          appView.activeEditable = null;
        }

        // push the statechanges to the editingWidgets - which confusingly are called editables
        _.each(editableWidgetInstance.options.editables, function($editingWidgetElement, key) {
          // meh for DOM.
          var widgetType = $editingWidgetElement.data('createWidgetName');
          var editingWidgetInstance = $editingWidgetElement.data(widgetType);
          if (widgetType == 'drupalFormWidget') {
            // so predicate is called property on the widget?!
            console.log('State changes on drupalFormWidget (%o) %s - from %s to %s', editingWidgetInstance.options, editingWidgetInstance.property, data.previous, data.current);
            switch (data.current) {
             case 'active':
                break;
            }
          }
        });
      });
    },
    bindAppStateChanges: function() {
      var that = this;
      this.state.on('change:isViewing', function() {
        that.$editableElements.each(function() {
          var $element = $(this);
          if (that.state.get('isViewing')) {
            that.$editableElements.each(function() {
              $(this).createEditable('setState', 'inactive');
            })
          } else {
            $(this).createEditable('setState', 'candidate');
          }
        });
      });
    }
  });
})(jQuery);
