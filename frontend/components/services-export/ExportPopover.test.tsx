import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExportPopover } from './ExportPopover';

const services = [
  { id: 1, startAt: '2026-01-10T09:00:00' },
  { id: 2, startAt: '2026-03-10T09:00:00' }
];

describe('ExportPopover', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  it('chiude con click outside', () => {
    const onClose = jest.fn();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);

    render(
      <ExportPopover
        open
        anchorRef={{ current: anchor }}
        services={services}
        loadingFormat={null}
        onClose={onClose}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('chiude con Escape', () => {
    const onClose = jest.fn();
    const anchor = createRef<HTMLElement>();
    anchor.current = document.createElement('button');

    render(
      <ExportPopover
        open
        anchorRef={anchor}
        services={services}
        loadingFormat={null}
        onClose={onClose}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('selezione rapida aggiorna date', () => {
    const anchor = createRef<HTMLElement>();
    anchor.current = document.createElement('button');

    render(
      <ExportPopover
        open
        anchorRef={anchor}
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ultimi 6 mesi/i }));

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('modifica date deseleziona periodo rapido', () => {
    const anchor = createRef<HTMLElement>();
    anchor.current = document.createElement('button');

    render(
      <ExportPopover
        open
        anchorRef={anchor}
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const threeMonths = screen.getByRole('button', { name: /ultimi 3 mesi/i });
    expect(threeMonths.className).toContain('is-active');

    const dateField = screen.getAllByLabelText(/da|a/i)[0];
    fireEvent.change(dateField, { target: { value: '2026-02-01' } });

    expect(threeMonths.className).not.toContain('is-active');
  });

  it('non renderizza su viewport mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    const anchor = createRef<HTMLElement>();
    anchor.current = document.createElement('button');

    const { container } = render(
      <ExportPopover
        open
        anchorRef={anchor}
        services={services}
        loadingFormat={null}
        onClose={jest.fn()}
        onExport={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
