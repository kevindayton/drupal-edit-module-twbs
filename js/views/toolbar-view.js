/**
 * @file
 * A Backbone View that provides an interactive toolbar (1 per property editor).
 *
 * It listens to state changes of the property editor. It also triggers state
 * changes in response to user interactions with the toolbar, including saving.
 */
(function ($, _, Backbone, Drupal) {

"use strict";

Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.ToolbarView = Backbone.View.extend({

  editor: null,
  $storageWidgetEl: null,

  entity: null,
  predicate : null,
  editorName: null,

  _id: null,

  events: {
    'click.edit a.label': 'onClickInfoLabel',
    'mouseleave.edit': 'onMouseLeave',
    'click.edit a.field-save': 'onClickSave',
    'click.edit a.field-close': 'onClickClose'
  },

  /**
   * Implements Backbone Views' initialize() function.
   *
   * @param options
   *   An object with the following keys:
   *   - editor: the editor object with an 'options' object that has these keys:
   *      * entity: the VIE entity for the property.
   *      * property: the predicate of the property.
   *      * editorName: the editor name: 'form', 'direct' or
   *        'direct-with-wysiwyg'.
   *      * element: the jQuery-wrapped editor DOM element
   *   - $storageWidgetEl: the DOM element on which the Create Storage widget is
   *     initialized.
   */
  initialize: function(options) {
    this.editor = options.editor;
    this.$storageWidgetEl = options.$storageWidgetEl;

    this.entity = this.editor.options.entity;
    this.predicate = this.editor.options.property;
    this.editorName = this.editor.options.editorName;

    // Generate a DOM-compatible ID for the toolbar DOM element.
    var propertyID = Drupal.edit.util.calcPropertyID(this.entity, this.predicate);
    this._id = 'edit-toolbar-for-' + propertyID.replace(/\//g, '_');
  },

  /**
   * Listens to editor state changes.
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
        this.setLoadingIndicator(true);
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
        this.save();
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
   * Saves a property.
   *
   * This method deals with the complexity of the editor-dependent ways of
   * inserting updated content and showing validation error messages.
   *
   * One might argue that this does not belong in a view. However, there is no
   * actual "save" logic here, that lives in Backbone.sync. This is just some
   * glue code, along with the logic for inserting updated content as well as
   * showing validation error messages, the latter of which is certainly okay.
   */
  save: function() {
    var that = this;
    var editor = this.editor;
    var editableEntity = editor.options.widget;
    var entity = editor.options.entity;
    var predicate = editor.options.property;

    // Use Create.js' Storage widget to handle saving. (Uses Backbone.sync.)
    this.$storageWidgetEl.createStorage('saveRemote', entity, {
      editor: editor,

      // Successfully saved without validation errors.
      success: function (model) {
        editableEntity.setState('saved', predicate);

        // Replace the old content with the new content.
        var updatedField = entity.get(predicate + '/rendered');
        var $inner = $(updatedField).html();
        editor.element.html($inner);

        // @todo BLOCKED_ON(VIE.js, how to let VIE know that some content was removed and how to scan new content for VIE entities, to make them editable?)
        // Also see Drupal.behaviors.editDiscoverEditables.
        // VIE doesn't seem to like this? :) It seems that if I delete/
        // overwrite an existing field, that VIE refuses to find the same
        // predicate again for the same entity?
        // self.$el.replaceWith(updatedField);
        // debugger;
        // console.log(self.$el, self.el, Drupal.edit.domService.findSubjectElements(self.$el));
        // Drupal.edit.domService.findSubjectElements(self.$el).each(Drupal.edit.prepareFieldView);

        editableEntity.setState('candidate', predicate);
      },

      // Save attempted but failed due to validation errors.
      error: function (validationErrorMessages) {
        editableEntity.setState('invalid', predicate);

        if (that.editorName === 'form') {
          editor.$formContainer
            .find('.edit-form')
            .addClass('edit-validation-error')
            .find('form')
            .prepend(validationErrorMessages);
        }
        else {
          var $errors = $('<div class="edit-validation-errors"></div>')
            .append(validationErrorMessages);
          editor.element
            .addClass('edit-validation-error')
            .after($errors);
        }
      }
    });
  },

  /**
   * When the user clicks the info label, nothing should happen.
   * @note currently redirects the click.edit-event to the editor DOM element.
   *
   * @param event
   */
  onClickInfoLabel: function(event) {
    event.stopPropagation();
    event.preventDefault();
    // Redirects the event to the editor DOM element.
    this.editor.element.trigger('click.edit');
  },

  /**
   * A mouseleave to the editor doesn't matter; a mouseleave to something else
   * counts as a mouseleave on the editor itself.
   *
   * @param event
   */
  onMouseLeave: function(event) {
    var el = this.editor.element[0];
    if (event.relatedTarget != el && !$.contains(el, event.relatedTarget)) {
      this.editor.element.trigger('mouseleave.edit');
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
    this.editor.options.widget.setState('saving', this.predicate);
  },

  /**
   * Upon clicking "Close", trigger a custom event to stop editing.
   *
   * @param event
   */
  onClickClose: function(event) {
    event.stopPropagation();
    event.preventDefault();
    this.editor.options.widget.setState('candidate', this.predicate, { reason: 'cancel' });
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
      .find('.edit-toolbar')
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
      .find('.edit-toolbar')
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
      if (this.editor.element.css('display') === 'inline') {
        this.$el.css('top', parseInt(this.$el.css('top'), 10) - 5 + 'px');
      }

      // The toolbar must move to the top and the left.
      var $hf = this.$el.find('.edit-toolbar-heightfaker');
      $hf.css({ bottom: '6px', left: '-5px' });
      // When using a WYSIWYG editor, the width of the toolbar must match the
      // width of the editable.
      if (editorName === 'direct-with-wysiwyg') {
        $hf.css({ width: this.editor.element.width() + 10 });
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
      .find('.edit-toolbar')
      .append(Drupal.theme('editToolgroup', {
        classes: 'wysiwyg-tabs',
        buttons: []
      }))
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
    this.setElement($(Drupal.theme('editToolbarContainer', {
      id: this.getId()
    })));

    // Insert in DOM.
    if (this.$el.css('display') === 'inline') {
      this.$el.prependTo(this.editor.element.offsetParent());
      var pos = this.editor.element.position();
      this.$el.css('left', pos.left).css('top', pos.top);
    }
    else {
      this.$el.insertBefore(this.editor.element);
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

})(jQuery, _, Backbone, Drupal);
