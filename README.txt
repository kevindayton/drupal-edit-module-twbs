Description
-----------
This module makes it possible to edit fields in-place.


Installation
------------
1. Apply the included Drupal core patch from the Drupal core root directory:
     git apply core-field_api_single_field-1821906-28.patch
2. Install like any other Drupal module.
3. Grant the 'Access in-place editing' permission to relevant roles.
4. A new "In-place edit operations" block displaying the "Quick edit" link is
   now available and placed in the first sidebar by default.


FAQ
---
Q: I want to make the "Quick edit" link look different.
A: No problem! Disable the block, and output edit_trigger_link()'s render array
   somewhere else on the page.
