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

// Temporary helper function: logging.
Drupal.edit.debug = true;
Drupal.edit.log = function() {
  if (Drupal.edit.debug && window.console) {
    console.log(Array.prototype.slice.call(arguments));
  }
};

// Temporary helper function: (async) confirm dialog.
Drupal.edit.confirm = function(message, options, cb) {
  // @todo: use whatever confirm-dialog implementation we need.
  if (window.confirm(message)) {
    cb(true);
  } else {
    cb(false);
  }
};

Drupal.edit.init = function() {
  // VIE instance for Editing
  Drupal.edit.vie = new VIE();
  // Use our custom DOM parsing service until RDFa is available
  Drupal.edit.vie.use(new Drupal.edit.vie.SparkEditService());
  Drupal.edit.domService = Drupal.edit.vie.service('edit');

  // Instantiate StateModel
  Drupal.edit.state = new Drupal.edit.models.StateModel();

  // Load the storage widget to get localStorage support
  // @todo: doc this.
  //  - Why is it called 'midgardStorage'?
  //  - Why do we need to set editableNs?
  //  - Shouldn't we also set localStorage, autoSave, editSelector, saveSelector?
  //  - How do we integrate Create.js' i18n support with Drupal.t()?
  $('body').createStorage({
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
      Drupal.edit.log('edit: WYSIWYG ready');
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

  // Instantiate OverlayView
  var overlayView = new Drupal.edit.views.OverlayView({
    state: Drupal.edit.state
  });

  // Instantiate MenuView
  var editMenuView = new Drupal.edit.views.MenuView({
    state: Drupal.edit.state
  });

  // Instantiate EditRouter
  var editRouter = new Drupal.edit.routers.EditRouter();
  // Start Backbone's history/route handling
  Backbone.history.start();
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

    // Instantiate FieldViewModel
    var fieldViewModel = new Drupal.edit.models.FieldViewModel({
      'subject': subject,
      'predicate': predicate,
      'entity': entity
    });

    // Instantiate appropriate subtype of FieldView
    var fieldView = new fieldViewType({
      model: fieldViewModel,
      state: Drupal.edit.state,
      el: element,
      predicate: predicate,
      vie: Drupal.edit.vie
    });
  });
};

})(jQuery, VIE);

