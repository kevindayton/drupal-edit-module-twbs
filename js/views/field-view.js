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
  }
});
