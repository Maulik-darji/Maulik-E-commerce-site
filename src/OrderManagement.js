import React from 'react';

export default function OrderManagement() {
  return (
    <div className="admin-content-card">
      <h1 className="admin-content-title">Order Management</h1>
      <p>This is where you'll manage orders, update status, and handle returns.</p>
      <p>You'll fetch data from a Firestore `orders` collection here.</p>
    </div>
  );
}