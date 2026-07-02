import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExportIcon } from './ExportIcon';

jest.mock('../../services/exportService', () => ({
  downloadServicesExport: jest.fn().mockResolvedValue(undefined)
}));

const services = [
  { id: 1, startAt: '2026-06-01T10:00:00' },
  { id: 2, startAt: '2026-06-05T11:00:00' }
];

describe('ExportIcon', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  it('renderizza pulsante export con aria-label e touch target >= 44', () => {
    render(
      <ExportIcon
        services={services}
        onBeforeExport={jest.fn()}
        onExportError={jest.fn()}
        onExportSuccess={jest.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /esporta lista servizi/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
  });

  it('su desktop apre popover', async () => {
    render(
      <ExportIcon
        services={services}
        onBeforeExport={jest.fn()}
        onExportError={jest.fn()}
        onExportSuccess={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /esporta lista servizi/i }));

    expect(await screen.findByRole('dialog', { name: /esporta lista servizi/i })).toBeInTheDocument();
    expect(screen.getByText(/ultimo mese/i)).toBeInTheDocument();
  });

  it('su mobile apre bottom sheet', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

    render(
      <ExportIcon
        services={services}
        onBeforeExport={jest.fn()}
        onExportError={jest.fn()}
        onExportSuccess={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /esporta lista servizi/i }));

    const dialog = await screen.findByRole('dialog', { name: /esporta lista servizi/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chiudi export/i })).toBeInTheDocument();
  });

  it('tooltip presente su desktop e assente su mobile', async () => {
    const { unmount } = render(
      <ExportIcon
        services={services}
        onBeforeExport={jest.fn()}
        onExportError={jest.fn()}
        onExportSuccess={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /esporta lista servizi/i })).toHaveAttribute('title', 'Esporta in Excel / CSV');

    unmount();
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

    render(
      <ExportIcon
        services={services}
        onBeforeExport={jest.fn()}
        onExportError={jest.fn()}
        onExportSuccess={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /esporta lista servizi/i })).not.toHaveAttribute('title');
    });
  });
});
