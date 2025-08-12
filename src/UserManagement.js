import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function UserManagement({ db, auth, appId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from public collection with appId:', appId);
      
      // Read from public users collection
      const publicUsersCollection = collection(db, `artifacts/${appId}/publicUsers`);
      const publicUsersSnapshot = await getDocs(publicUsersCollection);
      
      if (!publicUsersSnapshot.empty) {
        const userList = publicUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          profile: doc.data()
        }));
        console.log('Fetched users from public collection:', userList);
        setUsers(userList);
      } else {
        console.log('No users found in public collection');
        setUsers([]);
        setError("No users found. This might be because:");
      }
      
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (db && appId) {
      fetchUsers();
    }
  }, [db, appId]);

  const handleToggleActive = async (userId, status) => {
    try {
      const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${userId}`);
      await updateDoc(publicUserDocRef, {
        status: status === 'active' ? 'disabled' : 'active'
      });
      
      fetchUsers(); // Refresh list
      alert("User status updated successfully!");
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Failed to update user status: " + err.message);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (window.confirm(`Are you sure you want to delete the account for ${email}? This removes their public profile and private data. To delete the Auth user record, a Cloud Function will be attempted.`)) {
      try {
        // 0) Try Cloud Function to delete Auth user + data if deployed
        try {
          const functions = getFunctions();
          const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
          await deleteUserAccount({ uid: userId, appId });
          alert('User fully deleted via Cloud Function (Auth + Firestore).');
          await fetchUsers();
          return;
        } catch (fnErr) {
          console.warn('Cloud Function deleteUserAccount not available or failed, falling back to Firestore-only deletion:', fnErr?.message || fnErr);
        }

        // 1) Delete from public users collection
        const publicUserDocRef = doc(db, `artifacts/${appId}/publicUsers/${userId}`);
        await deleteDoc(publicUserDocRef);

        // 2) Best-effort delete of private user data (requires rules permitting admin access)
        const privateProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'details');
        const privateCartDocRef = doc(db, `artifacts/${appId}/users/${userId}/cart`, 'items');
        try {
          await deleteDoc(privateProfileDocRef);
        } catch (e) {
          console.warn('Could not delete private profile doc (likely rules):', e?.message || e);
        }
        try {
          await deleteDoc(privateCartDocRef);
        } catch (e) {
          console.warn('Could not delete private cart doc (likely rules):', e?.message || e);
        }

        alert("User data deleted from Firestore. If the Auth user still appears, deploy the deleteUserAccount Cloud Function to remove the Auth record.");
        
        fetchUsers(); // Refresh list
      } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user: " + err.message);
      }
    }
  };

  if (loading) return <div className="admin-content-card"><p>Loading users...</p></div>;
  if (error) return (
    <div className="admin-content-card">
      <p className="error">{error}</p>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Why are no users showing?</h3>
        <p>This happens because:</p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li><strong>New users</strong> will automatically be added to the public collection</li>
          <li><strong>Existing users</strong> need to be migrated to the public collection</li>
          <li><strong>Firestore rules</strong> need to allow reading from the public collection</li>
        </ul>
        <p><strong>Solution:</strong> Create a new user account or wait for existing users to log in again (which will create public entries).</p>
      </div>
    </div>
  );

  return (
    <div className="admin-content-card">
      <h1 className="admin-content-title">Users Management</h1>
      {users.length === 0 ? (
        <div>
          <p>No users found in the public collection.</p>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>To see users here:</h3>
            <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li><strong>Create a new user account</strong> - it will automatically appear here</li>
              <li><strong>Have existing users log in again</strong> - this will create public entries</li>
              <li><strong>Check your Firestore rules</strong> - ensure they allow reading from <code>artifacts/{appId}/publicUsers</code></li>
            </ol>
          </div>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  {user.profile?.firstName && user.profile?.lastName 
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user.profile?.firstName || 'N/A'
                  }
                </td>
                <td>{user.profile?.email || 'N/A'}</td>
                <td>{user.profile?.role || 'user'}</td>
                <td>{user.profile?.status || 'active'}</td>
                <td>
                  <button
                    onClick={() => handleToggleActive(user.id, user.profile?.status)}
                    className="btn btn-sm btn-action"
                  >
                    {user.profile?.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.profile?.email)}
                    className="btn btn-sm btn-delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}