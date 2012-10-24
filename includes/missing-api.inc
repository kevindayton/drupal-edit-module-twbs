<?php

use Drupal\Core\Entity\EntityInterface;
use Drupal\node\Node;

/**
 * @ingroup Missing in Entity API.
 * @{
 */

// @todo Entity Access API: http://drupal.org/node/1696660#comment-6618944
function edit_entity_access($op, $entity_type, $entity = NULL, $account = NULL) {
  if ($entity_type == 'node') {
    return node_access($op, $entity, $account);
  }

  // Currently, only editing of nodes is supported. See the above issue.
  return FALSE;
}

// @todo Entity API check to see whether a specific entity supports revisions.
// Proudly found elsewhere: FAPE module's _fape_entity_allows_revisions().
function edit_entity_allows_revisions($entity_type, $bundle, $entity) {
  $retval = array(FALSE, FALSE);

  switch ($entity_type) {
    case 'node':
      $node_options = variable_get('node_options_' . $bundle, array('status', 'promote'));
      $retval[0] = in_array('revision', $node_options);
      $retval[1] = user_access('administer nodes');
      break;

    default:
      $entity_info = entity_get_info($entity_type);
      $retval[0] = !empty($entity_info['revision table']);
      break;
  }

  $entity->revision = $retval[0];
  $entity->log = '';
  return $retval;
}

/**
 * @} End of "ingroup Missing in Entity API.".
 */


/**
 * @ingroup Field API refinements.
 * @todo Improve Field API by allowing $options to be passed into field_attach_form(), field_attach_validate(), field_attach_form_validate() and field_attach_submit().
 * @{
 */

/**
 * Identical to field_attach_form(), with the addition of $options.
 */
function _edit_field_attach_form($entity_type, EntityInterface $entity, &$form, &$form_state, $langcode = NULL, $options = array()) {
  // Set #parents to 'top-level' by default.
  $form += array('#parents' => array());

  // If no language is provided use the default site language.
  $options['langcode'] = field_valid_language($langcode);
  $form += (array) field_invoke_method('form', _field_invoke_widget_target(), $entity, $form, $form_state, $options);

  // Add custom weight handling.
  $form['#pre_render'][] = '_field_extra_fields_pre_render';
  $form['#entity_type'] = $entity_type;
  $form['#bundle'] = $entity->bundle();

  // Let other modules make changes to the form.
  // Avoid module_invoke_all() to let parameters be taken by reference.
  foreach (module_implements('field_attach_form') as $module) {
    $function = $module . '_field_attach_form';
    $function($entity_type, $entity, $form, $form_state, $langcode);
  }
}

/**
 * Identical to field_attach_validate(), with the addition of $options.
 */
function _edit_field_attach_validate($entity_type, $entity, $options) {
  $errors = array();
  // Check generic, field-type-agnostic errors first.
  _field_invoke_default('validate', $entity_type, $entity, $errors, $options);
  // Check field-type specific errors.
  _field_invoke('validate', $entity_type, $entity, $errors, $options);

  // Let other modules validate the entity.
  // Avoid module_invoke_all() to let $errors be taken by reference.
  foreach (module_implements('field_attach_validate') as $module) {
    $function = $module . '_field_attach_validate';
    $function($entity_type, $entity, $errors);
  }

  if ($errors) {
    throw new FieldValidationException($errors);
  }
}

/**
 * Identical to field_attach_form_validate(), with the addition of $options and
 * calling _edit_field_attach_validate() instead of field_attach_validate().
 */
function _edit_field_attach_form_validate($entity_type, EntityInterface $entity, $form, &$form_state, $options) {
  // Perform field_level validation.
  try {
    _edit_field_attach_validate($entity_type, $entity, $options);
  }
  catch (FieldValidationException $e) {
    // Pass field-level validation errors back to widgets for accurate error
    // flagging.
    foreach ($e->errors as $field_name => $field_errors) {
      foreach ($field_errors as $langcode => $errors) {
        $field_state = field_form_get_state($form['#parents'], $field_name, $langcode, $form_state);
        $field_state['errors'] = $errors;
        field_form_set_state($form['#parents'], $field_name, $langcode, $form_state, $field_state);
      }
    }
    field_invoke_method('flagErrors', _field_invoke_widget_target(), $entity, $form, $form_state, $options);
  }
}

/**
 * Identical to field_attach_submit(), with the addition of $options.
 */
function _edit_field_attach_submit($entity_type, EntityInterface $entity, $form, &$form_state, $options) {
  // Extract field values from submitted values.
  field_invoke_method('submit', _field_invoke_widget_target(), $entity, $form, $form_state, $options);

  // Let other modules act on submitting the entity.
  // Avoid module_invoke_all() to let $form_state be taken by reference.
  foreach (module_implements('field_attach_submit') as $module) {
    $function = $module . '_field_attach_submit';
    $function($entity_type, $entity, $form, $form_state);
  }
}

/**
 * @} End of "ingroup Field API refinements.".
 */
