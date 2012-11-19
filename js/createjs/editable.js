(function (jQuery, undefined) {
  // # Create.js editing widget for Spark
  //
  // This widget inherits from the Create.js editable widget to accommodate
  // for the fact that Spark is using custom data attributes and not RDFa
  // to communicate editable fields.
  jQuery.widget('Drupal.createEditable', jQuery.Midgard.midgardEditable, {
    _create: function () {
      this.vie = this.options.vie;

      this.options.domService = 'edit';
      this.options.predicateSelector = '*'; //'.edit-field.edit-allowed';

      this.options.editors.direct = {
        widget: 'drupalContentEditableWidget',
        options: {}
      };
      this.options.editors['direct-with-wysiwyg'] = {
        widget: 'drupalAlohaWidget',
        options: {}
      };
      this.options.editors.form = {
        widget: 'drupalFormWidget',
        options: {}
      };

      jQuery.Midgard.midgardEditable.prototype._create.call(this);
    },

    _propertyEditorName: function (data) {
      if (Drupal.settings.edit.wysiwyg && jQuery(this.element).hasClass('edit-type-direct')) {
        if (jQuery(this.element).hasClass('edit-type-direct-with-wysiwyg')) {
          return 'direct-with-wysiwyg';
        }
        return 'direct';
      }
      return 'form';
    }
  });
})(jQuery);
