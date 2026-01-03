import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils/testUtils';
import { StatsCard } from '../StatsCard';
import { Users } from 'lucide-react';

describe('StatsCard', () => {
  it('renders with title and value', () => {
    render(
      <StatsCard
        title="Total Users"
        value="100"
        icon={<Users size={24} />}
        colorClass="bg-blue-100"
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders icon correctly', () => {
    render(
      <StatsCard
        title="Total Users"
        value="100"
        icon={<Users size={24} data-testid="users-icon" />}
        colorClass="bg-blue-100"
      />
    );

    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });
});

