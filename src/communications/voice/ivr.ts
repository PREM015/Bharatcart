/**
 * Interactive Voice Response (IVR)
 * Purpose: Automated phone menu system
 */

import { logger } from '@/lib/logger';

export interface IVRMenu {
  id: string;
  greeting: string;
  options: IVROption[];
}

export interface IVROption {
  key: string;
  label: string;
  action: 'submenu' | 'transfer' | 'voicemail' | 'hangup' | 'callback';
  target?: string;
}

export class IVRSystem {
  private menus: Map<string, IVRMenu>;

  constructor() {
    this.menus = new Map();
    this.setupDefaultMenu();
  }

  /**
   * Setup default IVR menu
   */
  private setupDefaultMenu(): void {
    this.addMenu({
      id: 'main',
      greeting: 'Thank you for calling. Press 1 for sales, 2 for support, 3 for billing, 0 for operator.',
      options: [
        { key: '1', label: 'Sales', action: 'transfer', target: 'sales-queue' },
        { key: '2', label: 'Support', action: 'transfer', target: 'support-queue' },
        { key: '3', label: 'Billing', action: 'transfer', target: 'billing-queue' },
        { key: '0', label: 'Operator', action: 'transfer', target: 'operator' },
        { key: '9', label: 'Callback', action: 'callback' },
      ],
    });
  }

  /**
   * Add menu
   */
  addMenu(menu: IVRMenu): void {
    this.menus.set(menu.id, menu);
    logger.info('IVR menu added', { id: menu.id });
  }

  /**
   * Get menu
   */
  getMenu(id: string): IVRMenu | undefined {
    return this.menus.get(id);
  }

  /**
   * Process key press
   */
  processInput(menuId: string, key: string): {
    action: string;
    target?: string;
  } | null {
    const menu = this.menus.get(menuId);
    if (!menu) return null;

    const option = menu.options.find(o => o.key === key);
    if (!option) return null;

    logger.info('IVR input processed', { menuId, key, action: option.action });

    return {
      action: option.action,
      target: option.target,
    };
  }

  /**
   * Generate TwiML for menu
   */
  generateTwiML(menuId: string): string {
    const menu = this.menus.get(menuId);
    if (!menu) return '';

    return `
      <Response>
        <Gather numDigits="1" action="/ivr/process">
          <Say>${menu.greeting}</Say>
        </Gather>
      </Response>
    `;
  }
}

export default IVRSystem;
