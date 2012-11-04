(function ($, undefined) {
  // @todo: clarify whether we should move this to Drupal.edit.views namespace
  // and views/ directory?
  Drupal.edit = Drupal.edit || {};
  Drupal.edit.EditAppView = Backbone.View.extend({
    vie: null,
    domService: null,
    state: null,
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
        var $element = $(this);
        $element.bind("createeditablestatechange", function(event, data) {
          // Log all state changes coming from the createEditable.
          console.log('statechange', data.previous, data.current, data.instance.getSubjectUri(), data.predicate, data.entityElement[0].className.split(' ')[1], data);
        });

        $element.createEditable({
          vie: appView.vie,
          disabled: true,
          decorate: function(data) {
            /* {
            editable: this.options.widget,
            editor: this,
            predicate: this.options.property,
            element: this.element
            entity:
            } */
          },
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
          var self = this;
          Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
            $(self).createEditable('setState', 'highlighted');
            event.stopPropagation();
          });
        }).mouseleave(function(event) {
            var self = this;
            Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
              $(self).createEditable('setState', 'candidate');
              event.stopPropagation();
            });
        });

        $element.createEditable('setState', 'candidate');

/*
        var fieldViewType = Drupal.edit.views.EditableFieldView;
        if (element.hasClass('edit-type-form')) {
          fieldViewType = Drupal.edit.views.FormEditableFieldView;
        }

        appView.vie.load({
          element: element
        }).using('edit').execute().done(function (entities) {
          var subject = appView.domService.getElementSubject(element);
          var predicate = appView.domService.getElementPredicate(element);
          var entity = entities[0];
          if (!entity) {
            return;
          }




          // Instantiate FieldViewModel
          var fieldViewModel = new Drupal.edit.models.FieldViewModel({
            'subject': subject,
            'predicate': predicate,
            'entity': entity
          });

          // Instantiate appropriate subtype of FieldView
          var fieldView = new fieldViewType({
            model: fieldViewModel,
            state: appView.state,
            el: element,
            predicate: predicate,
            vie: appView.vie
          });

        });
        */
      });


      // Instantiate OverlayView
      /* var overlayView = new Drupal.edit.views.OverlayView({
        state: this.state
      }); */

      // Instantiate MenuView
      var editMenuView = new Drupal.edit.views.MenuView({
        state: this.state
      });
    }
  });
})(jQuery);
