import React from 'react';

export default function PaymentManagement() {
  return (
    <div className="admin-content-card">
      <h1 className="admin-content-title">Payment Management</h1>
      <p>This is where you'll manage payment methods, view transaction history, and handle refunds.</p>
      <p>You'll fetch data from a Firestore `payments` collection here.</p>
    </div>
  );
}
