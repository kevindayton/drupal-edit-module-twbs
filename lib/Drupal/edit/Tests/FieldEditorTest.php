<?php

/**
 * @file
 * Definition of Drupal\edit\Tests\FieldEditorTest.
 */

namespace Drupal\edit\Tests;

use Drupal\simpletest\WebTestBase;

/**
 * Test field editor associations.
 */
class FieldEditorTest extends WebTestBase {

  /**
   * Use standard profile to build on node types and filters available.
   */
  protected $profile = 'standard';

  /**
   * Modules to enable.
   *
   * @var array
   */
  public static $modules = array('node', 'number', 'edit', 'aloha', 'edit_aloha');

  /**
   * Node to test fields displays on.
   */
  private $node;

  /**
   * Administrator level user to run tests with.
   */
  private $admin_user;

  public static function getInfo() {
    return array(
      'name' => 'Field editor selection',
      'description' => 'Tests field editor selection.',
      'group' => 'Edit',
    );
  }

  function setUp() {
    parent::setUp();

    $filtered_html_format = filter_format_load('filtered_html');
    $this->admin_user = $this->drupalCreateUser(array(
      'administer filters',
      'administer nodes',
      'bypass node access',
      filter_permission_name($filtered_html_format),
    ));
    $this->drupalLogin($this->admin_user);

    // Add test text field.
    $field_name = 'field_test_edit_text_test';
    $field = array(
      'field_name' => $field_name,
      'type' => 'text',
      'cardinality' => 1,
    );
    field_create_field($field);
    $instance = array(
      'entity_type' => 'node',
      'field_name' => $field_name,
      'bundle' => 'article',
      'label' => 'Test text-field',
      'widget' => array(
        'type' => 'text_textfield',
        'weight' => 0,
      ),
      'default_value' => array('Default text'),
    );
    field_create_instance($instance);

    // Add test number field.
    $field_name = 'field_test_edit_number_test';
    $field = array(
      'field_name' => $field_name,
      'type' => 'number_decimal',
      'cardinality' => 1,
      'settings' => array(
        'precision' => 8, 'scale' => 4, 'decimal_separator' => '.',
      )
    );
    field_create_field($field);
    $instance = array(
      'field_name' => $field_name,
      'entity_type' => 'node',
      'label' => 'Test number field',
      'bundle' => 'article',
      'widget' => array(
        'type' => 'number',
      ),
      'display' => array(
        'default' => array(
          'type' => 'number_decimal',
        ),
      ),
      'default_value' => array('12.4'),
    );
    field_create_instance($instance);

    // Create an article node.
    $this->node = $this->drupalCreateNode(array('type' => 'article'));
  }

  function testContent() {
    $default_edit = 'edit-field edit-allowed edit-type-form';
    $fields = array(
      'body' => $default_edit,
      'field_test_edit_number_test' => $default_edit,
      // Edit fields are directly editable, see edit.patch.
      'field_test_edit_text_test' => 'edit-field edit-allowed edit-type-direct',
    );

    // Test editability with fields on the node.
    foreach ($fields as $field_name => $assert) {
      $field_view = field_view_field('node', $this->node, $field_name);
      $content = drupal_render($field_view);
      $this->drupalSetContent($content);
      $this->assertRaw($assert);
    }

    // Turn off filters that are incompatible with in place editing.
    // Add p and br as allowed tags.
    $edit = array(
      'filters[filter_url][status]' => FALSE,
      'filters[filter_autop][status]' => FALSE,
      'filters[filter_html][settings][allowed_html]' => '<a> <em> <strong> <cite> <blockquote> <code> <ul> <ol> <li> <dl> <dt> <dd> <h4> <h5> <h6> <p> <br>',
    );
    $this->drupalPost('admin/config/content/formats/filtered_html', $edit, t('Save configuration'));

    // @todo: this should not pass yet.

    // Test editability with fields on the node.
    foreach ($fields as $field_name => $assert) {
      $field_view = field_view_field('node', $this->node, $field_name);
      $content = drupal_render($field_view);
      $this->drupalSetContent($content);
      $this->assertRaw($assert);
    }

  }
}
