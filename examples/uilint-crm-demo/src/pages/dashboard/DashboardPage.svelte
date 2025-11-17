<script lang="ts">
  const statusCards = [
    { title: 'Deployments', body: '24 deployments this week.' },
    { title: 'Coverage', body: 'Tests improved to 92%.' },
    { title: 'Alerts', body: '3 open alerts require attention.' },
    { title: 'Latency', body: 'P95 improved by 8%.' },
  ];

  let isModalVisible = false;

  function toggleModal(open: boolean): void {
    isModalVisible = open;
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  />
</svelte:head>

<div class="dashboard-page">
  <header id="dashboard-header">
    <div>
      <strong>uilint dashboard</strong>
      <small>Team overview</small>
    </div>
    <button id="open-insights" type="button" on:click={() => toggleModal(true)}>
      Open insights
    </button>
  </header>

  <main id="dashboard-content">
    <section id="filters-panel">
      <div class="filter-field">
        <label for="range-select">Range</label>
        <select id="range-select">
          <option>Last 7 days</option>
          <option selected>Last 30 days</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="team-select">Team</label>
        <select id="team-select">
          <option>Platform</option>
          <option>Design</option>
          <option>Growth</option>
        </select>
      </div>
      <button class="primary" type="button">Apply</button>
    </section>

    <section class="status-grid" id="status-grid">
      {#each statusCards as card}
        <article class="status-card">
          <div class="status-icon"></div>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
        </article>
      {/each}
    </section>
  </main>

  <div class:visible={isModalVisible} class="modal-backdrop" id="modal-backdrop">
    <section id="insights-modal">
      <h2>Insights report</h2>
      <div class="modal-field">
        <label for="insight-name">Report name</label>
        <input id="insight-name" value="Weekly summary" />
      </div>
      <div class="modal-field">
        <label for="insight-range">Time range</label>
        <select id="insight-range">
          <option>7 days</option>
          <option selected>30 days</option>
        </select>
      </div>
      <div class="modal-field">
        <label for="insight-team">Team</label>
        <select id="insight-team">
          <option>Platform</option>
          <option>Design</option>
          <option>Growth</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="secondary" type="button" id="close-modal" on:click={() => toggleModal(false)}>
          Cancel
        </button>
        <button class="primary" type="button">Generate</button>
      </div>
    </section>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #f4f6fb;
    font-family: 'Inter', system-ui, sans-serif;
    color: #0f172a;
  }

  .dashboard-page {
    min-height: 100vh;
    background: #f4f6fb;
  }

  #dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 72px;
    background: #111827;
    color: #fff;
  }

  #dashboard-header small {
    margin-left: 12px;
    opacity: 0.7;
  }

  #open-insights {
    padding: 12px 16px;
    border-radius: 12px;
    border: none;
    background: #4f46e5;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  #dashboard-content {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }

  #filters-panel {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  input,
  select {
    border-radius: 12px;
    border: 1px solid #cbd5f5;
    padding: 10px 12px;
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

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 24px;
    margin-bottom: 32px;
    justify-content: center;
  }

  .status-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
  }

  .status-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #6366f1, #38bdf8);
    margin-bottom: 16px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .modal-backdrop.visible {
    display: flex;
  }

  #insights-modal {
    width: 420px;
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
  }

  .modal-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .secondary {
    background: #e2e8f0;
    border: none;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
  }
  @media (max-width: 900px) {
    #dashboard-content {
      padding: 24px 16px 48px;
    }

    #filters-panel {
      align-items: stretch;
    }

    .status-grid {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
  }

  @media (max-width: 600px) {
    #dashboard-header {
      flex-direction: column;
      height: auto;
      padding: 16px;
      gap: 12px;
    }

    #filters-panel {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .status-card {
      padding: 20px;
    }
  }
</style>

