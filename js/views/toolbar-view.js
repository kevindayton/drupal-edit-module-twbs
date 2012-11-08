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

  /**
   * The toolbar container, when it exists.
   */
  $toolbar: null,

  initialize:function (options) {
    this.predicate = options.predicate;
    this.entity = options.entity;
    this.$editableElementForStateChanges = options.$editableElementForStateChanges;

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
          this.remove();
        }
        break;
      case 'highlighted':
        // As soon as we highlight, make sure we have a toolbar in the DOM (with at least a title).
        this.insert();
        this.startHighlight();
        break;
      case 'activating':
        if (type === 'form') {
          // Indicate in the 'info' toolgroup that the form is loading. Animated.
          this.addClass('info', 'loading');
        }
        break;
      case 'active':
        this.startEdit();
        if (type === 'direct-with-wysiwyg') {
          this.insertWYSIWYGToolGroups();
        }
        break;
      case 'changed':
        this.$toolbar
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

    this.$toolbar
      .find('.edit-toolbar:not(:has(.edit-toolgroup.info))')
      // Append the "info" toolgroup into the toolbar.
      .append(Drupal.theme('editToolgroup', {
        classes: 'info',
        buttons: [
          { label: label, classes: 'blank-button label', hasButtonRole: false }
        ]
      }))
      // When the user clicks the info label, nothing should happen.
      .delegate('a.label', 'click.edit', function (event) {
        that.$el.trigger('click.edit');
        event.stopPropagation();
        event.preventDefault();
      });

    // Animations.
    var that = this;
    setTimeout(function () {
      that.show('info');
    }, 0);
  },

  startEdit: function() {
    var that = this;
    this.$toolbar
      .addClass('edit-editing')
      .find('.edit-toolbar:not(:has(.edit-toolgroup.ops))')
      // Append the "ops" toolgroup into the toolbar.
      .append(Drupal.theme('editToolgroup', {
        classes: 'ops',
        buttons: [
          { label: Drupal.t('Save'), classes: 'field-save save gray-button' },
          { label: '<span class="close"></span>', classes: 'field-close close gray-button' }
        ]
      }))
      // Upon clicking "Save", trigger a custom event to save this property.
      .delegate('a.field-save', 'click.edit', function (event) {
        event.stopPropagation();
        event.preventDefault();
        that.$el.trigger('editsave.edit', { originalEvent: event });
      })
      // Upon clicking "Cancel", trigger a custom event to cancel editing.
      .delegate('a.field-close', 'click.edit', function (event) {
        event.stopPropagation();
        event.preventDefault();
        that.$el.trigger('editcancel.edit', { originalEvent: event });
      });

      // Indicate in the 'info' toolgroup that the form has loaded, but only
      // do it after half a second to prevent it from flashing, which is bad
      // UX.
      setTimeout(function() {
        that.removeClass('info', 'loading');
      }, 500);
      this.show('ops');
  },

  insertWYSIWYGToolGroups: function() {
    this.$toolbar
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
   * Inserts the Toolbar's mark-up into the DOM.
   *
   * Note: depending on whether the 'display' property of the $el for which a
   * toolbar is being inserted into the DOM, it will be inserted differently.
   */
  insert: function () {
    var that = this;

    // Render toolbar.
    this.$toolbar = jQuery(Drupal.theme('editToolbarContainer', {
      id: this.id()
    }));

    // Insert in DOM.
    if (this.$el.css('display') == 'inline') {
      this.$toolbar.prependTo(this.$el.offsetParent());
      var pos = this.$el.position();
      this.$toolbar.css('left', pos.left).css('top', pos.top);
    }
    else {
      this.$toolbar.insertBefore(this.$el);
    }

    // Animate the toolbar into visibility.
    setTimeout(function () {
      that.$toolbar.removeClass('edit-animate-invisible');
    }, 0);

    this.$toolbar
      // A mouseleave to the editor doesn't matter; a mouseleave to something
      // else counts as a mouseleave on the editor itself.
      .bind('mouseleave.edit', function (e) {
        var el = that.$el[0];
        if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
          that.$el.trigger('mouseleave.edit');
        }
        e.stopPropagation();
      });
  },

  remove: function () {
    if (!this.$toolbar) {
      return;
    }

    // Remove after animation.
    var that = this;
    var $toolbar = this.$toolbar;
    this.$toolbar
      .addClass('edit-animate-invisible')
      // Prevent this toolbar from being detected *while* it is being removed.
      .removeAttr('id')
      .find('.edit-toolbar .edit-toolgroup')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.constants.transitionEnd, function (e) {
        $toolbar.remove();
      });
    // Immediately set to null, so that if the user hovers over the property
    // before the removal been completed, a new toolbar can be created.
    this.$toolbar = null;
  },

  /**
   * Calculates the ID for this toolbar container.
   *
   * Only used to make sane hovering behavior possible.
   *
   * @return string
   *   A string that can be used as the ID for this toolbar container.
   */
  id: function() {
    var propertyID = this.entity.getSubjectUri() + '-' + this.predicate;
    return 'edit-toolbar-for-' + propertyID.replace(/\//g, '-');
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
    return this.$toolbar.find('.edit-toolbar .edit-toolgroup.' + toolgroup);
  }
});
