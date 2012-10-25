<?php
/**
 * @file
 * AJAX endpoints to retrieve & save subforms for fields and re-render fields.
 */

use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Page callback: Provides editing of entity fields.
 *
 * @param string $entity_type
 *   The entity type of the entity that is being edited.
 * @param int $entity_id
 *   The entity ID of the entity that is being edited.
 * @param string $field_name
 *   The name of the field that is being edited.
 * @param string $langcode
 *   The name of the language for which the field is being edited.
 * @param string $view_mode
 *   The view mode the field should be rerendered in.
 * @return array
 *   A render array.
 */
function edit_field_edit($entity_type, $entity_id, $field_name, $langcode, $view_mode) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    throw new NotFoundHttpException();
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    throw new NotFoundHttpException();
  }

  $entities = entity_load_multiple($entity_type, array($entity_id));
  if (!$entities) {
    throw new NotFoundHttpException();
  }

  $entity = reset($entities);
  if (!$entity) {
    throw new NotFoundHttpException();
  }

  // Ensure a valid language code is set.
  $langcode = field_valid_language($langcode);

  // Ensure access to update this particular entity is granted.
  if (!edit_entity_access('update', $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  $field_instance = field_info_instance($entity_type, $field_name, $entity->bundle());
  if (empty($field_instance)) {
    throw new NotFoundHttpException();
  }

  $form_state = array(
    'entity' => $entity,
    'field_name' => $field_name,
    'langcode' => $langcode,
    'no_redirect' => TRUE,
    'build_info' => array('args' => array()),
  );
  $commands = array();
  form_load_include($form_state, 'inc', 'edit', 'includes/form');
  $form = drupal_build_form('edit_field_form', $form_state);

  $id = "$entity_type:$entity_id:$field_name:$langcode:$view_mode";
  if (!empty($form_state['executed'])) {
    $form_state['entity']->save();

    $options = array('field_name' => $field_name);
    field_attach_prepare_view($entity->entityType(), array($entity->id() => $entity), $view_mode, $langcode, $options);
    $output = field_attach_view($entity->entityType(), $entity, $view_mode, $langcode, $options);

    $commands[] = array(
      'command' => 'edit_field_form_saved',
      'id'      => $id,
      'data'    => drupal_render($output),
    );
  }
  else {
    $commands[] = array(
      'command' => 'edit_field_form',
      'id'      => $id,
      'data'    => drupal_render($form),
    );
  }

  // When working with a hidden form, we don't want any CSS or JS to be loaded.
  if (isset($_POST['nocssjs']) && $_POST['nocssjs'] === 'true') {
    drupal_static_reset('drupal_add_css');
    drupal_static_reset('drupal_add_js');
  }

  return array('#type' => 'ajax', '#commands' => $commands);
}

/**
 * Page callback: render a processed text field without transformation filters.
 *
 * @param string $entity_type
 *   The entity type of the entity of which a processed text field is being
 *   rerendered.
 * @param int $entity_id
 *   The entity ID of the entity of which a processed text field is being
 *   rerendered.
 * @param string $field_name
 *   The name of the (processed text) field that that is being rerendered
 * @param string $langcode
 *   The name of the language for which the processed text field is being
 *   rererendered.
 * @param string $view_mode
 *   The view mode the processed text field should be rerendered in.
 * @return array
 *   A render array.
 */
function edit_text_field_render_without_transformation_filters($entity_type, $entity_id, $field_name, $langcode, $view_mode) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    throw new NotFoundHttpException();
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    throw new NotFoundHttpException();
  }

  $entities = entity_load_multiple($entity_type, array($entity_id));
  if (!$entities) {
    throw new NotFoundHttpException();
  }

  $entity = reset($entities);
  if (!$entity) {
    throw new NotFoundHttpException();
  }

  // Ensure a valid language code is set.
  $langcode = field_valid_language($langcode);

  // Ensure access to update this particular entity is granted.
  if (!edit_entity_access('update', $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  $field_instance = field_info_instance($entity_type, $field_name, $entity->bundle());
  if (empty($field_instance)) {
    throw new NotFoundHttpException();
  }

  $commands = array();

  // Render the field in our custom display mode; retrieve the re-rendered
  // markup, this is what we're after.
  $field_output = field_view_field($entity_type, $entity, $field_name, 'edit-render-without-transformation-filters');
  $output = $field_output[0]['#markup'];

  $commands[] = array(
    'command' => 'edit_field_rendered_without_transformation_filters',
    'id'      => "$entity_type:$entity_id:$field_name:$langcode:$view_mode",
    'data'    => $output,
  );

  return array('#type' => 'ajax', '#commands' => $commands);
}
