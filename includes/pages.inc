<?php
/**
 * @file
 * AJAX endpoint to retrieve & save subforms for fields and re-render fields.
 */

/**
 * Implements hook_preprocess_field().
 */
function edit_metadata() {
  $fields = $_POST['fields'];
  $metadata = array();
  if (!isset($fields)) {
    return MENU_NOT_FOUND;
  }

  foreach ($fields as $field) {
    list($entity_type, $entity_id, $field_name, $langcode, $view_mode) = explode(':', $field);

    // Load the entity.
    if (!$entity_type || !entity_get_info($entity_type)) {
      return MENU_NOT_FOUND;
    }
    $entity = entity_load_single($entity_type, $entity_id);
    if (!$entity) {
      return MENU_NOT_FOUND;
    }
    list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

    // Validate the field name and language.
    if (!$field_name || !($instance = field_info_instance($entity_type, $field_name, $bundle))) {
      return MENU_NOT_FOUND;
    }
    if (!$langcode || (field_valid_language($langcode) !== $langcode)) {
      return MENU_NOT_FOUND;
    }

    $metadata[$field] = edit_metadata_genarator($field);
  }

  drupal_json_output($metadata);
  drupal_exit();
}

function edit_metadata_genarator($field) {
  $metadata = array('access' => FALSE);

  list($entity_type, $entity_id, $field_name, $language, $view_mode) = explode(':', $field);

  $entity = entity_load_single($entity_type, $entity_id);
  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

  $instance_info = field_info_instance($entity_type, $field_name, $bundle);
  $display = $instance_info['display']['default'];
  if (array_key_exists($view_mode, $instance_info['display'])) {
    $display = $instance_info['display'][$view_mode];
  }
  $formatter_info = field_info_formatter_types($display['type']);

  $editor = $formatter_info['settings']['edit']['editability'];
  $wysiwyg = $formatter_info['settings']['edit']['wysiwyg'];

  // If directly editable, check the cardinality. If the cardinality is greater
  // than 1, use a form to edit the field.
  if ($editor == 'direct') {
    $field_info = field_info_field($field_name);
    if ($field_info['cardinality'] != 1) {
      $editor = 'form';
    }

    // Only perform the necessary checks (in the next if-test) to see whether
    // direct, WYSIWYG-based editing is possible if the filter_true_wysiwyg module
    // and the indicated WYSIWYG module are installed.
    if ($wysiwyg) {
      $wysiwyg_module = variable_get(EDIT_WYSIWYG_VARIABLE, EDIT_WYSIWYG_DEFAULT);
      if (module_exists('filter_true_wysiwyg') && !module_exists($wysiwyg_module)) {
        $editor = 'form';
      }
      // If still directly editable and the formatter is marked to support WYSIWYG,
      // then check whether we can actually use WYSIWYG.
      else {
        $field = $entity->$field_name;
        $format_id = $field[$language][0]['format'];

        // Update the editability based on the field's settings and the text format.
        module_load_include('inc', 'edit', 'includes/wysiwyg');
        $editor = edit_wysiwyg_analyze_field_editability($entity_type, $entity, $field_name, $format_id);
      }
    }
  }

  // If the formatter doesn't contain the edit property, assume that it is not
  // yet compatible with the Edit module and return early.
  // If editing is explicitly disabled for this field, return early to avoid
  // any further processing.
  if (empty($editor) || $editor == 'disabled') {
    return;
  }

  $entity_access = entity_access('update', $entity_type, $entity);
  $field_access = field_access('edit', $field_name, $entity_type, $entity);
  if ($entity_access && $field_access) {

    // Provide metadata through data- attributes.
    $label = $instance_info['label'];
    $metadata['access'] = TRUE;
    $metadata['label'] = $label;
    $metadata['aria'] = t('Entity @type @id, field @field', array('@type' => $entity_type, '@id' => $entity_id, '@field' => $label));

    if ($editor == 'direct' && $wysiwyg) {
      $editor = 'direct-with-wysiwyg';
      $field = $entity->$field_name;
      $format_id = $field[$language][0]['format'];
      $metadata['format'] = $format_id;

      global $editbar;
      $editbar = TRUE;

      // Let the WYSIWYG editor know the allowed tags.
      $allowed_tags = filter_get_allowed_tags_by_format($format_id);
      $metadata['allowed_tags'] = ($allowed_tags === TRUE) ? '' : implode(',', $allowed_tags);

      // Ensure the WYSIWYG editor has the necessary text format related
      // metadata.
      // @todo: research a more elegant solution, at least document this.
      $wysiwyg_module = variable_get(EDIT_WYSIWYG_VARIABLE, EDIT_WYSIWYG_DEFAULT);
      if (function_exists($function = $wysiwyg_module . '_add_format_settings')) {
        $function();
      }

      // Let the JavaScript logic know whether transformation filters are used
      // in this format, so it can decide whether to re-render the text or not.
      $filter_types = filter_get_filter_types_by_format($format_id);
      $metadata['formatHasTransformations'] = (bool) count(array_intersect(array(FILTER_TYPE_TRANSFORM_DOM, FILTER_TYPE_TRANSFORM_TEXT), $filter_types));

    }
    $metadata['editor'] = $editor;
  }

  return $metadata;
}

