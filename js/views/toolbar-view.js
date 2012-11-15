/**
 * @file toolbar-view.js
 *
 * A Backbone View that provides an interactive toolbar (1 per property editor).
 * It listens to state changes of the property editor.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.ToolbarView = Backbone.View.extend({

  entity: null,
  predicate : null,
  editorName: null,
  $editorElement: null,
  actionCallbacks: null,

  _id: null,

  events: {
    'click a.label': 'onClickInfoLabel',
    'mouseleave': 'onMouseLeave',
    'click a.field-save': 'onClickSave',
    'click a.field-close': 'onClickClose'
  },

  /**
   * Implements Backbone Views' initialize() function.
   *
   * @param options
   *   An object with the following keys:
   *   - entity: the VIE entity for the property.
   *   - predicate: the predicate of the property.
   *   - editorName: the editor name: 'form', 'direct' or 'direct-with-wysiwyg'.
   *   - $editorElement: the corresponding PropertyEditor widget.
   *   - actionCallbacks: an object with the following keys:
   *     * save: a callback that should be called when this toolbar's "save"
   *       button is clicked
   *     * close: a callback that should be called when this toolbar's "close"
   *       button is clicked
   */
  initialize: function(options) {
    this.entity = options.entity;
    this.predicate = options.predicate;
    this.editorName = options.editorName;
    this.$editorElement = options.$editorElement;
    this.actionCallbacks = options.actionCallbacks;

    var propertyID = Drupal.edit.util.calcPropertyID(this.entity, this.predicate);

    // Generate a DOM-compatible ID for the toolbar DOM element.
    this._id = 'edit-toolbar-for-' + propertyID.replace(/\//g, '_');

    // @todo get rid of this once https://github.com/bergie/create/issues/133 is solved.
    this.stateChange('inactive', 'candidate');
  },

  /**
   * Listen to editor state changes.
   */
  stateChange: function(from, to) {
    switch (to) {
      case 'inactive':
        // Nothing happens in this stage.
        break;
      case 'candidate':
        if (from !== 'inactive') {
          if (from !== 'highlighted' && this.editorName !== 'form') {
            this._unpad(this.editorName);
          }
          this.remove();
        }
        break;
      case 'highlighted':
        // As soon as we highlight, make sure we have a toolbar in the DOM (with at least a title).
        this.render();
        this.startHighlight();
        break;
      case 'activating':
        if (this.editorName === 'form') {
          this.setLoadingIndicator(true);
        }
        break;
      case 'active':
        this.startEdit(this.editorName);
        this.setLoadingIndicator(false);
        if (this.editorName !== 'form') {
          this._pad(this.editorName);
        }
        if (this.editorName === 'direct-with-wysiwyg') {
          this.insertWYSIWYGToolGroups();
        }
        break;
      case 'changed':
        this.$el
          .find('a.save')
          .addClass('blue-button')
          .removeClass('gray-button');
        break;
      case 'saving':
        this.setLoadingIndicator(true);
        break;
      case 'saved':
        this.setLoadingIndicator(false);
        break;
      case 'invalid':
        this.setLoadingIndicator(false);
        break;
    }
  },

  /**
   * When the user clicks the info label, nothing should happen.
   * @note currently redirects the click.edit-event to the $editorElement.
   *
   * @param event
   */
  onClickInfoLabel: function(event) {
    event.stopPropagation();
    event.preventDefault();
    // Redirects the event to the $editorElement itself.
    this.$editorElement.trigger('click.edit');
  },

  /**
   * A mouseleave to the editor doesn't matter; a mouseleave to something else
   * counts as a mouseleave on the editor itself.
   *
   * @param event
   */
  onMouseLeave: function(event) {
    var el = this.$editorElement[0];
    if (event.relatedTarget != el && !jQuery.contains(el, event.relatedTarget)) {
      this.$editorElement.trigger('mouseleave.edit');
    }
    event.stopPropagation();
  },

  /**
   * Upon clicking "Save", trigger a custom event to save this property.
   *
   * @param event
   */
  onClickSave: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.actionCallbacks.save();
  },

  /**
   * Upon clicking "Close", trigger a custom event to stop editing.
   *
   * @param event
   */
  onClickClose: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.actionCallbacks.close();
  },

  /**
   * Indicate in the 'info' toolgroup that we're waiting for a server reponse.
   *
   * @param bool enabled
   *   Whether the loading indicator should be displayed or not.
   */
  setLoadingIndicator: function(enabled) {
    if (enabled) {
      this.addClass('info', 'loading');
    }
    else {
      // Only stop showing the loading indicator after half a second to prevent
      // it from flashing, which is bad UX.
      var that = this;
      setTimeout(function() {
        that.removeClass('info', 'loading');
      }, 500);
    }
  },

  startHighlight: function() {
    // We get the label to show for this property from VIE's type system.
    var label = this.predicate;
    var attributeDef = this.entity.get('@type').attributes.get(this.predicate);
    if (attributeDef && attributeDef.metadata) {
      label = attributeDef.metadata.label;
    }

    this.$el
      .find('.edit-toolbar:not(:has(.edit-toolgroup.info))')
      // Append the "info" toolgroup into the toolbar.
      .append(Drupal.theme('editToolgroup', {
        classes: 'info',
        buttons: [
          { label: label, classes: 'blank-button label', hasButtonRole: false }
        ]
      }));

    // Animations.
    var that = this;
    setTimeout(function () {
      that.show('info');
    }, 0);
  },

  startEdit: function() {
    this.$el
      .addClass('edit-editing')
      .find('.edit-toolbar:not(:has(.edit-toolgroup.ops))')
      // Append the "ops" toolgroup into the toolbar.
      .append(Drupal.theme('editToolgroup', {
        classes: 'ops',
        buttons: [
          { label: Drupal.t('Save'), classes: 'field-save save gray-button' },
          { label: '<span class="close"></span>', classes: 'field-close close gray-button' }
        ]
      }));
    this.show('ops');
  },

  /**
   * Adjusts the toolbar to accomodate padding on the PropertyEditor widget.
   *
   * @see FieldDecorationView._pad().
   */
  _pad: function(editorName) {
      // The whole toolbar must move to the top when the property's DOM element
      // is displayed inline.
      if (this.$editorElement.css('display') == 'inline') {
        this.$el.css('top', parseFloat(this.$el.css('top')) - 5 + 'px');
      }

      // The toolbar must move to the top and the left.
      var $hf = this.$el.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '6px', left: '-5px' });
      // When using a WYSIWYG editor, the width of the toolbar must match the
      // width of the editable.
      if (editorName === 'direct-with-wysiwyg') {
        $hf.css({ width: this.$editorElement.width() + 10 });
      }
  },

  /**
   * Undoes the changes made by _pad().
   *
   * @see FieldDecorationView._unpad().
   */
  _unpad: function(editorName) {
      // Move the toolbar back to its original position.
      var $hf = this.$el.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '1px', left: '' });
      // When using a WYSIWYG editor, restore the width of the toolbar.
      if (editorName === 'direct-with-wysiwyg') {
        $hf.css({ width: '' });
      }
  },

  insertWYSIWYGToolGroups: function() {
    this.$el
      .find('.edit-toolbar:not(:has(.edit-toolbar-wysiwyg-tabs))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'wysiwyg-tabs',
        buttons: []
      }))
      .end()
      .find('.edit-toolbar:not(:has(.edit-toolgroup.wysiwyg))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'wysiwyg',
        buttons: []
      }));

    // Animate the toolgroups into visibility.
    var that = this;
    setTimeout(function () {
      that.show('wysiwyg-tabs');
      that.show('wysiwyg');
    }, 0);
  },

  /**
   * Renders the Toolbar's markup into the DOM.
   *
   * Note: depending on whether the 'display' property of the $el for which a
   * toolbar is being inserted into the DOM, it will be inserted differently.
   */
  render: function () {
    // Render toolbar.
    this.setElement(jQuery(Drupal.theme('editToolbarContainer', {
      id: this.getId()
    })));

    // Insert in DOM.
    if (this.$el.css('display') == 'inline') {
      this.$el.prependTo(this.$editorElement.offsetParent());
      var pos = this.$editorElement.position();
      this.$el.css('left', pos.left).css('top', pos.top);
    }
    else {
      this.$el.insertBefore(this.$editorElement);
    }

    var that = this;
    // Animate the toolbar into visibility.
    setTimeout(function () {
      that.$el.removeClass('edit-animate-invisible');
    }, 0);
  },

  remove: function () {
    if (!this.$el) {
      return;
    }

    // Remove after animation.
    var that = this;
    var $el = this.$el;
    this.$el
      .addClass('edit-animate-invisible')
      // Prevent this toolbar from being detected *while* it is being removed.
      .removeAttr('id')
      .find('.edit-toolbar .edit-toolgroup')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.util.constants.transitionEnd, function (e) {
        $el.remove();
      });
    // @todo: verify/confirm that this really necessary. Messing with this.$el
    // is not recommended - maybe temporarily unbind/undelegate events?
    // Immediately set to null, so that if the user hovers over the property
    // before the removal been completed, a new toolbar can be created.
    // this.$el = null;
  },

  /**
   * Calculates the ID for this toolbar container.
   *
   * Only used to make sane hovering behavior possible.
   *
   * @return string
   *   A string that can be used as the ID for this toolbar container.
   */
  getId: function() {
    return this._id;
  },

  /**
   * Shows a toolgroup.
   *
   * @param string toolgroup
   *   A toolgroup name.
   */
  show: function (toolgroup) {
    this._find(toolgroup).removeClass('edit-animate-invisible');
  },

  /**
   * Adds classes to a toolgroup.
   *
   * @param string toolgroup
   *   A toolgroup name.
   */
  addClass: function (toolgroup, classes) {
    this._find(toolgroup).addClass(classes);
  },

  /**
   * Removes classes from a toolgroup.
   *
   * @param string toolgroup
   *   A toolgroup name.
   */
  removeClass: function (toolgroup, classes) {
    this._find(toolgroup).removeClass(classes);
  },

  /**
   * Finds a toolgroup.
   *
   * @param string toolgroup
   *   A toolgroup name.
   */
  _find: function (toolgroup) {
    return this.$el.find('.edit-toolbar .edit-toolgroup.' + toolgroup);
  }
});
