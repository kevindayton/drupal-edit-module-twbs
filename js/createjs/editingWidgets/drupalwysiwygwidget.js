/**
 * @file
 * Override of Create.js' default "base" (plain contentEditable) widget.
 */
(function (jQuery, Drupal) {

  "use strict";

  jQuery.widget('Drupal.drupalWysiwygWidget', jQuery.Create.editWidget, {

    /**
     * Implements getEditUISettings() method.
     */
    getEditUISettings: function () {
      return { padding: true, unifiedToolbar: false, fullWidthToolbar: false };
    },

    enable: function () {
      this.element.attr('contentEditable', 'true');
      var settings = {};
      var mainToolbarId = this.toolbarView.getMainWysiwygToolgroupId();
      if (mainToolbarId) {
        var settingsOverride = {
          removePlugins: 'floatingspace,elementspath',
          sharedSpaces: {
            top: mainToolbarId
          }
        };
        settings.extraPlugins += ',' + settingsOverride.extraPlugins;
        settings.removePlugins += ',' + settingsOverride.removePlugins;
        settings.sharedSpaces = settingsOverride.sharedSpaces;
      }

      this.editor = CKEDITOR.inline(this.element.get(0), settings);
      this.options.disabled = false;

      var widget = this;
      this.editor.on('focus blur', function () {
        widget.options.activated();
      });
      this.editor.on('key paste afterCommandExec', function () {
        widget.options.changed(widget.editor.getData());
      });
    },

    disable: function () {
      if (!this.editor) {
        return;
      }
      this.element.attr('contentEditable', 'false');
      this.editor.destroy();
      this.editor = null;
    },

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: POSTPONED_ON(Create.js, https://github.com/bergie/create/issues/142)
     * Get rid of this once that issue is solved.
     */
    _init: function () {},

    /**
     * Implements Create's _initialize() method.
     */
    _initialize: function () {
      var that = this;

      CKEDITOR.disableAutoInline = true;

      // Sets the state to 'activated' upon clicking the element.
      this.element.on("click.edit", function (event) {
        event.stopPropagation();
        event.preventDefault();
        that.options.activated();
      });

      // Sets the state to 'changed' whenever the content has changed.
      var before = jQuery.trim(this.element.text());
      this.element.on('keyup paste', function (event) {
        if (that.options.disabled) {
          return;
        }
        var current = jQuery.trim(that.element.text());
        if (before !== current) {
          before = current;
          that.options.changed(current);
        }
      });
    },

    /**
     * Makes this PropertyEditor widget react to state changes.
     */
    stateChange: function (from, to) {
      switch (to) {
        case 'inactive':
          break;
        case 'candidate':
          if (from !== 'inactive') {
            // Removes the "contenteditable" attribute.
            this.disable();
            this._removeValidationErrors();
            this._cleanUp();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          break;
        case 'active':
          // Sets the "contenteditable" attribute to "true".
          this.enable();
          break;
        case 'changed':
          break;
        case 'saving':
          this._removeValidationErrors();
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    },

    /**
     * Removes validation errors' markup changes, if any.
     *
     * Note: this only needs to happen for type=direct, because for type=direct,
     * the property DOM element itself is modified; this is not the case for
     * type=form.
     */
    _removeValidationErrors: function () {
      this.element
        .removeClass('edit-validation-error')
        .next('.edit-validation-errors').remove();
    },

    /**
     * Cleans up after the widget has been saved.
     *
     * Note: this is where the Create.Storage and accompanying Backbone.sync
     * abstractions "leak" implementation details. That is only the case because
     * we have to use Drupal's Form API as a transport mechanism. It is
     * unfortunately a stateful transport mechanism, and that's why we have to
     * clean it up here. This clean-up is only necessary when canceling the
     * editing of a property after having attempted to save at least once.
     */
    _cleanUp: function () {
      Drupal.edit.util.form.unajaxifySaving(jQuery('#edit_backstage form .edit-form-submit'));
      jQuery('#edit_backstage form').remove();
    }
  });

})(jQuery, Drupal);




/**
 * @file
 * Text editor-based Create.js widget for processed text content in Drupal.
 *
 * Depends on Editor.module. Works with any (WYSIWYG) editor that implements the
 * attachTrueWysiwyg(), detach() and onChange() methods.
 *
(function (jQuery, Drupal, drupalSettings) {

"use strict";

  jQuery.widget('Drupal.drupalWysiwygWidget', jQuery.Create.editWidget, {

    textFormat: null,
    textFormatHasTransformations: null,
    textEditor: null,

    /**
     * Implements getEditUISettings() method.
     *
    getEditUISettings: function() {
      return { padding: true, unifiedToolbar: true, fullWidthToolbar: true };
    },

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: POSTPONED_ON(Create.js, https://github.com/bergie/create/issues/142)
     * Get rid of this once that issue is solved.
     *
    _init: function() {},

    /**
     * Implements Create's _initialize() method.
     *
    _initialize: function() {
      var propertyID = Drupal.edit.util.calcPropertyID(this.options.entity, this.options.property);
      var metadata = Drupal.edit.metadataCache[propertyID].custom;

      this.textFormat = drupalSettings.editor.formats[metadata.format];
      this.textFormatHasTransformations = metadata.formatHasTransformations;
      this.textEditor = Drupal.editors[this.textFormat.editor];

      this._bindEvents();
    },

    /**
     * Binds to events.
     *
    _bindEvents: function() {
      var that = this;

      // Sets the state to 'activated' upon clicking the element.
      this.element.on('click.edit', function(event) {
        event.stopPropagation();
        event.preventDefault();
        that.options.activating();
      });
    },

    /**
     * Makes this PropertyEditor widget react to state changes.
     *
    stateChange: function(from, to) {
      var that = this;
      switch (to) {
        case 'inactive':
          break;
        case 'candidate':
          if (from !== 'inactive') {
            if (from !== 'highlighted') {
              this.element.attr('contentEditable', 'false');
              this.textEditor.detach(this.element.get(0), this.textFormat);
            }

            this._removeValidationErrors();
            this._cleanUp();
            this._bindEvents();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          // When transformation filters have been been applied to the processed
          // text of this field, then we'll need to load a re-rendered version of
          // it without the transformation filters.
          if (this.textFormatHasTransformations) {
            Drupal.edit.util.loadRerenderedProcessedText({
              $editorElement: this.element,
              propertyID: Drupal.edit.util.calcPropertyID(this.options.entity, this.options.property),
              callback: function (rerendered) {
                that.element.html(rerendered);
                that.options.activated();
              }
            });
          }
          // When no transformation filters have been applied: start WYSIWYG
          // editing immediately!
          else {
            this.options.activated();
          }
          break;
        case 'active':
          this.element.attr('contentEditable', 'true');
          this.textEditor.attachTrueWysiwyg(
            this.element.get(0),
            this.textFormat,
            this.toolbarView.getMainWysiwygToolgroupId(),
            this.toolbarView.getFloatedWysiwygToolgroupId()
          );

          // Sets the state to 'changed' whenever the content has changed.
          this.textEditor.onChange(this.element.get(0), function (html) {
            that.options.changed(html);
          });
          break;
        case 'changed':
          break;
        case 'saving':
          this._removeValidationErrors();
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    },

    /**
     * Removes validation errors' markup changes, if any.
     *
     * Note: this only needs to happen for type=direct, because for type=direct,
     * the property DOM element itself is modified; this is not the case for
     * type=form.
     *
    _removeValidationErrors: function() {
      this.element
        .removeClass('edit-validation-error')
        .next('.edit-validation-errors').remove();
    },

    /**
     * Cleans up after the widget has been saved.
     *
     * Note: this is where the Create.Storage and accompanying Backbone.sync
     * abstractions "leak" implementation details. That is only the case because
     * we have to use Drupal's Form API as a transport mechanism. It is
     * unfortunately a stateful transport mechanism, and that's why we have to
     * clean it up here. This clean-up is only necessary when canceling the
     * editing of a property after having attempted to save at least once.
     *
    _cleanUp: function() {
      Drupal.edit.util.form.unajaxifySaving(jQuery('#edit_backstage form .edit-form-submit'));
      jQuery('#edit_backstage form').remove();
    }
  });

})(jQuery, Drupal, Drupal.settings);
*/
