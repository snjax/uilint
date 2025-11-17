<script lang="ts">
  const navItems = [
    { label: 'Overview', href: '#overview' },
    { label: 'Docs', href: '#docs' },
    { label: 'Dashboard', href: '/dashboard.html' },
  ];

  function openDashboard(): void {
    const target = '/dashboard.html';
    const isJsdom = window.navigator?.userAgent?.toLowerCase().includes('jsdom');
    if (!isJsdom) {
      try {
        window.location.href = target;
      } catch {
        // ignore – mostly relevant for automation or locked-down browsers.
      }
    }
    window.dispatchEvent(new CustomEvent('uilint:navigate', { detail: target }));
  }

  function requestHelp(): void {
    alert('Our support team will reach out to you shortly.');
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  />
</svelte:head>

<div class="page-shell">
  <header id="app-header">
    <div class="logo">uilint example</div>
    <button id="help-button" class="primary" type="button" on:click={requestHelp}>
      Need help?
    </button>
  </header>

  <nav id="primary-nav">
    {#each navItems as item}
      <a class="nav-item" href={item.href}>{item.label}</a>
    {/each}
  </nav>

  <main id="content">
    <section class="hero-card" id="hero-panel">
      <h1>Welcome back</h1>
      <p>Log in to continue to the dashboard.</p>
      <form id="login-form">
        <label for="email">Email</label>
        <input id="email" type="email" placeholder="team@example.com" />
        <label for="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" />
        <button class="primary" type="button" id="login-button" on:click={openDashboard}>
          Sign in
        </button>
      </form>
    </section>
  </main>

  <footer id="app-footer">© {new Date().getFullYear()} uilint demo</footer>
</div>

<style>
  :global(:root) {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f5f5f5;
    color: #0f172a;
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
  }

  .page-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  #app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 72px;
    background: #0f172a;
    color: #fff;
    flex-wrap: wrap;
    gap: 12px;
  }

  #primary-nav {
    display: flex;
    gap: 24px;
    background: #fff;
    padding: 16px 32px;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    color: #0f172a;
    text-decoration: none;
    font-weight: 600;
  }

  #content {
    padding: 48px 32px;
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .hero-card {
    max-width: 480px;
    background: #fff;
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 15px 40px rgba(15, 23, 42, 0.1);
    margin: 0 auto;
    width: 100%;
  }

  #login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
  }

  label {
    font-size: 14px;
    font-weight: 600;
  }

  input {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #cbd5f5;
    font-size: 16px;
  }

  .primary {
    padding: 12px 16px;
    border-radius: 12px;
    border: none;
    background: #4f46e5;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  #app-footer {
    padding: 16px 32px;
    text-align: center;
    background: #0f172a;
    color: #fff;
  }

  @media (max-width: 960px) {
    #content {
      padding: 32px 16px 48px;
    }

    #primary-nav {
      gap: 16px;
    }
  }

  @media (max-width: 600px) {
    #app-header {
      flex-direction: column;
      height: auto;
      padding: 16px;
    }

    .hero-card {
      padding: 24px;
    }

    .primary {
      width: 100%;
    }
  }
</style>

