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
        var element = $(this);
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
      });


      // Instantiate OverlayView
      var overlayView = new Drupal.edit.views.OverlayView({
        state: this.state
      });

      // Instantiate MenuView
      var editMenuView = new Drupal.edit.views.MenuView({
        state: this.state
      });
    }
  });
})(jQuery);
