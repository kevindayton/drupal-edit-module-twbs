(function ($, undefined) {
  // @todo: clarify whether we should move this to Drupal.edit.views namespace
  // and views/ directory?
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.EditAppView = Backbone.View.extend({
    vie: null,
    domService: null,
    state: null,
    activeEditable: null,
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
      // Instantiate Editables
      this.domService.findSubjectElements().each(function() {
        var subject = appView.domService.getElementSubject(this);
        var predicate = appView.domService.getElementPredicate(this);

        var $element = $(this);
        $element.bind("createeditablestatechange", function(event, data) {
          // Log all state changes coming from the createEditable.
          console.log('statechange', data.previous, data.current, data.instance.getSubjectUri(), data.predicatedata);
          switch (data.current) {
            case 'active':
              // entityElement is the HTML element of the createEditable (?)
              appView.activeEditable = data.entityElement;
              break;
          }
          if (data.previous=='active' && this.activeEditable == data.entityElement) {
            appView.activeEditable = null;
          }
        });

        $element.createEditable({
          vie: appView.vie,
          disabled: true,
          // decorateEditable
          decorate: function(data) {
            /* {
            editable: this.options.widget,
            editor: this,
            predicate: this.options.property,
            element: this.element
            entity:
            } */
          },
          // decorateEditor
          decorateEditor: function(data) {
            data.editor.decorationView = new Drupal.edit.views.FieldDecorationView({
              state: appView.state,
              predicate: data.predicate,
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
              el: data.editable.element,
              entity: data.entity
            });
            data.editor.toolbarView = new Drupal.edit.views.ToolbarView({
              predicate: data.predicate,
              // TRICKY: idem.
              el: data.editable.element,
              entity: data.entity
            });
          }
        }).mouseenter(function(event) {
          // no highlighting if we have a currently active editable.
          if (appView.getActiveEditableElement()) {
            return ;
          }
          var self = this;
          Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
            $(self).createEditable('setState', 'highlighted', predicate);
            event.stopPropagation();
          });
        }).mouseleave(function(event) {
          if (appView.getActiveEditableElement()) {
            return ;
          }
          var self = this;
          Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
            $(self).createEditable('setState', 'candidate', predicate);
            event.stopPropagation();
          });
        });
        // custom events for initiating saving / cancelling
        $element.bind('editsave.edit', function(event, data) {
          appView.handleSave($element, data.entity, data.predicate);
        });
        $element.bind('editcancel.edit', function(event, data) {
          $element.createEditable('setState', 'candidate', predicate);
        });

        $element.createEditable('setState', 'candidate', predicate);
      });


      // Instantiate OverlayView
      /* var overlayView = new Drupal.edit.views.OverlayView({
        state: this.state
      }); */

      // Instantiate MenuView
      var editMenuView = new Drupal.edit.views.MenuView({
        state: this.state
      });
    },
    handleSave: function($editable, entity, predicate) {
      // @todo: i know this is *NOT* the editable instead the form container!
      // but i now "hangs" in the EditingWidget (formwidget.js) - and needs to
      // be made accessible somehow.
      var $formContainer = Drupal.edit.form.get($editable);

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
        widgetType: 'drupalFormWidget'
      });
    },
    _triggerCancel: function($editable) {

    }
  });
})(jQuery);
