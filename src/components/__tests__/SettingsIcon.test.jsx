import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SettingsIcon from '../SettingsIcon';

describe('SettingsIcon', () => {
  it('renders without crashing', () => {
    render(<SettingsIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has correct default size', () => {
    render(<SettingsIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('accepts custom size prop', () => {
    render(<SettingsIcon size={32} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('accepts custom color prop', () => {
    const customColor = '#ff0000';
    render(<SettingsIcon color={customColor} />);
    const paths = document.querySelectorAll('path');
    paths.forEach(path => {
      expect(path).toHaveAttribute('stroke', customColor);
    });
  });

  it('uses currentColor as default color', () => {
    render(<SettingsIcon />);
    const paths = document.querySelectorAll('path');
    paths.forEach(path => {
      expect(path).toHaveAttribute('stroke', 'currentColor');
    });
  });

  it('has proper SVG structure', () => {
    render(<SettingsIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('has correct stroke properties', () => {
    render(<SettingsIcon />);
    const paths = document.querySelectorAll('path');
    paths.forEach(path => {
      expect(path).toHaveAttribute('stroke-width', '2');
      expect(path).toHaveAttribute('stroke-linecap', 'round');
      expect(path).toHaveAttribute('stroke-linejoin', 'round');
    });
  });

  it('maintains accessibility with aria-hidden', () => {
    render(<SettingsIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
