/**
 * @file
 * Override of Create.js' default "base" (plain contentEditable) widget.
 */
(function (jQuery, Drupal) {

  "use strict";

  // This value needs to be set before ckeditor.js is loaded.
  window.CKEDITOR_BASEPATH = Drupal.settings.ckeditor.basePath;

  jQuery.widget('Drupal.drupalCKEditorWidget', jQuery.Create.editWidget, {

    /**
     * Implements getEditUISettings() method.
     */
    getEditUISettings: function () {
      return { padding: true, unifiedToolbar: true, fullWidthToolbar: true };
    },

    enable: function () {
      var that = this;
      this.element.attr('contentEditable', 'true');

      var propertyID = Drupal.edit.util.calcPropertyID(this.options.entity, this.options.property);
      var metadata = Drupal.edit.metadataCache[propertyID].custom;
      var settings = metadata.ckeditor;

      if (settings.loadPlugins) {
        for (var pluginName in settings.loadPlugins) {
          if (settings.loadPlugins.hasOwnProperty(pluginName)) {
            CKEDITOR.plugins.addExternal(pluginName,  settings.loadPlugins[pluginName].path, settings.loadPlugins[pluginName].file);
          }
        }
      }

      var mainToolbarId = this.toolbarView.getMainWysiwygToolgroupId();
      if (mainToolbarId) {
        var settingsOverride = {
          extraPlugins: 'sharedspace,onchange',
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

      function updateData () {
        that.options.changed(that.editor.getData());
      }

      this.editor.on('focus', that.options.activated);
      this.editor.on('blur', that.options.activated);
      this.editor.on('change', updateData);
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
      this.element.on('click.edit', that.options.activated);
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
