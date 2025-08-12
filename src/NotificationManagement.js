import React, { useState } from 'react';

export default function NotificationManagement({ sendNotificationToAllUsers }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message.');
      return;
    }

    setIsSending(true);
    setProgressText('Preparing…');
    try {
      await sendNotificationToAllUsers({ title: title.trim(), message: message.trim() }, (t) => setProgressText(t));
      setTitle('');
      setMessage('');
      setProgressText('Done');
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setIsSending(false);
      setTimeout(() => setProgressText(''), 1000);
    }
  };

  return (
    <div className="admin-content-card">
      <h2 className="admin-content-title">Send Notifications to All Users</h2>
      <p className="admin-content-subtitle">
        Send important announcements, updates, or promotional messages to all registered users.
      </p>
      
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label htmlFor="notification-title">Notification Title *</label>
          <input
            id="notification-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title..."
            required
            maxLength={100}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="notification-message">Notification Message *</label>
          <textarea
            id="notification-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter notification message..."
            required
            rows={6}
            maxLength={500}
          />
          <small className="form-help">
            {message.length}/500 characters
          </small>
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSending || !title.trim() || !message.trim()}
          >
            {isSending ? 'Sending...' : 'Send Notification to All Users'}
          </button>
          {isSending && (
            <span style={{ marginLeft: 12 }}>{progressText}</span>
          )}
        </div>
      </form>
      
      <div className="notification-guidelines">
        <h3>Guidelines for Notifications:</h3>
        <ul>
          <li>Keep titles concise and clear (max 100 characters)</li>
          <li>Write informative but brief messages (max 500 characters)</li>
          <li>Use notifications for important announcements only</li>
          <li>Consider the timing and frequency of notifications</li>
          <li>Ensure content is relevant to all users</li>
        </ul>
      </div>
    </div>
  );
}
