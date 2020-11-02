import { ComponentAspect, ComponentUI, ComponentModel } from '@teambit/component';
import { ComponentTreeAspect, ComponentTreeUI, ComponentTreeNode } from '@teambit/component-tree';
import { Slot, SlotRegistry } from '@teambit/harmony';
import ReactRouterAspect, { RouteSlot, ReactRouterUI } from '@teambit/react-router';
import { Menu } from '@teambit/ui.menu';
import SidebarAspect, { SidebarUI } from '@teambit/sidebar';
import { MenuItemSlot, MenuItem } from '@teambit/ui.main-dropdown';
import { UIAspect, UIRootUI as UIRoot, UIRuntime, UiUI } from '@teambit/ui';
import { GraphAspect, GraphUI } from '@teambit/graph';
import React from 'react';
import { RouteProps } from 'react-router-dom';
import CommandBarAspect, { CommandBarUI, ComponentSearcher, CommandHandler } from '@teambit/command-bar';
import { WorkspaceComponentsDrawer } from './workspace-components.drawer';
import { ComponentTreeWidget } from './component-tree.widget';
import { Workspace } from './ui';
import { WorkspaceAspect } from './workspace.aspect';

export type SidebarWidgetSlot = SlotRegistry<ComponentTreeNode>;

export class WorkspaceUI {
  constructor(
    /**
     * route slot.
     */
    private routeSlot: RouteSlot,

    /**
     * component ui extension.
     */
    private componentUi: ComponentUI,

    /**
     * menu slot
     */
    private menuSlot: RouteSlot,

    private menuItemSlot: MenuItemSlot,

    private sidebar: SidebarUI,

    private sidebarSlot: SidebarWidgetSlot,

    private commandBarUI: CommandBarUI,

    reactRouterUI: ReactRouterUI
  ) {
    this.componentSearcher = new ComponentSearcher(reactRouterUI.navigateTo);
  }

  private setKeyBindHandler: (updated: CommandHandler) => void = () => {};

  /**
   * register a route to the workspace.
   */
  registerRoute(route: RouteProps) {
    this.routeSlot.register(route);
    return this;
  }

  registerSidebarWidget(componentTreeNode: ComponentTreeNode) {
    this.sidebarSlot.register(componentTreeNode);
    return this;
  }

  registerMenuItem = (menuItems: MenuItem[]) => {
    this.menuItemSlot.register(menuItems);
  };

  setComponents = (components: ComponentModel[]) => {
    this.componentSearcher.update(components);
  };

  componentSearcher: ComponentSearcher;

  uiRoot(): UIRoot {
    this.sidebar.registerDrawer(new WorkspaceComponentsDrawer(this.sidebarSlot));
    this.commandBarUI.addSearcher(this.componentSearcher);
    const [setKeyBindHandler] = this.commandBarUI.addCommand({
      id: 'sidebar', // extract to constant!
      handler: () => {},
      displayName: 'Toggle component list',
      keybinding: 's',
    });
    this.setKeyBindHandler = setKeyBindHandler;

    return {
      routes: [
        {
          path: '/',
          children: (
            <Workspace
              menuSlot={this.menuSlot}
              routeSlot={this.routeSlot}
              sidebar={<this.sidebar.render />}
              workspaceUI={this}
              onSidebarTogglerChange={this.setKeyBindHandler}
            />
          ),
        },
      ],
    };
  }

  private menuItems: MenuItem[] = [
    {
      category: 'general',
      title: 'Open command bar',
      keyChar: 'mod + k',
      handler: () => this.commandBarUI?.run('command-bar.open'),
    },
    {
      category: 'general',
      title: 'Toggle component list',
      keyChar: 's',
      handler: () => this.commandBarUI?.run('sidebar'),
    },
  ];

  static dependencies = [
    UIAspect,
    ComponentAspect,
    SidebarAspect,
    ComponentTreeAspect,
    CommandBarAspect,
    ReactRouterAspect,
    GraphAspect,
  ];

  static runtime = UIRuntime;

  static slots = [
    Slot.withType<RouteProps>(),
    Slot.withType<RouteProps>(),
    Slot.withType<ComponentTreeNode>(),
    Slot.withType<MenuItemSlot>(),
  ];

  static async provider(
    [ui, componentUi, sidebar, componentTree, commandBarUI, reactRouterUI, graphUI]: [
      UiUI,
      ComponentUI,
      SidebarUI,
      ComponentTreeUI,
      CommandBarUI,
      ReactRouterUI,
      GraphUI
    ],
    config,
    [routeSlot, menuSlot, menuItemSlot, sidebarSlot]: [RouteSlot, RouteSlot, MenuItemSlot, SidebarWidgetSlot]
  ) {
    componentTree.registerTreeNode(new ComponentTreeWidget());
    sidebarSlot.register(new ComponentTreeWidget());
    graphUI.registerComponentWidget(new ComponentTreeWidget().widget);

    const workspaceUI = new WorkspaceUI(
      routeSlot,
      componentUi,
      menuSlot,
      menuItemSlot,
      sidebar,
      sidebarSlot,
      commandBarUI,
      reactRouterUI
    );
    ui.registerRoot(workspaceUI.uiRoot.bind(workspaceUI));
    workspaceUI.registerMenuItem(workspaceUI.menuItems);

    workspaceUI.menuSlot.register([
      {
        exact: true,
        path: '/',
        children: <Menu menuItemSlot={workspaceUI.menuItemSlot} />,
      },
      {
        path: workspaceUI.componentUi.routePath,
        children: workspaceUI.componentUi.getMenu(WorkspaceAspect.id),
      },
    ]);

    workspaceUI.routeSlot.register({
      path: workspaceUI.componentUi.routePath,
      children: workspaceUI.componentUi.getComponentUI(WorkspaceAspect.id),
    });
    return workspaceUI;
  }
}

export default WorkspaceUI;

WorkspaceAspect.addRuntime(WorkspaceUI);
