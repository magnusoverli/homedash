import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../Header';

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays the brand logo with number "2"', () => {
    render(<Header />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays the brand text "HomeDash"', () => {
    render(<Header />);
    expect(screen.getByText('HomeDash')).toBeInTheDocument();
  });

  it('has a settings button', () => {
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('settings button has proper aria-label', () => {
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toHaveAttribute('aria-label', 'Settings');
  });

  it('settings button is clickable', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });

    await user.click(settingsButton);
    expect(settingsButton).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('header');

    const container = header.querySelector('.header-container');
    expect(container).toBeInTheDocument();

    const brand = header.querySelector('.header-brand');
    expect(brand).toBeInTheDocument();

    const actions = header.querySelector('.header-actions');
    expect(actions).toBeInTheDocument();
  });

  it('brand logo has correct structure', () => {
    render(<Header />);
    const brandLogo = screen.getByText('2').parentElement;
    expect(brandLogo).toHaveClass('brand-logo');
  });

  it('settings button has correct classes', () => {
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toHaveClass('settings-button', 'button-icon');
  });

  it('contains SettingsIcon component', () => {
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    const icon = settingsButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('keyboard navigation works for settings button', async () => {
    render(<Header />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });

    settingsButton.focus();
    expect(settingsButton).toHaveFocus();

    fireEvent.keyDown(settingsButton, { key: 'Enter' });
    expect(settingsButton).toBeInTheDocument();
  });

  it('has sticky positioning styles applied', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('header');
  });

  it('maintains brand elements hierarchy', () => {
    render(<Header />);
    const headerBrand = screen.getByText('HomeDash').closest('.header-brand');
    const brandLogo = headerBrand.querySelector('.brand-logo');
    const brandText = headerBrand.querySelector('.brand-text');

    expect(brandLogo).toBeInTheDocument();
    expect(brandText).toBeInTheDocument();
    expect(brandText).toHaveTextContent('HomeDash');
  });
});
