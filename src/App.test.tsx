import React from 'react';
import { render } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App';

vi.mock('@ionic/react', () => ({
  IonApp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IonRouterOutlet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  setupIonicReact: vi.fn(),
}));

vi.mock('@ionic/react-router', () => ({
  IonReactRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-router-dom', () => ({
  Route: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Redirect: () => null,
}));

test('renders without crashing', () => {
  const { baseElement } = render(<App />);
  expect(baseElement).toBeDefined();
});
