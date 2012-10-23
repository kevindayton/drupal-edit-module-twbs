<?php
/**
 * @file
 * Logic to analyze compatibility of text formats with WYSIWYG editors.
 */

use Drupal\Core\Entity\EntityInterface;

/**
 * Given a field (with cardinality 1) that defaults to "direct" editability and
 * WYSIWYG support, check whether the field settings and text format don't
 * force it to "form" editability.
 *
 * @param Drupal\Core\Entity\EntityInterface $entity
 *   A entity object.
 * @param string $field_name
  *  The name of the field for which to analyze the editability.
 * @param string $format_id
 *   The current text format of the field.
 *
 * @return string
 *   'direct' or 'form'
 */
function edit_wysiwyg_analyze_field_editability(EntityInterface $entity, $field_name, $format_id) {
  // The field must be configured to use text processing.
  $instance_info = field_info_instance($entity->entityType(), $field_name, $entity->bundle());

  $compatibility_callback = edit_get_wysiwyg_info('format compatibility callback');

  // This field is configured to not use text processing; hence fall back to
  // form-based editing.
  if (empty($instance_info['settings']['text_processing'])) {
    return 'form';
  }
  // If the field has text processing enabled, but no format is assigned yet,
  // (e.g. when the field is still empty (NULL)), then provide form-based
  // editing, so that the user is able to select a text format.
  // (Direct editing doesn't allow the user to change the format.)
  elseif (empty($format_id)) {
    return 'form';
  }
  elseif (!$compatibility_callback($format_id)) {
    return 'form';
  }

  return 'direct';
}
