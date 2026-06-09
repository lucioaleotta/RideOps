"use client";

import { useState } from 'react';
import { AccessControlDashboard } from '../../../../components/access-control-dashboard';
import { OwnerActivityDashboard } from '../../../../components/owner-activity-dashboard';

type AdminPanelTab = 'access-control' | 'owner-activity';

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState<AdminPanelTab>('access-control');

  return (
    <main style={{ display: 'grid', gap: 16 }}>
      <section
        aria-label="Admin dashboard tabs"
        className="dashboard-card"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('access-control')}
            className={activeTab === 'access-control' ? 'primary-button' : 'logout-button'}
            aria-pressed={activeTab === 'access-control'}
          >
            Access Control
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('owner-activity')}
            className={activeTab === 'owner-activity' ? 'primary-button' : 'logout-button'}
            aria-pressed={activeTab === 'owner-activity'}
          >
            Activity Dashboard
          </button>
        </div>
      </section>

      {activeTab === 'access-control' ? (
        <section aria-label="Access control dashboard">
          <AccessControlDashboard />
        </section>
      ) : (
        <section aria-label="Owner activity dashboard">
          <OwnerActivityDashboard />
        </section>
      )}
    </main>
  );
}
