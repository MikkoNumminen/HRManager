import React from 'react';
import { render, screen } from '@testing-library/react';
import "@testing-library/jest-dom";
import { PersonList } from '@/components/PersonList';

describe('PersonList Component', () => {
  test('should render the name correctly', () => {
    const props = {
      id: '1',
      name: 'John Doe',
      position: 'Software Engineer',
      email: 'john.doe@example.com',
    };

    render(<PersonList {...props} />);

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('should render the position correctly', () => {
    const props = {
      id: '1',
      name: 'John Doe',
      position: 'Software Engineer',
      email: 'john.doe@example.com',
    };

    render(<PersonList {...props} />);

    expect(screen.getByText(/Position:/)).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  test('should render the email correctly', () => {
    const props = {
      id: '1',
      name: 'John Doe',
      position: 'Software Engineer',
      email: 'john.doe@example.com',
    };

    render(<PersonList {...props} />);

    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });
});
