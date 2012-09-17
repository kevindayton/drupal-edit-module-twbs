<?php
/**
 * @file
 * Integrates the Edit module with the Navigation bar or Shortcut module.
 *
 * Contains all the logic for altering the toolbar, including some hooks. Hence,
 * this include file must *always* be loaded by the .module file.
 */

/**
 * Implements hook_page_alter().
 */
function edit_page_alter(&$page) {
  if (!((module_exists('shortcut') && module_exists('toolbar')) || module_exists('navbar'))) {
    // If the combination of shortcut+toolbar is not enabled or the navbar
    // module is not enabled, users will not see anything of the UI, so inform
    // them they need to enable either. Do this as a drupal_set_message() for
    // now.
    drupal_set_message(t('Edit module requires either Shortcut and Toolbar modules or the Mobile friendly navigation toolbar module to be enabled. See <a href="@url">@url</a> for integration with other modules.', array('@url' => 'http://drupal.org/node/1688166')), 'error');
  }

  // Don't provide a view/edit toggle on admin pages, node/add and node/%/edit pages.
  if (arg(0) == 'admin' || (arg(0) == 'node' && arg(1) == 'add') || (arg(0) == 'node' && arg(2) == 'edit')) {
    return;
  }

  // NAVBAR module integration.
  // If the navbar is available, add a pre-render function to display the
  // view/edit mode toggle, but only on node pages.
  // @todo: add support for other entity types.
  if (isset($page['page_bottom']['navbar']) && arg(0) == 'node') {
    $page['page_bottom']['navbar']['#pre_render'][] = 'edit_navbar_pre_render';
  }

  // TOOLBAR module integration.
  if (isset($page['page_top']['toolbar'])) {
    // Remove the toolbar drawer toggle by overriding Toolbar module's
    // pre-render function with our own implementation.
    if (isset($page['page_top']['toolbar']['#pre_render'][0]) && $page['page_top']['toolbar']['#pre_render'][0] == 'toolbar_pre_render') {
      $page['page_top']['toolbar']['#pre_render'][0] = 'edit_override_toolbar_pre_render';
    }
    // Replace the Shortcut module's toolbar pre-render function with our own
    // implementation.
    if (isset($page['page_top']['toolbar']['#pre_render'][1]) && $page['page_top']['toolbar']['#pre_render'][1] == 'shortcut_toolbar_pre_render') {
      $page['page_top']['toolbar']['#pre_render'][1] = 'edit_override_shortcut_toolbar_pre_render';
    }
    // If the toolbar is available, add a pre-render function to display the
    // view/edit mode toggle.
    $page['page_top']['toolbar']['#pre_render'][] = 'edit_toolbar_pre_render';
  }
}

/**
 * Implements hook_module_implements_alter().
 */
function edit_module_implements_alter(&$implementations, $hook) {
  // TOOLBAR module integration.
  // Run Edit module's hook_page_alter() after the one in Shortcut module, but
  // retain the ordering. We need this to be able to override Shortcut modules's
  // #pre_render callback for rendering the shortcuts into the toolbar.
  if ($hook == 'page_alter') {
    unset($implementations['edit']);
    $index = array_search('shortcut', array_keys($implementations));
    $implementations = array_slice($implementations, 0, $index + 1) + array('edit' => FALSE) + array_slice($implementations, $index + 1);
  }
}

/**
 * Pre-render function to add the view/edit mode toggle widget to the toolbar.
 */
function edit_navbar_pre_render($navbar) {
  // NAVBAR module integration.

  // If we have primary tabs and a View tab is present, remove that tab in favor
  // of our view/edit tabs. The edit tab is renamed elsewhere to avoid confusion.
  if (!empty($navbar['navbar_drawer'][0]['#primary'])) {
    foreach ($navbar['navbar_drawer'][0]['#primary'] as $index => $item) {
      if ($item['#link']['title'] == t('View')) {
        unset($navbar['navbar_drawer'][0]['#primary'][$index]);
      }
    }
  }

  // Prepend edit module links to the navbar.
  $navbar_drawer_prepend = edit_toggle_links();
  $navbar['navbar_drawer'] = array_merge($navbar_drawer_prepend, $navbar['navbar_drawer']);
  return $navbar;
}

/**
 * Pre-render function to add the view/edit mode toggle widget to the toolbar.
 */
function edit_toolbar_pre_render($toolbar) {
  // TOOLBAR module integration.
  $toolbar['toolbar_drawer'][] = edit_toggle_links('toolbar-shortcuts toolbar-edit-toggle', '');
  return $toolbar;
}

/**
 * Overrides the Toolbar module's toolbar pre-render function.
 */
function edit_override_toolbar_pre_render($toolbar) {
  // TOOLBAR module integration.

  // The original.
  $toolbar = toolbar_pre_render($toolbar);

  // The toolbar should never be collapsed.
  $_COOKIE['Drupal_toolbar_collapsed'] = 0;

  // Now we remove the toolbar drawer toggle.
  unset($toolbar['toolbar_toggle']);

  $toolbar['#attached']['css'][] = drupal_get_path('module', 'edit') . '/css/toolbar-overrides.css';

  return $toolbar;
}

/**
 * Overrides the Shortcut module's toolbar pre-render function.
 */
function edit_override_shortcut_toolbar_pre_render($toolbar) {
  // TOOLBAR module integration.

  // The original.
  $toolbar = shortcut_toolbar_pre_render($toolbar);

  // Put the shortcuts themselves *after* their configure link in the HTML,
  // because we'll float them right.
  $shortcuts = array_shift($toolbar['toolbar_drawer'][0]);
  array_push($toolbar['toolbar_drawer'][0], $shortcuts);

  $toolbar['#attached']['css'][] = drupal_get_path('module', 'edit') . '/css/toolbar-overrides.css';

  return $toolbar;
}

/**
 * Builds a render array for common toggle links for different toolbars.
 */
function edit_toggle_links($wrapper_classes = '', $ul_classes = 'tabs primary') {
  return array(
    'view_edit_toggle' => array(
      '#prefix' => '<div class="' . $wrapper_classes . '"><h2 class="element-invisible">' . t('In-place edit operations') . '</h2><ul class="' . $ul_classes . '" id="edit_view-edit-toggles">',
      '#suffix' => '</ul></div>',
      'content' => array(
        array(
          '#theme' => 'menu_local_task',
          '#link' => array('title' => t('View'), 'href' => $_GET['q'], 'localized_options' => array('attributes' => array('class' => array('edit_view-edit-toggle', 'edit-view')))),
          '#active' => TRUE,
        ),
        array(
          '#theme' => 'menu_local_task',
          '#link' => array('title' => t('Quick edit'), 'href' => '#', 'localized_options' => array('attributes' => array('class' => array('edit_view-edit-toggle', 'edit-edit')))),
        ),
      ),
      '#attached' => array(
        'library' => array(
          array('edit', 'edit'),
        ),
      ),
    ),
  );
}
