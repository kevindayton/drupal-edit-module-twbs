(function ($, VIE) {

Drupal.edit = Drupal.edit || {};
Drupal.edit.wysiwyg = Drupal.edit.wysiwyg || {};

/**
 * Attach toggling behavior and in-place editing.
 */
Drupal.behaviors.edit = {
  attach: function(context) {
    $('#edit_view-edit-toggles').once('edit-init', Drupal.edit.init);
  }
};

Drupal.edit.constants = {};
Drupal.edit.constants.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

Drupal.edit.init = function() {
  // VIE instance for Editing
  Drupal.edit.vie = new VIE();
  // Use our custom DOM parsing service until RDFa is available
  Drupal.edit.vie.use(new Drupal.edit.vie.SparkEditService());
  Drupal.edit.domService = Drupal.edit.vie.service('edit');

  Drupal.edit.state = Drupal.edit.prepareStateModel();

  // Load the storage widget to get localStorage support
  // @todo: doc this.
  //  - Why is it called 'midgardStorage'?
  //  - Why do we need to set editableNs?
  //  - Shouldn't we also set localStorage, autoSave, editSelector, saveSelector?
  //  - How do we integrate Create.js' i18n support with Drupal.t()?
  $('body').midgardStorage({
    vie: Drupal.edit.vie,
    editableNs: 'createeditable'
  });
  // TODO: Check localStorage for unsaved changes
  // $('body').midgardStorage('checkRestore');

  // Initialize WYSIWYG, if any.
  // @todo: Edit should not be aware of any WYSIWYG stuff; Create.js should
  // handle all of that. Otherwise it's a leaky abstraction.
  if (Drupal.settings.edit.wysiwyg) {
    $(document).bind('edit-wysiwyg-ready.edit', function() {
      Drupal.edit.state.set('wysiwygReady', true);
      console.log('edit: WYSIWYG ready');
    });
    Drupal.edit.wysiwyg[Drupal.settings.edit.wysiwyg].init();
  }

  // Create a backstage area. This is where we store the form when editing a
  // type=direct field, so that it's hidden from view (hence "backstage").
  // @todo: this belongs in formwidget.js; don't Create.js' editWidgets have
  // an initialization phase, e.g. to prefetch CSS/JS?
  $(Drupal.theme('editBackstage', {})).appendTo('body');

  // Instantiate FieldViews
  // @todo: isn't this terribly inefficient? This results in one call to
  // readEntities() per field, whereas Drupal fields are currently mapped to VIE
  // entities, suggesting there should be *one* call to readEntities()?
  Drupal.edit.domService.findSubjectElements().each(Drupal.edit.prepareFieldView);

  // Instantiate overlayview
  var overlayView = new Drupal.edit.views.OverlayView({
    state: Drupal.edit.state
  });

  // Transition between view/edit states.
  $("a.edit_view-edit-toggle").bind('click.edit', function(event) {
    event.preventDefault();

    var isViewing = $(this).hasClass('edit-view');
    Drupal.edit.state.set('isViewing', isViewing);

    // swap active class among the two links.
    $('a.edit_view-edit-toggle').removeClass('active');
    $('a.edit_view-edit-toggle').parent().removeClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).addClass('active');
    $('a.edit_view-edit-toggle.edit-' + (isViewing ? 'view' : 'edit')).parent().addClass('active');
  });
};

Drupal.edit.prepareStateModel = function () {
  // The state of Spark Edit is handled in a Backbone model
  Drupal.edit.StateModel = Backbone.Model.extend({
    defaults: {
      isViewing: true,
      entityBeingHighlighted: [],
      fieldBeingHighlighted: [],
      fieldBeingEdited: [],
      highlightedEditable: null,
      editedEditable: null,
      editedFieldView: null,
      wysiwygReady: false
    }
  });

  // We always begin in view mode.
  return new Drupal.edit.StateModel();
};

Drupal.edit.prepareFieldView = function () {
  var element = jQuery(this);
  var fieldViewType = Drupal.edit.views.EditableFieldView;
  if (element.hasClass('edit-type-form')) {
    fieldViewType = Drupal.edit.views.FormEditableFieldView;
  }

  Drupal.edit.vie.load({
    element: element
  }).using('edit').execute().done(function (entities) {
    var subject = Drupal.edit.domService.getElementSubject(element);
    var predicate = Drupal.edit.domService.getElementPredicate(element);
    var entity = entities[0];
    if (!entity) {
      return;
    }

    var fieldView = new fieldViewType({
      state: Drupal.edit.state,
      el: element,
      model: entity,
      predicate: predicate,
      vie: Drupal.edit.vie
    });
  });
};

})(jQuery, VIE);

