<?php

/**
 * @file
 * Definition of Drupal\edit\Tests\EditorSelectionTest.
 */

namespace Drupal\edit\Tests;

use Drupal\simpletest\WebTestBase;

/**
 * Test in-place field editor selection.
 */
class EditorSelectionTest extends WebTestBase {
  var $default_storage = 'field_sql_storage';

  /**
   * Modules to enable.
   *
   * @var array
   */
  public static $modules = array('field_test', 'filter', 'field', 'number', 'text', 'edit', 'edit_test');

  public static function getInfo() {
    return array(
      'name' => 'In-place field editor selection',
      'description' => 'Tests in-place field editor selection.',
      'group' => 'Edit',
    );
  }

  /**
   * Sets the default field storage backend for fields created during tests.
   */
  function setUp() {
    parent::setUp();

    // Set default storage backend.
    variable_set('field_storage_default', $this->default_storage);
  }

  /**
   * Creates a field and an instance of it.
   *
   * @param string $field_name
   *   The field name.
   * @param string $type
   *   The field type.
   * @param int $cardinality
   *   The field's cardinality.
   * @param string $label
   *   The field's label (used everywhere: widget label, formatter label).
   * @param array $instance_settings
   * @param string $widget_type
   *   The widget type.
   * @param array $widget_settings
   *   The widget settings.
   * @param string $formatter_type
   *   The formatter type.
   * @param array $formatter_settings
   *   The formatter settings.
   */
  function createFieldWithInstance($field_name, $type, $cardinality, $label, $instance_settings, $widget_type, $widget_settings, $formatter_type, $formatter_settings) {
    $field = $field_name . '_field';
    $this->$field = array(
      'field_name' => $field_name,
      'type' => $type,
      'cardinality' => $cardinality,
    );
    $this->$field_name = field_create_field($this->$field);

    $instance = $field_name . '_instance';
    $this->$instance = array(
      'field_name' => $field_name,
      'entity_type' => 'test_entity',
      'bundle' => 'test_bundle',
      'label' => $label,
      'description' => $label,
      'weight' => mt_rand(0, 127),
      'settings' => $instance_settings,
      'widget' => array(
        'type' => $widget_type,
        'label' => $label,
        'settings' => $widget_settings,
      ),
      'display' => array(
        'default' => array(
          'label' => 'above',
          'type' => $formatter_type,
          'settings' => $formatter_settings
        ),
      ),
    );
    field_create_instance($this->$instance);
  }

  /**
   * Retrieves the FieldInstance object for the given field and returns the
   * editor that Edit selects.
   */
  function getSelectedEditor($items, $field_name, $display = 'default') {
    $field_instance = field_info_instance('test_entity', $field_name, 'test_bundle');
    return _edit_get_field_editor($items, $field_instance, $field_instance['display'][$display]['type']);
  }

  /**
   * Tests a textual field, without/with text processing, with cardinality 1 and
   * >1, always without a WYSIWYG editor present.
   */
  function testText() {
    $field_name = 'field_text';
    $this->createFieldWithInstance(
      $field_name, 'text', 1, 'Simple text field',
      // Instance settings.
      array('text_processing' => 0),
      // Widget type & settings.
      'text_textfield',
      array('size' => 42),
      // 'default' formatter type & settings.
      'text_default',
      array()
    );

    // Pretend there is an entity with these items for the field.
    $items = array('Hello, world!');

    // Editor selection without text processing, with cardinality 1.
    $this->assertEqual('direct', $this->getSelectedEditor($items, $field_name), "Without text processing, cardinality 1, the 'direct' editor is selected.");

    // Editor selection with text processing, cardinality 1.
    $this->field_text_instance['settings']['text_processing'] = 1;
    field_update_instance($this->field_text_instance);
    $this->assertEqual('form', $this->getSelectedEditor($items, $field_name), "With text processing, cardinality 1, the 'form' editor is selected.");

    // Editor selection without text processing, cardinality 1 (again).
    $this->field_text_instance['settings']['text_processing'] = 0;
    field_update_instance($this->field_text_instance);
    $this->assertEqual('direct', $this->getSelectedEditor($items, $field_name), "Without text processing again, cardinality 1, the 'direct' editor is selected.");

    // Editor selection without text processing, cardinality >1
    $items[] = 'Hallo, wereld!';
    $this->field_text_field['cardinality'] = 2;
    field_update_field($this->field_text_field);
    $this->assertEqual('form', $this->getSelectedEditor($items, $field_name), "Without text processing, cardinality >1, the 'form' editor is selected.");

    // Editor selection with text processing, cardinality >1
    $this->field_text_instance['settings']['text_processing'] = 1;
    field_update_instance($this->field_text_instance);
    $this->assertEqual('form', $this->getSelectedEditor($items, $field_name), "With text processing, cardinality >1, the 'form' editor is selected.");
  }

  /**
   * Tests a textual field, without/with text processing, with cardinality 1 and
   * >1, always with a WYSIWYG editor present.
   */
  function testTextWysiwyg() {
    // @todo: the exact same test cases as in testText(), but now with a WYSIWYG
    // editor plugin present (cfr. Aloha.php). That plug-in's
    // checkFormatCompatibility() method should always return TRUE. Whereever
    // the result is 'direct' in testText(), it should be 'direct-with-wysiwyg'
    // here.
    // Then we should reconfigure that plug-in in this test to  always return
    // FALSE. Now the result should be 'form' wherever it was
    // 'direct-with-wysiwyg'.
  }

  /**
   * Tests a number field, with cardinality 1 and >1.
   */
  function testNumber() {
    $field_name = 'field_nr';
    $this->createFieldWithInstance(
      $field_name, 'number_integer', 1, 'Simple number field',
      // Instance settings.
      array(),
      // Widget type & settings.
      'number',
      array(),
      // 'default' formatter type & settings.
      'number_integer',
      array()
    );

    // Pretend there is an entity with these items for the field.
    $items = array(42, 43);

    // Editor selection with cardinality 1.
    $this->assertEqual('form', $this->getSelectedEditor($items, $field_name), "With cardinality 1, the 'form' editor is selected.");

    // Editor selection with cardinality >1.
    $this->field_nr_field['cardinality'] = 2;
    field_update_field($this->field_nr_field);
    $this->assertEqual('form', $this->getSelectedEditor($items, $field_name), "With cardinality >1, the 'form' editor is selected.");
  }

}
