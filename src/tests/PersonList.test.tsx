import React from 'react';
import { render, screen } from '@testing-library/react';
import "@testing-library/jest-dom";
import { PersonList } from '@/components/PersonList';

describe('PersonList Component', () => {
  const props = {
    id: '1',
    name: 'John Doe',
    position: 'Software Engineer',
    email: 'john.doe@example.com',
  };

  test('should render name, position, and email correctly', () => {
    render(<PersonList {...props} />);

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Position:/)).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  test('should render default placeholder values for position and email', () => {
    render(<PersonList {...props} position="-" email="-" />);

    const dashes = screen.getAllByText('-');
    expect(dashes).toHaveLength(2);
  });
});
