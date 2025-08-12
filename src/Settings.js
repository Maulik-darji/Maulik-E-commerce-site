import React from 'react';

export default function Settings() {
  return (
    <div className="admin-content-card">
      <h1 className="admin-content-title">Settings</h1>
      <p>Manage website settings like the logo, contact information, and security rules here.</p>
      <p>You can use a new `settings` Firestore collection for this.</p>
    </div>
  );
}