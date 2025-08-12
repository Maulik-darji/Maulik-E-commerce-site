import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminOverview from './AdminOverview';
import UserManagement from './UserManagement';
import ProductManagement from './ProductManagement';
import OrderManagement from './OrderManagement';
import PaymentManagement from './PaymentManagement';
import CustomerSupport from './CustomerSupport';
import Reports from './Reports';
import Settings from './Settings';
import NotificationManagement from './NotificationManagement';

export default function AdminDashboard({ db, auth, appId, sendNotificationToAllUsers }) {
  const location = useLocation();

  const navLinks = [
    { to: '/admin', text: 'Quick Stats', icon: '📈' },
    { to: '/admin/users', text: 'Users Management', icon: '👤' },
    { to: '/admin/products', text: 'Product Management', icon: '📦' },
    { to: '/admin/orders', text: 'Order Management', icon: '🛒' },
    { to: '/admin/payments', text: 'Payment Management', icon: '💳' },
    { to: '/admin/support', text: 'Customer Support', icon: '💬' },
    { to: '/admin/reports', text: 'Reports & Analytics', icon: '📊' },
    { to: '/admin/notifications', text: 'Send Notifications', icon: '🔔' },
    { to: '/admin/settings', text: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="admin-dashboard-container">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2 className="admin-title">Admin Panel</h2>
        </div>
        <ul className="admin-nav-list">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`admin-nav-link ${location.pathname === link.to ? 'active' : ''}`}
              >
                <span className="admin-nav-icon">{link.icon}</span>
                {link.text}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="admin-main-content">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<UserManagement db={db} auth={auth} appId={appId} />} />
          <Route path="products" element={<ProductManagement db={db} />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="support" element={<CustomerSupport />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<NotificationManagement sendNotificationToAllUsers={sendNotificationToAllUsers} />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}