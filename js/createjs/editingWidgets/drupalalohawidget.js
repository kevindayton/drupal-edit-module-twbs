(function (jQuery, undefined) {
  // Consistent namespace.
  jQuery.widget('Drupal.drupalAlohaWidget', jQuery.Create.alohaWidget, {
    /**
     * Implements jQuery UI widget factory.
     */
    _init: function() {
      var widget = this;
      Drupal.aloha.init(function() {
        // Let Create's Aloha widget do the rest.
        jQuery.Create.editWidget.prototype._init.call(widget);
      });
    },
    _initialize: function() {
    },
  });
})(jQuery);
