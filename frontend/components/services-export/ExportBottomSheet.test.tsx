import { fireEvent, render, screen } from '@testing-library/react';
import { ExportBottomSheet } from './ExportBottomSheet';

const services = [
  { id: 1, startAt: '2026-01-10T09:00:00' },
  { id: 2, startAt: '2026-03-10T09:00:00' }
];

describe('ExportBottomSheet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    window.dispatchEvent(new Event('resize'));
  });

  it('renderizza e apre su mobile', async () => {
    render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(await screen.findByRole('dialog', { name: /esporta lista servizi/i })).toBeInTheDocument();
  });

  it('tap overlay chiude', () => {
    const onClose = jest.fn();
    const { container } = render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={onClose}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const overlay = container.querySelector('.services-export-sheet-backdrop');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it('swipe down chiude', () => {
    const onClose = jest.fn();
    const { container } = render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={onClose}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const sheet = container.querySelector('.services-export-sheet') as HTMLElement;
    fireEvent.touchStart(sheet, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(sheet, { touches: [{ clientY: 220 }] });
    fireEvent.touchEnd(sheet);

    expect(onClose).toHaveBeenCalled();
  });

  it('blocca scroll body quando aperto e lo ripristina quando chiuso', () => {
    const { rerender } = render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <ExportBottomSheet
        open={false}
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('focus iniziale sul pulsante chiudi e date picker nativi', async () => {
    render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const closeButton = await screen.findByRole('button', { name: /chiudi export/i });
    expect(closeButton).toHaveFocus();

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement[];
    expect(dateInputs[0].type).toBe('date');
    expect(dateInputs[1].type).toBe('date');
  });

  it('non renderizza su desktop >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    window.dispatchEvent(new Event('resize'));

    const { container } = render(
      <ExportBottomSheet
        open
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
