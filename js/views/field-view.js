Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};

// ## FieldView
//
// This view wraps a field, and connects it with the state of
// the Spark Edit module. When state changes to `edit`, the view
// decorates the view with the necessary DOM and classes to provide
// the editing tools
Drupal.edit.views.FieldView = Backbone.View.extend({
  predicate: null,
  state: null,
  vie: null,

  editable: false,
  editing: false,

  toolbarView: null,
  decorationView: null,

  events: {
    'mouseenter': 'mouseEnter',
    'mouseleave': 'mouseLeave'
  },

  /* isEditable: currently means: is it "possible" to activate or already active */
  isEditable: function() {
    // i.e. anything but inactive.
    return this.$el.createEditable && this.$el.createEditable('getState') != 'inactive';
  },
  /* isEditing: is active, modified or invalid */
  isEditing: function() {
    var editableState = this.$el.createEditable('getState');
    return (editableState == 'active' || editableState == 'modified' || editableState == 'invalid');
  },
  hasModifications: function() {
    return this.$el.createEditable('getState') == 'modified';
  },

  initialize: function (options) {
    this.state = options.state;
    this.predicate = options.predicate;
    this.vie = options.vie;

    this.decorationView = new Drupal.edit.views.FieldDecorationView({
      model: this.model,
      state: this.state,
      fieldView: this,
      el: this.el
    });

    this.toolbarView = new Drupal.edit.views.ToolbarView({
      fieldView: this,
      model: this.model,
      el: this.el
    });

    var that = this;
    this.$el.bind("createeditablestatechange", function(event, data) {
      // Log all state changes coming from the createEditable.
      console.log('createeditablestatechange', data.previous, data.current, data.instance.getSubjectUri(), that.predicate);
    });
  },


  mouseEnter: function (event) {
    if (!this.isEditable()) {
      return;
    }
    // @todo: this should not be necessary; the overlay should prevent this.
    if (this.state.get('editedFieldView')) {
      // Some field is being edited, ignore
      return;
    }
    var self = this;
    Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
      if (!self.isEditing()) {
        Drupal.edit.log('field:mouseenter', self.model.getVieEntity().id, self.predicate);
        self.$el.createEditable('setState', 'highlighted');
      }
      event.stopPropagation();
    });
  },

  mouseLeave: function (event) {
    if (!this.isEditable()) {
      return;
    }
    if (this.state.get('editedFieldView')) {
      // Some field is being edited, ignore
      return;
    }
    var self = this;
    Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
      if (!self.isEditing()) {
        Drupal.edit.log('field:mouseleave', self.model.getVieEntity().id, self.predicate);
        self.$el.createEditable('setState', 'candidate');
      }
      event.stopPropagation();
    });
  },

  // Below here will all go away.
  // @todo: this should be called by startHighlight(); as soon as a field is
  // highlighted the field's label should appear, which is part of the toolbar.
  enableToolbar: function () {
    this.toolbarView.createToolbar();
  },
  disableToolbar: function() {
    this.toolbarView.removeToolbar();
  },
  getToolbarView: function() {
    return this.toolbarView;
  },
  getToolbarElement: function() {
    return this.getToolbarView().getToolbarElement();
  },
  // This will be refactored to formwidget.js
  showLoadingFormIndicator: function() {}
});
