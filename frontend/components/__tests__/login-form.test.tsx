import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../login-form';

describe('LoginForm Component', () => {
  it('renders login form with email and password inputs', () => {
    render(<LoginForm />);
    
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accedi/i })).toBeInTheDocument();
  });

  it('displays validation error when form is submitted empty', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });
  });

  it('displays validation error for invalid email format', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
    });
  });

  it('enables submit button when form is valid', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state while submitting', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    // Check for loading indicator
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accedi/i })).toBeDisabled();
    });
  });

  it('displays error message on login failure', async () => {
    // Mock API error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Credenziali non valide' }),
      })
    ) as jest.Mock;

    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/credenziali non valide/i)).toBeInTheDocument();
    });
  });
});
