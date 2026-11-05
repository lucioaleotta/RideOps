import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { joinPhone, parsePhone, PhoneInput, PhonePrefix } from '../phone-input';

const PREFIXES: PhonePrefix[] = [
  { codiceIso2: 'IT', nomePaese: 'Italia', prefisso: '+39', principale: true },
  { codiceIso2: 'US', nomePaese: 'Stati Uniti', prefisso: '+1', principale: true },
  { codiceIso2: 'CA', nomePaese: 'Canada', prefisso: '+1', principale: false },
  { codiceIso2: 'BS', nomePaese: 'Bahamas', prefisso: '+1242', principale: true },
  { codiceIso2: 'GB', nomePaese: 'Regno Unito', prefisso: '+44', principale: true },
  { codiceIso2: 'SM', nomePaese: 'San Marino', prefisso: '+378', principale: true }
];

describe('parsePhone', () => {
  it('separa prefisso e numero mantenendo la formattazione', () => {
    const result = parsePhone('+39 335 1122334', PREFIXES);
    expect(result.prefix?.codiceIso2).toBe('IT');
    expect(result.national).toBe('335 1122334');
  });

  it('sceglie il prefisso più lungo e il paese principale a parità di prefisso', () => {
    expect(parsePhone('+1 242 5551234', PREFIXES).prefix?.codiceIso2).toBe('BS');
    expect(parsePhone('+1 2125551234', PREFIXES).prefix?.codiceIso2).toBe('US');
  });

  it('lascia invariato un numero senza prefisso o con prefisso sconosciuto', () => {
    expect(parsePhone('335 1122334', PREFIXES)).toEqual({ prefix: null, national: '335 1122334' });
    expect(parsePhone('+999 123', PREFIXES)).toEqual({ prefix: null, national: '+999 123' });
  });
});

describe('joinPhone', () => {
  it('unisce prefisso e numero in un unico campo', () => {
    expect(joinPhone(PREFIXES[0], '335 1122334')).toBe('+39 335 1122334');
  });

  it('restituisce stringa vuota se manca il numero e rimuove caratteri non ammessi', () => {
    expect(joinPhone(PREFIXES[0], '  ')).toBe('');
    expect(joinPhone(PREFIXES[0], '33a5(11)')).toBe('+39 33511');
  });
});

describe('PhoneInput', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => PREFIXES }) as unknown as typeof fetch;
  });

  function Harness({ initial = '' }: { initial?: string }) {
    const [value, setValue] = useState(initial);
    return (
      <>
        <label>
          Telefono
          <PhoneInput value={value} onChange={setValue} />
        </label>
        <output data-testid="value">{value}</output>
      </>
    );
  }

  it('mostra prefisso predefinito e unisce il numero digitato', async () => {
    render(<Harness />);

    expect(screen.getByRole('combobox', { name: /prefisso internazionale/i })).toHaveTextContent('+39');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '335 1122334' } });

    expect(screen.getByTestId('value')).toHaveTextContent('+39 335 1122334');
  });

  it('mostra il numero esistente separato dal prefisso', async () => {
    render(<Harness initial="+44 7700 900123" />);

    expect(await screen.findByDisplayValue('7700 900123')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /prefisso internazionale/i })).toHaveTextContent('+44');
  });

  it('mantiene il prefisso digitato e lo separa dal numero nazionale', () => {
    render(<Harness />);
    const phoneField = screen.getByRole('textbox');

    fireEvent.change(phoneField, { target: { value: '+' } });
    expect(phoneField).toHaveValue('+');
    fireEvent.change(phoneField, { target: { value: '+4' } });
    expect(phoneField).toHaveValue('+4');
    fireEvent.change(phoneField, { target: { value: '+44 7700 900123' } });

    expect(screen.getByTestId('value')).toHaveTextContent('+44 7700 900123');
    expect(phoneField).toHaveValue('7700 900123');
    expect(screen.getByRole('combobox', { name: /prefisso internazionale/i })).toHaveTextContent('+44');
  });

  it('cambia prefisso dal selettore con ricerca e aggiorna il valore', async () => {
    const user = userEvent.setup();
    render(<Harness initial="+39 335 1122334" />);

    await user.click(screen.getByRole('combobox', { name: /prefisso internazionale/i }));
    await user.type(screen.getByRole('searchbox', { name: /cerca paese o prefisso/i }), 'regno');
    const list = screen.getByRole('listbox', { name: /prefissi internazionali/i });
    await user.click(within(list).getByRole('option', { name: /regno unito/i }));

    expect(screen.getByTestId('value')).toHaveTextContent('+44 335 1122334');
    expect(screen.getByRole('combobox', { name: /prefisso internazionale/i })).toHaveTextContent('+44');
  });

  it('mantiene aperto il selettore se il viewport mobile cambia dimensione', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: /prefisso internazionale/i }));
    fireEvent.resize(window);

    expect(screen.getByRole('listbox', { name: /prefissi internazionali/i })).toBeInTheDocument();
  });

  it('con campo vuoto emette stringa vuota anche dopo aver scelto un prefisso', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: /prefisso internazionale/i }));
    await user.click(screen.getByRole('option', { name: /stati uniti/i }));

    expect(screen.getByTestId('value').textContent).toBe('');
    expect(screen.getByRole('combobox', { name: /prefisso internazionale/i })).toHaveTextContent('+1');
  });
});
