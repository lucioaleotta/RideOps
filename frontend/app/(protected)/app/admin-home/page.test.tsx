import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminHomePage from './page';

jest.mock('../../../../components/access-control-dashboard', () => ({
  AccessControlDashboard: () => <div>AccessControlMock</div>,
}));

jest.mock('../../../../components/owner-activity-dashboard', () => ({
  OwnerActivityDashboard: () => <div>OwnerActivityMock</div>,
}));

describe('AdminHomePage', () => {
  it('shows access control tab by default and switches to owner activity tab', async () => {
    const user = userEvent.setup();

    render(<AdminHomePage />);

    expect(screen.getByText('AccessControlMock')).toBeInTheDocument();
    expect(screen.queryByText('OwnerActivityMock')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Activity Dashboard' }));

    expect(screen.getByText('OwnerActivityMock')).toBeInTheDocument();
    expect(screen.queryByText('AccessControlMock')).not.toBeInTheDocument();
  });
});
