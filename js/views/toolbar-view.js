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
  $editableElementForStateChanges: null,
  $editorElement: null,
  events: {
    // @todo: verify if we want the {EVENT}.edit namespace here.
    'click a.label': 'onClickInfoLabel',
    'mouseleave': 'onMouseLeave',
    'click a.field-save': 'onClickSave',
    'click a.field-close': 'onClickClose'
  },
  // Event handlers
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
  onMouseLeave: function(e) {
    var el = this.$el[0];
    if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
      this.$el.trigger('mouseleave.edit');
    }
    e.stopPropagation();
  },
  /**
   * Upon clicking "Save", trigger a custom event to save this property.
   *
   * @param event
   */
  onClickSave: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.$editorElement.trigger('editsave.edit', { originalEvent: event });
  },
  /**
   * Upon clicking "Cancel", trigger a custom event to cancel editing.
   *
   * @param event
   */
  onClickClose: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.$editorElement.trigger('editcancel.edit', { originalEvent: event });
  },

  initialize:function (options) {
    this.predicate = options.predicate;
    this.entity = options.entity;
    this.$editableElementForStateChanges = options.$editableElementForStateChanges;
    this.$editorElement = options.$editorElement;
    // Generate a DOM-compatible ID for the toolbar DOM-element.
    var propertyId = this.entity.getSubjectUri() + '-' + this.predicate;
    this.id = 'edit-toolbar-for-' + propertyId.replace(/\//g, '-');

    var that = this;
    // @todo get rid of this once https://github.com/bergie/create/issues/133 is solved
    // bind to the editable state changes.
    this.$editableElementForStateChanges.bind('createeditablestatechange', function(event, data) {
      that.stateChange(data.previous, data.current);
    });
  },

  stateChange: function(from, to) {
    // @todo: get rid of this; rely on editor info instead.
    var type = this.$editableElementForStateChanges.hasClass('edit-type-form') ? 'form' : (this.$editableElementForStateChanges.hasClass('edit-type-direct-with-wysiwyg') ? 'direct-with-wysiwyg' : 'direct');
    switch (to) {
      case 'inactive':
        // Nothing happens in this stage.
        break;
      case 'candidate':
        if (from !== 'inactive') {
          if (from !== 'highlighted' && type !== 'form') {
            this._unpad(type);
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
        if (type === 'form') {
          // Indicate in the 'info' toolgroup that the form is loading. Animated.
          this.addClass('info', 'loading');
        }
        break;
      case 'active':
        this.startEdit(type);
        if (type !== 'form') {
          this._pad(type);
        }
        if (type === 'direct-with-wysiwyg') {
          this.insertWYSIWYGToolGroups();
        }
        break;
      case 'changed':
        this.$el
          .find('a.save')
          .addClass('blue-button')
          .removeClass('gray-button');
        break;
      // @todo: set this state in EditAppView.
      case 'saving':
        // Indicate in the 'info' toolgroup that the form is being saved. Animated.
        this.addClass('info', 'loading');
        break;
      // @todo: set this state in EditAppView.
      case 'saved':
        break;
      // @todo: set this state in EditAppView.
      case 'invalid':
        break;
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
    var that = this;
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
      // Indicate in the 'info' toolgroup that the form has loaded, but only
      // do it after half a second to prevent it from flashing, which is bad
      // UX.
      setTimeout(function() {
        that.removeClass('info', 'loading');
      }, 500);
      this.show('ops');
  },

  /**
   * Adjusts the toolbar to accomodate padding on the PropertyEditor widget.
   *
   * @see FieldDecorationView._pad().
   */
  _pad: function(type) {
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
      if (type === 'direct-with-wysiwyg') {
        $hf.css({ width: this.$editorElement.width() + 10 });
      }
  },

  /**
   * Undoes the changes made by _pad().
   *
   * @see FieldDecorationView._unpad().
   */
  _unpad: function(type) {
      // Move the toolbar back to its original position.
      var $hf = this.$el.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '1px', left: '' });
      // When using a WYSIWYG editor, restore the width of the toolbar.
      if (type === 'direct-with-wysiwyg') {
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
      .bind(Drupal.edit.constants.transitionEnd, function (e) {
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
    return this.id;
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
