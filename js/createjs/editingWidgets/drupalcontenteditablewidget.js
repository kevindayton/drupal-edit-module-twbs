(function (jQuery, undefined) {
  // Consistent namespace.
  jQuery.widget('Drupal.drupalContentEditableWidget', jQuery.Create.editWidget, {
    /**
     * Implements Create's _initialize() method.
     */
    _initialize: function() {
      var self = this;
      var before = this.element.html();
      this.element.bind('keyup paste', function (event) {
        if (self.options.disabled) {
          return;
        }
        var current = jQuery(this).html();
        if (before !== current) {
          before = current;
          self.options.changed(current);
        }
      });
    },

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: get rid of this once https://github.com/bergie/create/issues/142
     * is solved.
     */
    _init: function () {
      var widget = this;
      var activator = function () {
        widget.options.activated();
        widget.enable();
        widget.element.unbind("click", activator);
      };
      this.element.bind("click", activator);
    }
  });
})(jQuery);
