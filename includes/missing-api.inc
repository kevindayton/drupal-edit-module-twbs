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
 * @see http://drupal.org/node/1821906
 * @{
 */

/**
 * Identical to field_attach_prepare_view(), with the addition of $options.
 */
function edit_field_attach_prepare_view($entity_type, $entities, $view_mode, $langcode = NULL, array $options = array()) {
  $options['langcode'] = array();

  // To ensure hooks are only run once per entity, only process items without
  // the _field_view_prepared flag.
  $prepare = array();
  foreach ($entities as $id => $entity) {
    if (empty($entity->_field_view_prepared)) {
      // Add this entity to the items to be prepared.
      $prepare[$id] = $entity;

      // Determine the actual language code to display for each field, given the
      // language codes available in the field data.
      $options['langcode'][$id] = field_language($entity_type, $entity, NULL, $langcode);

      // Mark this item as prepared.
      $entity->_field_view_prepared = TRUE;
    }
  }

  $null = NULL;
  // First let the field types do their preparation.
  _field_invoke_multiple('prepare_view', $entity_type, $prepare, $null, $null, $options);
  // Then let the formatters do their own specific massaging.
  field_invoke_method_multiple('prepareView', _field_invoke_formatter_target($view_mode), $prepare, $view_mode, $null, $options);
}

/**
 * Identical to field_attach_view(), with the addition of $options.
 */
function edit_field_attach_view($entity_type, EntityInterface $entity, $view_mode, $langcode = NULL, array $options = array()) {
  // Determine the actual language code to display for each field, given the
  // language codes available in the field data.
  $options['langcode'] = field_language($entity_type, $entity, NULL, $langcode);

  // Invoke field_default_view().
  $null = NULL;
  $output = field_invoke_method('view', _field_invoke_formatter_target($view_mode), $entity, $view_mode, $null, $options);

  // Add custom weight handling.
  $output['#pre_render'][] = '_field_extra_fields_pre_render';
  $output['#entity_type'] = $entity_type;
  $output['#bundle'] = $entity->bundle();

  // Let other modules alter the renderable array.
  $context = array(
    'entity_type' => $entity_type,
    'entity' => $entity,
    'view_mode' => $view_mode,
    'display' => $view_mode,
    'langcode' => $langcode,
  );
  drupal_alter('field_attach_view', $output, $context);

  // Reset the _field_view_prepared flag set in field_attach_prepare_view(),
  // in case the same entity is displayed with different settings later in
  // the request.
  unset($entity->_field_view_prepared);

  return $output;
}

/**
 * Identical to field_attach_form(), with the addition of $options.
 */
function _edit_field_attach_form($entity_type, EntityInterface $entity, &$form, &$form_state, $langcode = NULL, array $options = array()) {
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
function _edit_field_attach_validate($entity_type, $entity, array $options = array()) {
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
function _edit_field_attach_form_validate($entity_type, EntityInterface $entity, $form, &$form_state, array $options = array()) {
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
function _edit_field_attach_submit($entity_type, EntityInterface $entity, $form, &$form_state, array $options = array()) {
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
