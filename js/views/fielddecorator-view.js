Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};

Drupal.edit.views.FieldDecorationView = Backbone.View.extend({

  $editableElementForStateChanges: null,

  initialize: function(options) {
    this.state = options.state;
    this.predicate = options.predicate;
    this.entity = options.entity;
    this.$editableElementForStateChanges = options.$editableElementForStateChanges;
    _.bindAll(this, 'createEditableStateChange');
    // @todo get rid of this once https://github.com/bergie/create/issues/133 is solved
    // bind to the editable changes
    this.$editableElementForStateChanges.bind('createeditablestatechange', this.createEditableStateChange);
  },
  // changes to individual *FieldViewModel*
  createEditableStateChange: function(event, data) {
    // @todo: take previous value into consideration
    var previousState = data.previous;
    var state = data.current;

    switch (state) {
      case 'inactive':
        this.undecorate();
        break;
      case 'candidate':
        this.decorate();
        this.stopHighlight();
        if (previousState == 'active') {
          this.unpadEditable();
        }

        // Refactored from disableEditor().
        this.$el
          .removeClass('edit-editing')
          .css('background-color', '');

        break;
      case 'highlighted':
        this.startHighlight();
        break;
      case 'activating':
        console.log('activating');
        break;
      case 'active':
        // make sure we're highlighted, this should not be necessary.
        this.startHighlight();
        this.padEditable();

        // Refactored from enableEditor().
        // @todo: 'edit-candidate' class should be removed at this point in time;
        // it is now no longer a candidate for being edited; it's *actually*
        // being edited!
        this.$el
          .addClass('edit-editing')
          .css('background-color', this.$el.data('edit-background-color'));

        break;
    }
  },
  // refactored from field-view.js:
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

  startHighlight: function () {
    Drupal.edit.log('startHighlight', this.entity.id, this.predicate);
    this.state.set('fieldBeingHighlighted', this.$el);
    this.state.set('highlightedEditable', this.entity.id + '/' + this.predicate);
  },

  stopHighlight: function () {
    Drupal.edit.log('stopHighlight', this.entity, this.entity.id, this.predicate);
    // Animations
    this.$el.removeClass('edit-highlighted');
    this.state.set('fieldBeingHighlighted', []);
    this.state.set('highlightedEditable', null);
  },


  padEditable: function () {
    // temporarily disable padding. because we manipulate the toolbar which we shouldnt do here.
    return;
    var self = this;
    // Add 5px padding for readability. This means we'll freeze the current
    // width and *then* add 5px padding, hence ensuring the padding is added "on
    // the outside".
    // 1) Freeze the width (if it's not already set); don't use animations.
    if (this.$el[0].style.width === "") {
      this.$el
      .data('edit-width-empty', true)
      .addClass('edit-animate-disable-width')
      .css('width', this.$el.width());
    }

    // 2) Add padding; use animations.
    var posProp = Drupal.edit.util.getPositionProperties(this.$el);
    var $toolbar = this.fieldView.getToolbarElement();
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

      // The whole toolbar must move to the top when it's an inline editable.
      if (self.$el.css('display') == 'inline') {
        $toolbar.css('top', parseFloat($toolbar.css('top')) - 5 + 'px');
      }

      // @todo: adjust this according to the new
      // Drupal.theme.prototype.editToolbarContainer
      // The toolbar must move to the top and the left.
      var $hf = $toolbar.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '6px', left: '-5px' });
      // When using a WYSIWYG editor, the width of the toolbar must match the
      // width of the editable.
      if (self.$el.hasClass('edit-type-direct-with-wysiwyg')) {
        $hf.css({ width: self.$el.width() + 10 });
      }

      // Pad the editable.
      self.$el
      .css({
        'position': 'relative',
        'top':  posProp.top  - 5 + 'px',
        'left': posProp.left - 5 + 'px',
        'padding-top'   : posProp['padding-top']    + 5 + 'px',
        'padding-left'  : posProp['padding-left']   + 5 + 'px',
        'padding-right' : posProp['padding-right']  + 5 + 'px',
        'padding-bottom': posProp['padding-bottom'] + 5 + 'px',
        'margin-bottom':  posProp['margin-bottom'] - 10 + 'px'
      });
    }, 0);
  },
  unpadEditable: function () {
    // temporarily disable padding. because we manipulate the toolbar which we shouldnt do here.
    return ;
    var self = this;

    // 1) Set the empty width again.
    if (this.$el.data('edit-width-empty') === true) {
      Drupal.edit.log('restoring width');
      this.$el
      .addClass('edit-animate-disable-width')
      .css('width', '');
    }

    // 2) Remove padding; use animations (these will run simultaneously with)
    // the fading out of the toolbar as its gets removed).
    var posProp = Drupal.edit.util.getPositionProperties(this.$el);
    var $toolbar = this.fieldView.getToolbarElement();

    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

      // Move the toolbar back to its original position.
      var $hf = $toolbar.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '1px', left: '' });
      // When using a WYSIWYG editor, restore the width of the toolbar.
      if (self.$el.hasClass('edit-type-direct-with-wysiwyg')) {
        $hf.css({ width: '' });
      }
      // Undo our changes to the clipping (to prevent the bottom box-shadow).
      $toolbar
      .undelegate('.edit-toolbar', Drupal.edit.constants.transitionEnd)
      .find('.edit-toolbar').css('clip', '');

      // Unpad the editable.
      self.$el
      .css({
        'position': 'relative',
        'top':  posProp.top  + 5 + 'px',
        'left': posProp.left + 5 + 'px',
        'padding-top'   : posProp['padding-top']    - 5 + 'px',
        'padding-left'  : posProp['padding-left']   - 5 + 'px',
        'padding-right' : posProp['padding-right']  - 5 + 'px',
        'padding-bottom': posProp['padding-bottom'] - 5 + 'px',
        'margin-bottom': posProp['margin-bottom'] + 10 + 'px'
      });
    }, 0);
  }
});
