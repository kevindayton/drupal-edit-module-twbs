/**
 * @file fielddecorator-view.js
 *
 * A Backbone View that decorates properties.
 * It listens to state changes of the property editor.
 *
 * @todo  rename to propertydecorator-view.js + PropertyDecorationView.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.FieldDecorationView = Backbone.View.extend({

  entity: null,
  predicate : null,
  editorName: null,

  _widthAttributeIsEmpty: null,

  /**
   * Implements Backbone Views' initialize() function.
   *
   * @param options
   *   An object with the following keys:
   *   - entity: the VIE entity for the property.
   *   - predicate: the predicate of the property.
   *   - editorName: the editor name: 'form', 'direct' or 'direct-with-wysiwyg'.
   *   - toolbarHovering: an object with the following keys:
   *     * toolbarId: the ID attribute of the toolbar as rendered in the DOM.
   *     * editableEntity: the EditableEntity widget object for the property
   */
  initialize: function(options) {
    this.entity = options.entity;
    this.predicate = options.predicate;
    this.editorName = options.editorName;

    var hovering = options.toolbarHovering;
    var that = this;
    this.$el
      .css('background-color', this._getBgColor(this.$el))
      // Start hover: transition to 'highlight' state.
      .bind('mouseenter.edit', function(event) {
        that._ignoreHoveringVia(event, '#' + hovering.toolbarId, function () {
          hovering.editableEntity.setState('highlighted', that.predicate);
          event.stopPropagation();
        });
      })
      // Stop hover: back to 'candidate' state.
      .bind('mouseleave.edit', function(event) {
        that._ignoreHoveringVia(event, '#' + hovering.toolbarId, function () {
          hovering.editableEntity.setState('candidate', that.predicate, { reason: 'mouseleave' });
          event.stopPropagation();
        });
      });
  },

  /**
   * Listens to editor state changes.
   */
  stateChange: function(from, to) {
    switch (to) {
      case 'inactive':
        if (from !== null) {
          this.undecorate();
        }
        break;
      case 'candidate':
        this.decorate();
        if (from !== 'inactive') {
          this.stopHighlight();
          if (from !== 'highlighted') {
            this.stopEdit(this.editorName);
          }
        }
        break;
      case 'highlighted':
        this.startHighlight();
        break;
      case 'activating':
        // NOTE: this step only exists for the 'form' editor! It is skipped by
        // the 'direct' and 'direct-with-wysiwyg' editors, because no loading is
        // necessary.
        this.prepareEdit(this.editorName);
        break;
      case 'active':
        if (this.editorName !== 'form') {
          this.prepareEdit(this.editorName);
        }
        this.startEdit(this.editorName);
        break;
      case 'changed':
        break;
      case 'saving':
        break;
      case 'saved':
        break;
      case 'invalid':
        break;
    }
  },
  // refactored from field-view.js:
  decorate: function () {
    this.$el.addClass('edit-animate-fast edit-candidate edit-editable');
  },

  undecorate: function () {
    this.$el
      .removeClass('edit-candidate edit-editable edit-highlighted edit-editing edit-belowoverlay');
  },

  startHighlight: function () {
    // Animations.
    var that = this;
    setTimeout(function() {
      that.$el.addClass('edit-highlighted');
    }, 0);
  },

  stopHighlight: function() {
    this.$el
      .removeClass('edit-highlighted');
  },

  prepareEdit: function(editorName) {
    this.$el.addClass('edit-editing');
    if (editorName === 'form') {
      this.$el.addClass('edit-belowoverlay');
    }
  },

  startEdit: function(editorName) {
    if (editorName !== 'form') {
      this._pad();
    }
  },

  stopEdit: function(editorName) {
    this.$el.removeClass('edit-highlighted edit-editing');

    if (editorName === 'form') {
      this.$el.removeClass('edit-belowoverlay');
    }
    else {
      this._unpad();
    }
  },

  _pad: function () {
    var self = this;

    // Add 5px padding for readability. This means we'll freeze the current
    // width and *then* add 5px padding, hence ensuring the padding is added "on
    // the outside".
    // 1) Freeze the width (if it's not already set); don't use animations.
    if (this.$el[0].style.width === "") {
      this._widthAttributeIsEmpty = true;
      this.$el
        .addClass('edit-animate-disable-width')
        .css('width', this.$el.width());
    }

    // 2) Add padding; use animations.
    var posProp = this._getPositionProperties(this.$el);
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

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

  _unpad: function () {
    var self = this;

    // 1) Set the empty width again.
    if (this._widthAttributeIsEmpty) {
      this.$el
        .addClass('edit-animate-disable-width')
        .css('width', '');
    }

    // 2) Remove padding; use animations (these will run simultaneously with)
    // the fading out of the toolbar as its gets removed).
    var posProp = this._getPositionProperties(this.$el);
    setTimeout(function() {
      // Re-enable width animations (padding changes affect width too!).
      self.$el.removeClass('edit-animate-disable-width');

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
  },

  /**
   * Gets the background color of an element (or the inherited one).
   *
   * @param $e
   *   A DOM element.
   */
  _getBgColor: function($e) {
    var c;

    if ($e === null || $e[0].nodeName == 'HTML') {
      // Fallback to white.
      return 'rgb(255, 255, 255)';
    }
    c = $e.css('background-color');
    // TRICKY: edge case for Firefox' "transparent" here; this is a
    // browser bug: https://bugzilla.mozilla.org/show_bug.cgi?id=635724
    if (c == 'rgba(0, 0, 0, 0)' || c == 'transparent') {
      return this._getBgColor($e.parent());
    }
    return c;
  },

  /**
   * Gets the top and left properties of an element and convert extraneous
   * values and information into numbers ready for subtraction.
   *
   * @param $e
   *   A DOM element.
   */
  _getPositionProperties: function($e) {
    var p,
        r = {},
        props = [
          'top', 'left', 'bottom', 'right',
          'padding-top', 'padding-left', 'padding-right', 'padding-bottom',
          'margin-bottom'
        ];

    for (var i = 0; i < props.length; i++) {
      p = props[i];
      r[p] = parseFloat(this._replaceBlankPosition($e.css(p)));
    }
    return r;
  },

  /**
   * Replaces blank or 'auto' CSS "position: <value>" values with "0px".
   *
   * @param pos
   *   The value for a CSS position declaration.
   */
  _replaceBlankPosition: function(pos) {
    // @todo: this was pos == NaN (which always returns false, keeping this
    // comment in case we find a regression.
    if (pos == 'auto' || !pos) {
      pos = '0px';
    }
    return pos;
  },

  /**
   * Ignores hovering to/from the given closest element, but as soon as a hover
   * occurs to/from *another* element, then call the given callback.
   */
  _ignoreHoveringVia: function(event, closest, callback) {
    if (jQuery(event.relatedTarget).closest(closest).length > 0) {
      event.stopPropagation();
    }
    else {
      callback();
    }
  }
});
