/**
 * @file
 * Determines which editor to use based on a class attribute.
 */
(function (jQuery, Drupal, drupalSettings) {

"use strict";

  jQuery.widget('Drupal.createEditable', jQuery.Midgard.midgardEditable, {
    _create: function() {
      this.vie = this.options.vie;

      this.options.domService = 'edit';
      this.options.predicateSelector = '*'; //'.edit-field.edit-allowed';

      this.options.propertyEditorWidgetsConfiguration = drupalSettings.edit.editors;

      jQuery.Midgard.midgardEditable.prototype._create.call(this);
    },

    _propertyEditorName: function(data) {
      // Pick a PropertyEditor widget for a property depending on its metadata.
      var propertyID = Drupal.edit.util.calcPropertyID(data.entity, data.property);
      if (typeof Drupal.edit.metadataCache[propertyID] === 'undefined') {
        return 'direct';
      }
      return Drupal.edit.metadataCache[propertyID].editor;
    }
  });

})(jQuery, Drupal, Drupal.settings);
