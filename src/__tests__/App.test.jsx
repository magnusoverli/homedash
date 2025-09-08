import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays Header component', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('HomeDash')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays MainPage component', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has correct app structure', () => {
    render(<App />);
    const appDiv = document.querySelector('.app');
    expect(appDiv).toBeInTheDocument();

    const header = appDiv.querySelector('header');
    const main = appDiv.querySelector('main');

    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });

  it('header appears before main in DOM order', () => {
    render(<App />);
    const appDiv = document.querySelector('.app');
    const children = Array.from(appDiv.children);

    expect(children[0].tagName.toLowerCase()).toBe('header');
    expect(children[1].tagName.toLowerCase()).toBe('main');
  });

  it('settings button is accessible in integrated app', () => {
    render(<App />);
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('maintains proper layout hierarchy', () => {
    render(<App />);

    // Check header content
    expect(screen.getByText('HomeDash')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /settings/i })
    ).toBeInTheDocument();

    // Check main content area exists
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
  });

  it('app has required CSS class', () => {
    render(<App />);
    const appDiv = document.querySelector('.app');
    expect(appDiv).toHaveClass('app');
  });

  it('follows semantic HTML structure', () => {
    render(<App />);

    // Should have exactly one banner (header)
    const banners = screen.getAllByRole('banner');
    expect(banners).toHaveLength(1);

    // Should have exactly one main
    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
  });
});
