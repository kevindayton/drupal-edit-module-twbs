<?php

//-----------------------------------------------------------------------------
// This will hopefully be accepted into the FAPE module: http://drupal.org/node/1650442.



function edit_field_edit_form(&$form, &$form_state) {

  $entity_type = $form_state['entity_type'];
  $entity = $form_state['entity'];
  $field_name = $form_state['field_name'];
  $field_instance = $form_state['field_instance'];
  $langcode = $form_state['langcode'];
  $bundle = $form_state['bundle'];

  $options = array(
    'field_name' => $field_name,
    'language' => field_valid_language($langcode),
    'default' => TRUE,
  );

  if ($entity_type == 'node') {
    $entity->revision = in_array('revision', variable_get('node_options_' . $bundle, array()));
    $entity->log = NULL;
  }

  field_attach_form($entity_type, $entity, $form, $form_state, $langcode, $options);

  $form['#validate'][] = 'edit_field_edit_form_validate';
  $form['#submit'][] = 'edit_field_edit_form_submit';
}

function edit_build_entity($form, &$form_state) {
  $entity = clone $form_state['entity'];
  field_attach_submit($form_state['entity_type'], $entity, $form, $form_state, array('field_name' =>  $form_state['field_name']));

  // @todo Refine automated log messages and abstract them to all entity
  //   types: http://drupal.org/node/1678002.
  if ($form_state['entity_type'] == 'node' && $entity->revision && !isset($entity->log)) {
    $instance = field_info_instance($form_state['entity_type'], $form_state['field_name'], $form_state['bundle']);
    $entity->log = t('Updated the %field-name field through in-place editing.', array('%field-name' => $instance['label']));
  }
  return $entity;
}

function edit_field_edit_form_validate($form, &$form_state) {
  $entity = edit_build_entity($form, $form_state);
  field_attach_form_validate($form_state['entity_type'], $entity, $form, $form_state, array('field_name' =>  $form_state['field_name']));
}

function edit_field_edit_form_submit(&$form, &$form_state) {
  $entity = edit_build_entity($form, $form_state);
  entity_save($form_state['entity_type'], $entity);
  // This is needed to refresh the output.
  $form_state['entity'] = $entity;
}

/**
 * Subform to edit the entity 'author' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function editfape_field_edit_node_author_form(&$form, &$form_state) {
  $node = $form_state['entity'];
  node_object_prepare($node);

  $form['name'] = array(
    '#type' => 'textfield',
    '#title' => t('Authored by'),
    '#maxlength' => 60,
    '#autocomplete_path' => 'user/autocomplete',
    '#default_value' => !empty($node->name) ? $node->name : '',
    '#weight' => -1,
    '#description' => t('Leave blank for %anonymous.', array('%anonymous' => variable_get('anonymous', t('Anonymous')))),
  );

  $form['#validate'][] = 'editfape_field_edit_node_author_form_validate';
  $form['#submit'][]   = 'editfape_field_edit_node_author_form_submit';
}

// Taken from node_validate().
function editfape_field_edit_node_author_form_validate($form, &$form_state) {
  $name = $form_state['values']['name'];
  if (!empty($name) && !($account = user_load_by_name($name))) {
    // The use of empty() is mandatory in the context of usernames
    // as the empty string denotes the anonymous user. In case we
    // are dealing with an anonymous user we set the user ID to 0.
    form_set_error('name', t('The username %name does not exist.', array('%name' => $name)));
  }
}

// Taken from node_submit().
function editfape_field_edit_node_author_form_submit($form, &$form_state) {
  $entity = editfape_build_entity($form_state, t('Author'));
  if ($account = user_load_by_name($form_state['values']['name'])) {
    $entity->uid = $account->uid;
  }
  else {
    $entity->uid = 0;
  }
  entity_save($form_state['entity_type'], $entity);
}

/**
 * Subform to edit the entity 'created' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function editfape_field_edit_node_created_form(&$form, &$form_state) {
  $node = $form_state['entity'];
  // node_object_prepare() is necessary to calculate node->date!
  node_object_prepare($node);

  $form['date'] = array(
    '#type' => 'textfield',
    '#title' => t('Authored on'),
    '#maxlength' => 25,
    '#description' => t('Format: %time. The date format is YYYY-MM-DD and %timezone is the time zone offset from UTC. Leave blank to use the time of form submission.', array('%time' => !empty($node->date) ? date_format(date_create($node->date), 'Y-m-d H:i:s O') : format_date($node->created, 'custom', 'Y-m-d H:i:s O'), '%timezone' => !empty($node->date) ? date_format(date_create($node->date), 'O') : format_date($node->created, 'custom', 'O'))),
    '#default_value' => !empty($node->date) ? $node->date : '',
  );

  $form['#validate'][] = 'editfape_field_edit_node_created_form_validate';
  $form['#submit'][]   = 'editfape_field_edit_node_created_form_submit';
}

// Taken from node_validate().
function editfape_field_edit_node_created_form_validate($form, &$form_state) {
  $date = $form_state['values']['date'];
  if (!empty($date) && strtotime($date) === FALSE) {
    form_set_error('date', t('You have to specify a valid date.'));
  }
}

// Taken from node_submit().
function editfape_field_edit_node_created_form_submit($form, &$form_state) {
  $entity = editfape_build_entity($form_state, t('Date'));
  $date = $form_state['values']['date'];
  $entity->created = !empty($date) ? strtotime($date) : REQUEST_TIME;
  entity_save($form_state['entity_type'], $entity);
}


/**
 * Subform to edit the entity 'title' field.
 *
 * This isn't a true form. As such it modifies the $form by reference.
 */
function editfape_field_edit_node_title_form(&$form, &$form_state) {
  $node = $form_state['entity'];
  node_object_prepare($node);
  $type = node_type_get_type($node);

  $form['title'] = array(
    '#type' => 'textfield',
    '#title' => check_plain($type->title_label),
    '#default_value' => !empty($node->title) ? $node->title : '',
    '#required' => TRUE,
    '#weight' => -5,
  );

  $form['#submit'][] = 'editfape_field_edit_node_title_form_submit';
}

function editfape_field_edit_node_title_form_submit($form, &$form_state) {
  $entity = editfape_build_entity($form_state, t('Title'));
  $entity->title = $form_state['values']['title'];
  entity_save($form_state['entity_type'], $entity);
}

/**
 * Creates a new revision for entity requiring it.
 *
 * @param $form_state
 * @param $field
 *
 * @return $entity
 */
function editfape_build_entity($form_state, $field) {
  $entity = clone $form_state['entity'];
  if ($form_state['entity_type'] == 'node' && $entity->revision && !isset($entity->log)) {
    $entity->log = t('Updated the %field-name field through in-place editing.', array('%field-name' => $field));
  }
  return $entity;
}
