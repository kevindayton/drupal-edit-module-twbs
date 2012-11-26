<?php

/**
 * @file
 * Definition of Drupal\edit\Plugin\Type\ProcessedTextPropertyEditorManager.
 */

namespace Drupal\edit\Plugin\Type;

use Drupal\Component\Plugin\PluginManagerBase;
use Drupal\Component\Plugin\Factory\DefaultFactory;
use Drupal\Core\Plugin\Discovery\AlterDecorator;
use Drupal\Core\Plugin\Discovery\AnnotatedClassDiscovery;
use Drupal\Core\Plugin\Discovery\CacheDecorator;

/**
 * ProcessedTextPropertyEditor manager.
 */
class ProcessedTextPropertyEditorManager extends PluginManagerBase {

  /**
   * Overrides Drupal\Component\Plugin\PluginManagerBase::__construct().
   */
  public function __construct() {
    $this->discovery = new AnnotatedClassDiscovery('edit', 'ProcessedTextPropertyEditor');
    $this->discovery = new AlterDecorator($this->discovery, 'edit_wysiwyg');
    $this->discovery = new CacheDecorator($this->discovery, 'edit:wysiwyg');
    $this->factory = new DefaultFactory($this->discovery);
  }

}
