(function (jQuery, undefined) {
  // Consistent namespace.
  jQuery.widget('Drupal.drupalContentEditableWidget', jQuery.Create.editWidget, {
    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: get rid of this once https://github.com/bergie/create/issues/142
     * is solved.
     */
    _init: function () {
      // Sets the state to 'activated'.
      this.element.bind("click", this.options.activated);
    },

    /**
     * Implements Create's _initialize() method.
     */
    _initialize: function() {
      var self = this;
      var before = jQuery.trim(this.element.text());
      this.element.bind('keyup paste', function (event) {
        if (self.options.disabled) {
          return;
        }
        var current = jQuery.trim(self.element.text());
        if (before !== current) {
          before = current;
          self.options.changed(current);
        }
      });
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
          if (from !== 'inactive') {
            // Removes the "contenteditable" attribute.
            this.disable();
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
          break;
        case 'saved':
          break;
        case 'invalid':
          break;
      }
    }
  });
})(jQuery);
