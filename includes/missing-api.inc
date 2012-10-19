<?php

// @todo Entity Access API: http://drupal.org/node/1696660#comment-6618944
function edit_entity_access($op, $entity_type, $entity = NULL, $account = NULL) {
  if ($entity_type == 'node') {
    return node_access($op, $entity, $account);
  }

  // Currently, only editing of nodes is supported. See the above issue.
  return FALSE;
}


/**
 * @ingroup FAPE
 * @{
 */

// STILL NEED TO FINISH THIS UP! SAVING IS BROKEN, BUT AT LEAST YOU GET TO SEE
// A FORM!

// Proudly found elsewhere: FAPE module's fape_field_edit_form().
// @todo refactor
function edit_field_edit_form($form, &$form_state) {
  // Since we could edit a number of different things here, immediately
  // add whatever else is needed.
  // var_dump($form);
  $form_state['subform_id']($form, $form_state);
  // var_dump($form);exit;
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
  $form['actions']['cancel'] = array(
    '#type' => 'submit',
    '#value' => t('Cancel'),
    '#validate' => array('edit_field_edit_form_cancel'),
    '#executes_submit_callback' => FALSE,
  );


  // Ensure this actually gets on there.
  $form['#submit'][] = 'fape_field_edit_form_submit';
  return $form;
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

  $form['#validate'][] = 'fape_field_edit_field_form_validate';
  $form['#submit'][] = 'fape_field_edit_field_form_submit';
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

  drupal_alter('edit_entity_allow_revisions', $retval);
  $entity->revision = $retval[0];
  $entity->log = '';
  return $retval;
}

/**
 * @} End of "ingroup FAPE".
 */