/**
 * Page callback: Provides editing of entity fields.
 */
function edit_field_edit($entity_type, $entity_id, $field_name, $langcode = NULL, $view_mode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    return MENU_NOT_FOUND;
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    return MENU_NOT_FOUND;
  }

  $entities = entity_load($entity_type, array($entity_id));
  if (!$entities) {
    return MENU_NOT_FOUND;
  }

  $entity = reset($entities);
  if (!$entity) {
    return MENU_NOT_FOUND;
  }

  if (!isset($langcode) && isset($entity->language)) {
    $langcode = $entity->language;
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    return MENU_ACCESS_DENIED;
  }

  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);
  $display = array();

  // This allows us to have limited support for non-field API fields. Currently,
  // we only have support for node:title, node:author and node:created.
  $subform_id = 'edit_field_edit_form';
  $subforms = array(
    'title' => 'fape_field_edit_node_title_form',
    'author' => 'editfape_field_edit_node_author_form',
    'created' => 'editfape_field_edit_node_created_form',
  );
  if ($entity_type == 'node' && array_key_exists($field_name, $subforms)) {
    $field_instance = TRUE;
    $subform_id = $subforms[$field_name];
    if (!node_access('update', $entity)) {
      return MENU_ACCESS_DENIED;
    }
  }
  else {
    $field_instance = field_info_instance($entity_type, $field_name, $bundle);
    $display = $field_instance['display']['default'];
    if (array_key_exists($view_mode, $field_instance['display'])) {
      $display = $field_instance['display'][$view_mode];
    }
  }

  if (empty($field_instance)) {
    return MENU_NOT_FOUND;
  }

  $form_state = array(
    'entity_type' => $entity_type,
    'entity' => $entity,
    'field_name' => $field_name,
    'langcode' => $langcode,
    'view_mode' => $view_mode,
    'no_redirect' => TRUE,
    'field_instance' => $field_instance,
    'bundle' => $bundle,
    'subform_id' => $subform_id,
  );

  $form = drupal_build_form('edit_field_form', $form_state);

  $commands = array();

  if (!empty($form_state['executed'])) {
    entity_save($entity_type, $form_state['entity']);
    // Reload the entity. This is necessary for some fields; otherwise we'd
    // render the field without the updated values.
    $entity = entity_load($entity_type, array($entity_id));
    $entity = reset($entity);

    // Pseudo-field: title.
    if ($entity_type == 'node' && $field_name == 'title') {
      $node_type = node_type_get_type($entity->type);
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
        'data' => edit_page_title_render($entity->title, $node_type->title_label, $id),
      );
    }
    // Pseudo-fields: name and date.
    elseif ($entity_type == 'node' && $field_name == 'author') {
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
        'data' => edit_node_wrap_name(theme('username', array('account' => $entity)), $id, $langcode, $view_mode),
      );
    }
    elseif ($entity_type == 'node' && $field_name == 'created') {
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
        'data' => edit_node_wrap_date(format_date($entity->created), $id, $langcode, $view_mode),
      );
    }
    // All other fields.
    else {
      $field = field_view_field($entity_type, $entity, $field_name, $view_mode, $langcode);
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
        'data' => drupal_render($field),
      );
    }
  }
  else {
    $commands[] = array(
      'command' => 'editFieldForm',
      'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
      'data' => drupal_render($form),
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
 */
function edit_text_field_render_without_transformation_filters($entity_type, $entity_id, $field_name, $langcode = NULL, $view_mode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    return MENU_NOT_FOUND;
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    return MENU_NOT_FOUND;
  }

  $entities = entity_load($entity_type, array($entity_id));
  if (!$entities) {
    return MENU_NOT_FOUND;
  }

  $entity = reset($entities);
  if (!$entity) {
    return MENU_NOT_FOUND;
  }

  if (!isset($langcode) && isset($entity->language)) {
    $langcode = $entity->language;
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    return MENU_ACCESS_DENIED;
  }

  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

  $field_instance = field_info_instance($entity_type, $field_name, $bundle);
  if (empty($field_instance)) {
    return MENU_NOT_FOUND;
  }

  $commands = array();

  // Render the field in our custom display mode; retrieve the re-rendered
  // markup, this is what we're after.
  $field_output = field_view_field($entity_type, $entity, $field_name, 'edit-render-without-transformation-filters', $langcode);
  // TODO: support multiple value text fields. Change the code below and the JS.
  $output = $field_output[0]['#markup'];

  $commands[] = array(
    'command' => 'editFieldRenderedWithoutTransformationFilters',
    'id' => "$entity_type:$id:$field_name:$langcode:$view_mode",
    'data' => $output,
  );

  return array('#type' => 'ajax', '#commands' => $commands);
}

function edit_field_form($form, &$form_state) {
  $form['#parents'] = array();

  form_load_include($form_state, 'inc', 'edit', 'includes/fape');

  if ($form_state['subform_id']) {
    $form_state['subform_id']($form, $form_state);
  }

  // Add a submit button. Give it a class for easy JavaScript targeting.
  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
    '#attributes' => array('class' => array('edit-form-submit')),
  );

  // Simplify it for optimal in-place use.
  edit_field_form_simplify($form, $form_state);
  return $form;
}


