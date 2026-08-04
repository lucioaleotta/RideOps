import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../login-form';

describe('LoginForm Component', () => {
  it('renders login form with user ID and password inputs', () => {
    render(<LoginForm />);
    
    expect(screen.getByPlaceholderText(/user id/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accedi/i })).toBeInTheDocument();
  });

  it('displays validation error when form is submitted empty', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/user id.*required/i)).toBeInTheDocument();
    });
  });

  it('accepts non-email user ID values', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const userIdInput = screen.getByPlaceholderText(/user id/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    await user.type(userIdInput, 'admin');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/invalid.*email/i)).not.toBeInTheDocument();
    });
  });

  it('enables submit button when form is valid', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/user id/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'admin');
    await user.type(passwordInput, 'password123');
    
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state while submitting', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    
    const emailInput = screen.getByPlaceholderText(/user id/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'admin');
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
    
    const emailInput = screen.getByPlaceholderText(/user id/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /accedi/i });
    
    await user.type(emailInput, 'admin');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/credenziali non valide/i)).toBeInTheDocument();
    });
  });
});
