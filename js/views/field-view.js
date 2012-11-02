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
  // @todo: remove isDirty and setDirty.
  isDirty: function() {
    return this.model.hasModifications();
  },
  setDirty: function(value) {
    if (value) {
      return this.model.set('state', this.model.STATE_MODIFIED);
    } else {
      return this.model.set('state', this.model.STATE_CANDIDATE);
    }
  },

  initialize: function (options) {
    this.state = options.state;
    this.predicate = options.predicate;
    this.vie = options.vie;

    _.bindAll(this, 'stateChange', 'mouseEnter', 'mouseLeave');

    this.state.on('change:isViewing', this.stateChange);
    this.bindEditableEvents();
    this.decorationView = new Drupal.edit.views.FieldDecorationView({
      model: this.model,
      state: this.state,
      fieldView: this,
      el: this.el
    });
  },
  bindEditableEvents: function() {
    // @note: these are "createeditabledisable" rather than "midgardeditabledisable"
    // because we are subclassing it in
    // createjs' editable event mapping
    var editableEventsMapping = {
      'createeditabledisable': this.model.STATE_INACTIVE,
      'createeditableenable': this.model.STATE_CANDIDATE,
      // @todo highlight event not implemented yet!
      'createeditablehighlight': this.model.STATE_HIGHLIGHTED,
      'createeditableactivated': this.model.STATE_ACTIVE,
      // @note: on leaving the active state, we go back to being a candidate.
      'createeditabledeactivated': this.model.STATE_CANDIDATE,
      'createeditablechanged': this.model.STATE_MODIFIED
      // @todo validation event not implemented yet!
    };
    _.each(editableEventsMapping, function(value, key, list) {
      var that = this;
      this.$el.bind(key, function(e, data) {
        that.model.set('state', value);
      });
    }, this);
  },
  unbindEditableEvents: function() {
    // @todo - when removing this view unbindEditable Events.
  },

  isEditing: function() {
    // it is "editing", if it is STATE_ACTIVE, STATE_MODIFIED, STATE_INVALID
    return this.model.get('state') >= this.model.STATE_ACTIVE;
  },

  mouseEnter: function (event) {
    if (!this.model.isEditable()) {
      return;
    }
    // @todo: this should not be necessary; the overlay should prevent this.
    if (this.state.get('editedFieldView')) {
      // Some field is being edited, ignore
      return;
    }
    var self = this;
    Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
      if (!self.model.isEditing()) {
        Drupal.edit.log('field:mouseenter', self.model.getVieEntity().id, self.predicate);
        self.model.set('state', self.model.STATE_HIGHLIGHTED);
      }
      event.stopPropagation();
    });
  },

  mouseLeave: function (event) {
    if (!this.model.isEditable()) {
      return;
    }
    if (this.state.get('editedFieldView')) {
      // Some field is being edited, ignore
      return;
    }
    var self = this;
    Drupal.edit.util.ignoreHoveringVia(event, '.edit-toolbar-container', function () {
      if (!self.model.isEditing()) {
        Drupal.edit.log('field:mouseleave', self.model.getVieEntity().id, self.predicate);
        self.model.set('state', self.model.STATE_CANDIDATE);
      }
      event.stopPropagation();
    });
  },

  // Below here we still need to refactor, ToolbarView needs to bind to
  // FieldViewModel.
  // @todo: this should be called by startHighlight(); as soon as a field is
  // highlighted the field's label should appear, which is part of the toolbar.
  enableToolbar: function () {
    if (!this.toolbarView) {
      this.toolbarView = new Drupal.edit.views.ToolbarView({
        fieldView: this,
        model: this.model
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
