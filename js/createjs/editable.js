/**
 * @file
 * Determines which editor to use based on a class attribute.
 */
(function (jQuery, Drupal, _, drupalSettings) {

"use strict";

  var midgardEditable = jQuery.Midgard.midgardEditable;

  jQuery.widget('Drupal.createEditable', midgardEditable, {
    _create: function() {
      this.vie = this.options.vie;

      this.options.domService = 'edit';
      this.options.predicateSelector = '*'; //'.edit-field.edit-allowed';

      this.options.propertyEditorWidgetsConfiguration = drupalSettings.edit.editors;

      midgardEditable.prototype._create.call(this);
    },

    _propertyEditorName: function(data) {
      // Pick a PropertyEditor widget for a property depending on its metadata.
      var propertyID = Drupal.edit.util.calcPropertyID(data.entity, data.property);
      if (typeof Drupal.edit.metadataCache[propertyID] === 'undefined') {
        return 'direct';
      }
      return Drupal.edit.metadataCache[propertyID].editor;
    },

    /**
     * We allow people to toggle on and off, default function caused JS errors.
     */
    disable: function () {
      _.each(this.options.propertyEditors, function (editable) {
        this.disableEditor({
          widget: this,
          editable: editable,
          entity: this.options.model,
          element: jQuery(editable)
        });
      }, this);

      // This is the only change removed from default function!
      // this.options.propertyEditors = {};


      _.each(this.options.collections, function (collectionWidget) {
        var editableOptions = _.clone(this.options);
        editableOptions.state = 'inactive';
        this.disableCollection({
          widget: this,
          model: this.options.model,
          element: collectionWidget,
          vie: this.vie,
          editableOptions: editableOptions
        });
      }, this);
      this.options.collections = [];

      this._trigger('disable', null, this._params());
    }
  });

})(jQuery, Drupal, _, Drupal.settings);
