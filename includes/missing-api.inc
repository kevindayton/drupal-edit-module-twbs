<?php

use Drupal\Core\Entity\EntityInterface;
use Drupal\node\Node;

// @todo Entity Access API: http://drupal.org/node/1696660#comment-6618944
function edit_entity_access($op, $entity_type, $entity = NULL, $account = NULL) {
  if ($entity_type == 'node') {
    return node_access($op, $entity, $account);
  }

  // Currently, only editing of nodes is supported. See the above issue.
  return FALSE;
}




/**
 * @ingroup Field API refinements.
 * @{
 */

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
 * calling edit_field_attach_validate() instead of field_attach_validate().
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
 * @} End of "ingroup Field API refinements".
 */




/**
 * @ingroup FAPE
 * @{
 */

// All of this needs to be refactored SIGNIFICANTLY.
//
// Also: do we really want all the revisioning form items? We may be able to get
// rid of them when http://drupal.org/node/1678002 is solved.

// Proudly found elsewhere: FAPE module's fape_field_edit_form().
// @todo refactor
function edit_field_edit_form($form, &$form_state) {
  // Since we could edit a number of different things here, immediately
  // add whatever else is needed.
  $form_state['subform_id']($form, $form_state);
  $form['#parents'] = array();

  $entity_type = $form_state['entity_type'];
  $entity = $form_state['entity'];
  $bundle = $form_state['bundle'];

  list($use_revisions, $control_revisions) = _edit_entity_allows_revisions($entity_type, $bundle, $entity);

  if ($use_revisions) {
    $form_state['use revisions'] = TRUE;
    $form['revision_information'] = array(
      '#weight' => 11,
    );

    $form['revision_information']['revision'] = array(
      '#type' => 'checkbox',
      '#title' => t('Create new revision'),
      '#default_value' => $entity->revision,
      '#id' => 'edit-revision',
      '#access' => $control_revisions,
    );

    if ($control_revisions || $entity->revision) {
      $form['revision_information']['log'] = array(
        '#type' => 'textarea',
        '#title' => t('Log message'),
        '#description' => t('Provide an explanation of the changes you are making. This will help other authors understand your motivations.'),
        '#default_value' => $entity->log,
      );

      if ($control_revisions) {
        $form['revision_information']['log']['#dependency'] = array('edit-revision' => array(1));
      }
    }
  }

  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );

  // Ensure this actually gets on there.
  $form['#submit'][] = 'edit_field_edit_form_submit';
  return $form;
}

function edit_field_edit_form_submit($form, &$form_state) {
  $entity = $form_state['entity'];
  if (!empty($form_state['use revisions'])) {
    $entity->revision = $form_state['values']['revision'];
    $entity->log = $form_state['values']['log'];
  }
}

// Proudly found elsewhere: FAPE module's fape_field_edit_field_form().
// @todo refactor
function edit_field_edit_field_form(&$form, &$form_state) {
  $form['#parents'] = array();

  $entity_type = $form_state['entity_type'];
  $entity = $form_state['entity'];
  $field_name = $form_state['field_name'];
  $field_instance = $form_state['field_instance'];
  $langcode = $form_state['langcode'];
  $bundle = $form_state['bundle'];

  // If no language is provided use the default site language.
  $options = array(
    'field_name' =>  $field_name,
    'langcode' => field_valid_language($langcode),
  );

  $form += (array) field_invoke_method('form', _field_invoke_widget_target(), $entity, $form, $form_state, $options);

  $form['#pre_render'][] = '_field_extra_fields_pre_render';
  $form['#entity_type'] = $entity_type;
  $form['#bundle'] = $bundle;

  // Let other modules make changes to the form.
  // Avoid module_invoke_all() to let parameters be taken by reference.
  foreach (module_implements('field_attach_form') as $module) {
    $function = $module . '_field_attach_form';
    $function($entity_type, $entity, $form, $form_state, $langcode);
  }

  $form['#validate'][] = 'edit_field_edit_field_form_validate';
  // TRICKY: Doesn't seem necessary anymore, see edit_field_edit_field_form_validate()
  // $form['#submit'][] = '';
}

function edit_field_edit_field_form_validate($form, &$form_state) {
  $entity_type = $form_state['entity_type'];
  $entity = $form_state['entity'];

  $options = array(
    'field_name' =>  $form_state['field_name'],
  );

  // 'submit' in D8 is for "building the entity object", not for actual
  // submission. It appears though that if there were no validation errors, it
  // is submitted automatically.
  _edit_field_attach_submit($entity_type, $entity, $form, $form_state, $options);

  // Validation.
  _edit_field_attach_form_validate($entity_type, $entity, $form, $form_state, $options);
}

// Proudly found elsewhere: FAPE module's _fape_entity_allows_revisions().
// @todo refactor
function _edit_entity_allows_revisions($entity_type, $bundle, $entity) {
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
 * @} End of "ingroup FAPE".
 */
