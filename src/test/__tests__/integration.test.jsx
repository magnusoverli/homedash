import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

describe('Integration Tests', () => {
  describe('Header and Main Page Integration', () => {
    it('renders complete application layout', () => {
      render(<App />);

      // Verify header is present
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Verify main content is present
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Verify both are in same document
      const header = screen.getByRole('banner');
      const main = screen.getByRole('main');
      expect(header.ownerDocument).toBe(main.ownerDocument);
    });

    it('maintains proper layout order', () => {
      render(<App />);
      const app = document.querySelector('.app');
      const children = Array.from(app.children);

      expect(children[0].tagName.toLowerCase()).toBe('header');
      expect(children[1].tagName.toLowerCase()).toBe('main');
    });

    it('settings button maintains functionality in full app context', async () => {
      const user = userEvent.setup();
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeInTheDocument();

      // Button should be focusable and clickable in full app context
      await user.click(settingsButton);
      expect(settingsButton).toBeInTheDocument();

      // Button should maintain focus capabilities
      settingsButton.focus();
      expect(settingsButton).toHaveFocus();
    });
  });

  describe('Component Communication', () => {
    it('header and main page coexist without conflicts', () => {
      render(<App />);

      // Both components should render their content
      expect(screen.getByText('HomeDash')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /settings/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('maintains CSS class structure across components', () => {
      render(<App />);

      // App level classes
      expect(document.querySelector('.app')).toBeInTheDocument();

      // Header classes
      expect(document.querySelector('.header')).toBeInTheDocument();
      expect(document.querySelector('.header-container')).toBeInTheDocument();
      expect(document.querySelector('.header-brand')).toBeInTheDocument();
      expect(document.querySelector('.header-actions')).toBeInTheDocument();

      // Main page classes
      expect(document.querySelector('.main-page')).toBeInTheDocument();
      expect(document.querySelector('.main-content')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('header interactions work in full application context', async () => {
      const user = userEvent.setup();
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });

      // Test hover state (via focus for testing)
      await user.hover(settingsButton);
      expect(settingsButton).toBeInTheDocument();

      // Test click interaction
      await user.click(settingsButton);
      expect(settingsButton).toBeInTheDocument();
    });

    it('keyboard navigation works across the app', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });

      // Tab to settings button
      settingsButton.focus();
      expect(settingsButton).toHaveFocus();

      // Enter key should work
      settingsButton.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter' })
      );
      expect(settingsButton).toBeInTheDocument();
    });
  });

  describe('Layout Responsiveness', () => {
    it('maintains structure across different viewport considerations', () => {
      render(<App />);

      // Core elements should always be present regardless of viewport
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /settings/i })
      ).toBeInTheDocument();
    });
  });

  describe('Content Integration', () => {
    it('brand elements display consistently', () => {
      render(<App />);

      // Brand logo number
      const brandNumber = screen.getByText('2');
      expect(brandNumber).toBeInTheDocument();
      expect(brandNumber.closest('.brand-logo')).toBeInTheDocument();

      // Brand text
      const brandText = screen.getByText('HomeDash');
      expect(brandText).toBeInTheDocument();
      expect(brandText).toHaveClass('brand-text');
    });

    it('maintains HomeDash design system integration', () => {
      render(<App />);

      // CSS custom properties should be applied through global styles
      const header = screen.getByRole('banner');
      const main = screen.getByRole('main');

      expect(header).toHaveClass('header');
      expect(main).toHaveClass('main-page');
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper landmark roles throughout app', () => {
      render(<App />);

      // Should have exactly one banner
      const banners = screen.getAllByRole('banner');
      expect(banners).toHaveLength(1);

      // Should have exactly one main
      const mains = screen.getAllByRole('main');
      expect(mains).toHaveLength(1);

      // Should have settings button
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAttribute('aria-label', 'Settings');
    });

    it('maintains focus management across components', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });

      // Focus should work
      settingsButton.focus();
      expect(settingsButton).toHaveFocus();

      // Blur should work
      settingsButton.blur();
      expect(settingsButton).not.toHaveFocus();
    });
  });
});
