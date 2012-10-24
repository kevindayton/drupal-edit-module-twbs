<?php

/**
 * @file
 * Changes to the Text module.
 */

function edit_field_formatter_info_alter(&$info) {
  // Add a new 'edit' property to each formatter, which contains metadata for
  // the Edit module depending on the formatter. It contains the following keys:
  //   * 'editability', with one of the following values:
  //     - 'form': these fields will load the field's form through AJAX; this is
  //       the default since it always works, and thus can be omitted.
  //     - 'direct': these fields will be "directly" editable (through the HTML5
  //       contentEditable property), this only works for free-form textual
  //       fields. If the text_processing setting for this field instance is
  //       enabled, then a WYSIWYG editor will be used, if available and if
  //       compatible with the field's current text format.
  //     - 'disabled': these fields will not be editable inline. This allows one
  //       to explicitly disable in-place editing.
  $editability_metadata = array(
    'text_default'            => 'direct',
    'text_trimmed'            => 'form',
    'text_summary_or_trimmed' => 'form',
    'text_textarea'           => 'direct',
  );
  foreach ($editability_metadata as $formatter => $editability) {
    if (!empty($info[$formatter])) {
      $info[$formatter]['settings']['edit'] = array(
        'editability' => $editability,
      );
    }
  }
}
