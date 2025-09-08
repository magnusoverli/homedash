import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MainPage from '../MainPage';

describe('MainPage', () => {
  it('renders without crashing', () => {
    render(<MainPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has correct semantic structure', () => {
    render(<MainPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('main-page');

    const container = main.querySelector('.container');
    expect(container).toBeInTheDocument();

    const content = main.querySelector('.main-content');
    expect(content).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<MainPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('main-page');
  });

  it('has container wrapper', () => {
    render(<MainPage />);
    const container = screen.getByRole('main').querySelector('.container');
    expect(container).toBeInTheDocument();
  });

  it('has main content area', () => {
    render(<MainPage />);
    const mainContent = screen.getByRole('main').querySelector('.main-content');
    expect(mainContent).toBeInTheDocument();
  });

  it('content area is initially empty as designed', () => {
    render(<MainPage />);
    const mainContent = screen.getByRole('main').querySelector('.main-content');
    expect(mainContent).toBeEmptyDOMElement();
  });

  it('maintains proper DOM structure for future content', () => {
    render(<MainPage />);
    const main = screen.getByRole('main');

    expect(main.children).toHaveLength(1);
    expect(main.firstElementChild).toHaveClass('container');
    expect(main.firstElementChild.firstElementChild).toHaveClass(
      'main-content'
    );
  });

  it('has semantic main landmark', () => {
    render(<MainPage />);
    const mainLandmark = screen.getByRole('main');
    expect(mainLandmark.tagName.toLowerCase()).toBe('main');
  });
});
