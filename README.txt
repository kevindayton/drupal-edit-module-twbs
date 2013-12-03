Description
-----------
This module makes it possible to edit fields in-place.


Installation
------------
1. Install like any other Drupal module.
2. Grant the 'Access in-place editing' permission to relevant roles.
3. A new "In-place edit operations" block displaying the "Quick edit" link is
   now available and placed in the first sidebar by default.


In-place WYSIWYG editing using CKEditor
---------------------------------------
1. Download and install the latest stable release (version 1.13 or newer) of the
   CKEditor module from http://drupal.org/project/ckeditor.
   Note that *only* the CKEditor module is supported, not any other module, like
   the "Wysiwyg" module (http://drupal.org/project/wysiwyg).
2. Go to http://ckeditor.com/builder, choose any preset you like, then add the
   "Shared Space" plugin to the list of "Selected plugins". Then click the
   "Download" button.
   Only version 4.2 or newer of CKEditor is supported.
   NOTE: If you use the "Source" button, also add the "Source Dialog" plugin to
   the list of "Selected plugins".
3. Extract the downloaded package to sites/all/libraries/ckeditor. For maximum
   security, it is recommended to delete the included "samples" directory at
   sites/all/libraries/ckeditor/samples.
4. Go to admin/config/content/ckeditor/, enable one of the CKEditor profiles for
   each text format where you want to use CKEditor. Or create a new CKEditor
   profile.
   e.g. Enable the default "Advanced" profile for Drupal's "Filtered HTML" text
   format.
5. Find a node that uses e.g. the "Filtered HTML" text format for its body,
   click the "Quick edit" link, then click the node's body, and you should see
   CKEditor's in-place editing!


FAQ
---
Q: I want to make the "Quick edit" link look different.
A: No problem! Disable the block, and output edit_trigger_link()'s render array
   somewhere else on the page.
Q: Edit breaks my node titles!
A: This probably means you're using a theme that inappropriately uses the node
   title as a "title" attribute as well, without stripping any HTML used in the
   title. Within an attribute, HTML is pointless and potentially harmful.
   So if your theme's node.tpl.php does something like this:
     title="<?php print $title ?>"
   then please replace it with this:
     title="<?php print filter_xss($title, array()) ?>"
   This ensures that any HTML tags are stripped from the title.
   See http://drupal.org/node/1913964#comment-7231462 for details.
Q: Why does Edit add attributes to my HTML even for users that don't have the
   permission to use in-place editing?
A: First: precisely because these are just small bits of metadata, there is no
   harm; there is no security risk involved.
   Second: it is by design, this metadata is always added, to not break Drupal's
   render cache.
Q: Why do I get a 'The filter "<filter name>" has no type specified!'' error?
A: For Edit module to allow for in-place editing of "processed text" fields
   (i.e. text passed through Drupal's filter system, via check_markup()), it
   needs to know about each filter what type of filter it is. For simpler text
   formats (i.e. with simpler filters), the unfiltered original may not have to
   be retrieved from the server. See http://drupal.org/node/1817474 for details.
Q: I want to disable in-place editing for a field.
A: Any field that has the #skip_edit property set on it will not be made
   in-place editable. You can add this property through hook_preprocess_field().
   You must make sure that your implementation of that hook runs *before* Edit's
   implementation — you can guarantee that by modifying the weight of your
   module or implementing hook_module_implements_alter().
Q: Why do contextual links now appear on node pages?
A: Edit.module indeed enables contextual links on node pages as well, to allow
   users to in-place edit not only "teaser" nodes, but also "full" nodes. If you
   want to disable this behavior (which also means disabling in-place editing on
   node pages!), then you can undo the changes made by edit_node_view_alter() in
   another module, by either implementing hook_node_view_alter() yourself, or by
   implementing hook_module_implements_alter() to prevent edit_node_view_alter()
   from being executed.


Drupal 8 to Drupal 7 backporting considerations
-----------------------------------------------
From a Drupal 8 perspective.
1. Use the Libraries API module to depend on Underscore and Backbone.
2. Drupal 8's build of CKEditor already includes the sharedspace plugin, in
   Drupal 7 we must ask users to create a custom CKEditor build.
3. Analogously for the sourcedialog CKEditor plugin, except that is only
   necessary when one of the CKEditor module profiles is configured to use the
   "Source" button.