function edit_field_form_simplify(&$form, &$form_state) {
  $field_name = $form_state['field_name'];
  $langcode = $form_state['langcode'];

  $widget_element =& $form[$field_name][$langcode];

  // Hide the field label from displaying within the form, because JavaScript
  // displays the equivalent label that was provided within an HTML data
  // attribute of the field's display element outside of the form. Do this for
  // widgets without child elements (like Option widgets) as well as for ones
  // with per-delta elements. Skip single checkboxes, because their title is
  // key to their UI. Also skip widgets with multiple subelements, because in
  // that case, per-element labeling is informative.
  $num_children = count(element_children($widget_element));
  if ($num_children == 0 && $widget_element['#type'] != 'checkbox') {
    $widget_element['#title_display'] = 'invisible';
  }
  if ($num_children == 1 && isset($widget_element[0]['value'])) {
    // @todo While most widgets name their primary element 'value', not all
    //   do, so generalize this.
    $widget_element[0]['value']['#title_display'] = 'invisible';
  }

  // Adjust textarea elements to fit their content.
  if (isset($widget_element[0]['value']['#type']) && $widget_element[0]['value']['#type'] == 'textarea') {
    $lines = count(explode("\n", $widget_element[0]['value']['#default_value']));
    $widget_element[0]['value']['#rows'] = $lines + 1;
  }
}
