(function ($, undefined) {
  // # Drupal form-based editing widget for Create.js
  $.widget('Drupal.drupalFormWidget', $.Create.editWidget, {

    /**
     * Implements jQuery UI widget factory's _init() method.
     *
     * @todo: get rid of this once https://github.com/bergie/create/issues/142
     * is solved.
     */
    _init: function() {
      // Sets the state to 'activating'.
      this.element.bind("click", this.options.activating);
    },

    /**
     * Implements Create's _initialize() method.
     */
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
          if (from !== 'inactive') {
            this.disable();
          }
          break;
        case 'highlighted':
          break;
        case 'activating':
          this.enable();
          break;
        case 'active':
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
    },

    /**
     * Enables the widget.
     */
    enable: function () {
      // $editable is the DOM element of the editable widget
      var $editable = $(this.options.widget.element);
      // $fied is the DOM element of the field/editingWidget
      var $field = $(this.element);

      // Render form container.
      this.$formContainer = jQuery(Drupal.theme('editFormContainer', {
        id: Drupal.edit.form._id(this.element),
        loadingMsg: Drupal.t('Loading…')}
      ));

      this.$formContainer
        .find('.edit-form')
        .addClass('edit-editable edit-highlighted edit-editing')
        .css('background-color', $editable.css('background-color'));

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
        // Sets the state to 'activated'.
        widget.options.activated();
        Drupal.edit.log('Drupal.drupalFormWidget.activated', $editable, $field);
        Drupal.edit.form.get($editable)
          .delegate(':input', 'formUpdated.edit', function () {
            // Sets the state to 'changed'.
            widget.options.changed();
          })
          .delegate('input', 'keypress.edit', function (event) {
            if (event.keyCode == 13) {
              return false;
            }
          });
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

      Drupal.edit.form.get(this.element)
        .undelegate(':input', 'change.edit')
        .undelegate('input', 'keypress.edit');
    }
  });
})(jQuery);
