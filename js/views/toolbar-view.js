Drupal.edit = Drupal.edit || {};
Drupal.edit.views = Drupal.edit.views || {};
Drupal.edit.views.ToolbarView = Backbone.View.extend({
  fieldView:null,
  // @todo: this should be the toolbar's $el.
  $toolbar: null,
  initialize:function (options) {
    this.fieldView = options.fieldView;
    var that = this;
    // bind to the editable state changes.
    this.$el.bind('createeditablestatechange', function(event, data) {
      switch (data.current) {
        case 'modified':
          that.getToolbarElement()
            .find('a.save')
            .addClass('blue-button')
            .removeClass('gray-button');
          break;
        case 'activating':
          that.showLoadingFormIndicator();
          break;
        case 'active':
          // @todo: show the appropriate ops-toolbar group (and maybe wysiwyg etc.)
          // currently we bind to 'edit-form-loaded.edit' below.
          break;
      }
    });

    this.$el.bind('edit-form-loaded.edit', function() {
      // Indicate in the 'info' toolgroup that the form has loaded.
      // Drupal.edit.toolbar.removeClass($editable, 'primary', 'info', 'loading');
      that.removeClass('info', 'loading');
      that.show('ops');
    });
  },
  // Adjust toolbar as editable is loading form.
  showLoadingFormIndicator: function() {
    // var that = this;
    // Indicate in the 'info' toolgroup that the form is loading. Animated.
    /* setTimeout(function() {
      that.addClass('info', 'loading');
    }, 0); */
    // @todo: why do we do this twice?
    // Indicate in the 'info' toolgroup that the form is loading.
    // Drupal.edit.toolbar.addClass($editable, 'primary', 'info', 'loading');
    this.addClass('info', 'loading');
  },

  getEditable:function () {
    return this.$el;
  },
  getToolbarElement:function () {
    return jQuery('#' + this._id() );
  },
  // This function contains the former:
  //   - Drupal.edit.toolbar.create()
  //   - Drupal.edit.toolbar.startHighlight()
  //   - Drupal.edit.toolbar.startEdit()
  //   - _updateDirectEditable()
  createToolbar:function () {
    // @START Drupal.edit.toolbar.create()
    if (this.getToolbarElement().length) {
      return true;
    }
    var $editable = this.getEditable();
    // Render toolbar.
    var $toolbar = jQuery(Drupal.theme('editToolbarContainer', {
      id:this._id()
    }));
    // Insert in DOM.
    if ($editable.css('display') == 'inline') {
      $toolbar.prependTo($editable.offsetParent());
      var pos = $editable.position();
      $toolbar.css('left', pos.left).css('top', pos.top);
    }
    else {
      $toolbar.insertBefore($editable);
    }

    // Animate the toolbar into visibility.
    setTimeout(function () {
      $toolbar.removeClass('edit-animate-invisible');
    }, 0);

    // Remove any and all existing toolbars, except for any that are for a
    // currently being edited field.
    jQuery('.edit-toolbar-container:not(:has(.edit-editing))')
      .trigger('edit-toolbar-remove.edit');

    // Event bindings.
    $toolbar
      .bind('mouseenter.edit', function (e) {
        // Prevent triggering the entity's mouse enter event.
        e.stopPropagation();
      })
      .bind('mouseleave.edit', function (e) {
        var el = $editable[0];
        if (e.relatedTarget != el && !jQuery.contains(el, e.relatedTarget)) {
          Drupal.edit.log('triggering mouseleave on ', $editable);
          $editable.trigger('mouseleave.edit');
        }
        // Prevent triggering the entity's mouse leave event.
        e.stopPropagation();
      })
      // Immediate removal whenever requested.
      // (This is necessary when showing many toolbars in rapid succession: we
      // don't want all of them to show up!)
      .bind('edit-toolbar-remove.edit', function (e) {
        $toolbar.remove();
      })
      .delegate('.edit-toolbar, .edit-toolgroup', 'click.edit mousedown.edit', function (e) {
        if (!jQuery(e.target).is(':input')) {
          return false;
        }
      });
    // @END Drupal.edit.toolbar.create()




    // We get the label to show from VIE's type system
    var label = this.fieldView.predicate;
    var attributeDef = this.fieldView.model.getVieEntity().get('@type').attributes.get(this.fieldView.predicate);
    if (attributeDef && attributeDef.metadata) {
      label = attributeDef.metadata.label;
    }
    var self = this;



    // @START Drupal.edit.editables.startHighlight(), minus label handling,
    // which is now handled by VIE in the above code block AND minus
    // the adding of the edit-highlighted class (which is animated).
    $toolbar.find('.edit-toolbar:not(:has(.edit-toolgroup.info))')
      .append(Drupal.theme('editToolgroup', {
      classes:'info',
      buttons:[
        {
          url:'#',
          label:label,
          classes:'blank-button label',
          hasButtonRole:false
        }
      ]
    }))
      .delegate('a.label', 'click.edit', function (event) {
        self.fieldView.$el.trigger('click.edit');
        event.stopPropagation();
        event.preventDefault();
      });
    // @END Drupal.edit.editables.startHighlight()




    // @START Drupal.edit.editables.startEdit(), minus the event handling for
    // content-changed.edit, AND minus the background-color handling, AND
    // minus the "prevent multiple simultaneous editables" handling (though
    // Create.js might be doing this for us) AND minus the _updateFormEditable
    // vs. _updateDirectEditable calling, it just includes a subset of the
    // latter directly.
    $toolbar
      .addClass('edit-editing')
      .find('.edit-toolbar:not(:has(.edit-toolgroup.ops))')
      .append(Drupal.theme('editToolgroup', {
      classes:'ops',
      buttons:[
        {
          url:'#',
          label:Drupal.t('Save'),
          classes:'field-save save gray-button'
        },
        {
          url:'#',
          label:'<span class="close"></span>',
          classes:'field-close close gray-button'
        }
      ]
    }))
      .delegate('a.field-save', 'click.edit', function (event) {
        self.fieldView.saveClicked(event);
      })
      .delegate('a.field-close', 'click.edit', function (event) {
        self.fieldView.closeClicked(event);
      });
    // @END Drupal.edit.editables.startEdit()




    // @START Drupal.edit.editables._updateDirectEditable(), minus padding AND
    // minus transformation filter handling AND minus _wysiwify() call AND
    // minus changed content handling
    if ($editable.hasClass('edit-type-direct-with-wysiwyg')) {
      $toolbar
      .find('.edit-toolbar:not(:has(.edit-toolbar-wysiwyg-tabs))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'wysiwyg-tabs',
        buttons: []
      }))
      .end()
      .find('.edit-toolbar:not(:has(.edit-toolgroup.wysiwyg))')
      .append(Drupal.theme('editToolgroup', {
        classes: 'wysiwyg',
        buttons: []
      }));
      // @END Drupal.edit.editables._updateDirectEditable()




      // @todo: No WYSIWYG is attached yet, then this class should not be added!
      this.fieldView.$el.addClass('edit-wysiwyg-attached');
    }
    return true;
  },
  // @todo: proper Backbone.remove() and unbind all events above!
  // @todo: near-identical to Drupal.edit.toolbar.remove()
  removeToolbar:function () {
    var $toolbar  = this.getToolbarElement();
    // Remove after animation.
    $toolbar
      .addClass('edit-animate-invisible')
      // Prevent this toolbar from being detected *while* it is being removed.
      .removeAttr('id')
      .find('.edit-toolbar .edit-toolgroup')
      .addClass('edit-animate-invisible')
      .bind(Drupal.edit.constants.transitionEnd, function (e) {
        $toolbar.remove();
      });
  },
  // Animate into view.
  show:function (toolgroup) {
    this._find(toolgroup).removeClass('edit-animate-invisible');
  },
  hide:function (toolgroup) {
    this._find(toolgroup).addClass('edit-animate-invisible');
  },
  addClass:function (toolgroup, classes) {
    this._find(toolgroup).addClass(classes);
  },
  removeClass:function (toolgroup, classes) {
    this._find(toolgroup).removeClass(classes);
  },
  _find:function (toolgroup) {
    return this.getToolbarElement().find('.edit-toolbar .edit-toolgroup.' + toolgroup);
  },
  _id:function () {
    var edit_id = Drupal.edit.util.getID(this.getEditable());
    return 'edit-toolbar-for-' + edit_id.split(':').join('_');
  }
});
