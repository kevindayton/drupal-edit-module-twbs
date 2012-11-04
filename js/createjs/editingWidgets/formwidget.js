(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {
    /**
     * Enables the widget
     */
    enable: function () {
      Drupal.edit.log('Drupal.drupalFormWidget.enable');
      // As the form should be retrieved only when the editable gets *activated*
      // rather than enabled (i.e. candidate/highlighted state). We should
      // consider how to trigger it from the editable.
      var widget = this;
      var activator = function () {
        widget.activate();
        widget.element.unbind("click", activator);
      };
      this.element.bind("click", activator);
    },
    activate: function () {
      // Trigger "activating" state (i.e. loading the form).
      Drupal.edit.log('Drupal.drupalFormWidget.activating', this);
      this.options.activating();

      // Render form container.
      this.$formContainer = jQuery(Drupal.theme('editFormContainer', {
        id: Drupal.edit.form._id(this.element),
        loadingMsg: Drupal.t('Loading…')}
      ));
      console.log('Activate', this.element);
      // $editable is the DOM element of the editable widget
        var $editable = $(this.options.widget.element);
      // $fied is the DOM element of the field/editingWidget
      var $field = $(this.element);

      // @todo: this should not be necessary anymore because we should have cleaned up the form on deactivating the widget.
      // We only create a placeholder-div/form for the form-based instances.
      if (Drupal.edit.form.get($editable).length > 0) {
        console.log('Drupal.edit.form.create - Drupal.edit.form.get($editable).length > 0', Drupal.edit.form.get($editable).length, Drupal.edit.form.get($editable));
        return cb(false);
      }

      // Append  & insert in DOM.
      if ($editable.css('display') == 'inline') {
        this.$formContainer.prependTo($editable.offsetParent());

        var pos = $editable.position();
        this.$formContainer.css('left', pos.left).css('top', pos.top);

        // @todo: do something to toolbar - we should not touch the toolbar here!
        // Reset the toolbar's positioning because it'll be moved inside the
        // form container.
        // Drupal.edit.toolbar.get($editable).css('left', '').css('top', '');
        // this.getToolbarElement().css('left', '').css('top', '');
      }
      else {
        this.$formContainer.insertBefore($editable);
      }

      // @todo: do something to toolbar - we should not touch the toolbar here!
      // Move  toolbar inside .edit-form-container, to let it snap to the width
      // of the form instead of the field formatter.
      // Drupal.edit.toolbar.get($editable).detach().prependTo('.edit-form');
      // this.getToolbarElement().detach().prependTo('.edit-form');


      // Create the form asynchronously.
      var widget = this;
      Drupal.edit.form.create($editable, function($editable, $field) {
        widget.options.activated();
        Drupal.edit.log('Drupal.drupalFormWidget.activated', $editable, $field);
        Drupal.edit.form.get($editable)
          .delegate(':input', 'formUpdated.edit', function () {
            widget.options.changed();
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode == 13) {
              return false;
            }
          });

        $editable
          .addClass('edit-belowoverlay')
          .removeClass('edit-highlighted edit-editable');

        Drupal.edit.form.get($editable)
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editable.data('edit-background-color'));
      });
    },

    /**
     * Disables the widget.
     */
    disable: function () {
      Drupal.edit.log('Drupal.drupalFormWidget.disable');

      // @todo: handle this better on the basis of the editable type.
      // Currently we stuff forms into two places ...
      Drupal.edit.form.get(this.element).remove();

      // Revert the changes to classes applied in the the enable/loadForm
      // methods above.
      this.element
        .removeClass('edit-belowoverlay')
        .addClass('edit-highlighted edit-editable');

      Drupal.edit.form.get(this.element)
        .undelegate(':input', 'change.edit')
        .undelegate('input', 'keypress.edit');
    },

   /**
     * Initializes the widget functions.
     *
     * Override of Create.editWidget._initialize().
     */
    _initialize: function () {
    }
  });
})(jQuery);
