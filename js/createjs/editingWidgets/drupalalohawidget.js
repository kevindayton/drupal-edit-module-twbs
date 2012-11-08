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

    /**
     * Makes this PropertyEditor widget react to state changes.
     *
     * @todo revisit this once https://github.com/bergie/create/issues/133 is
     * solved.
     */
    stateChange: function(from, to) {
      switch (to) {
        case 'inactive':
          break;
        case 'candidate':
          // if (from !== 'inactive') {
          //   this.disable();
          // }
          break;
        case 'highlighted':
          break;
        case 'activating':
          break;
        case 'active':
          // this.enable();
          break;
        case 'changed':
          break;
        case 'saving':
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    }
  });
})(jQuery);
