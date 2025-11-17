import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/pages/login/LoginPage.svelte';

describe('LoginPage component', () => {
  it('renders nav items and hero content without starting any servers', () => {
    render(LoginPage);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /(overview|docs|dashboard)/i })).toHaveLength(3);
  });

  it('emits a navigation event when clicking the sign-in button', async () => {
    render(LoginPage);
    const navigationSpy = vi.fn();
    window.addEventListener('uilint:navigate', navigationSpy, { once: true });

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(navigationSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: '/dashboard.html' }));
  });
});

