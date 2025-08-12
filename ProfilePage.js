// New component for user's profile page
function ProfilePage({ user, onLogout }) {
  const navigate = useNavigate();
  if (!user) {
    navigate('/account/login');
    return null;
  }
  
  const handleEditAddress = () => {
    navigate('/profile/edit-address');
  };

  // Function to format the address
  const formatAddress = (address) => {
    if (!address || typeof address !== 'object') {
      return 'Not provided';
    }
    const { flat, street, city, state, pincode } = address;
    return (
      <p>
        {flat}<br />
        {street}<br />
        {city}, {state} - {pincode}
      </p>
    );
  };

  return (
    <main className="main-content profile-page">
      <h1 className="main-title">Your Profile</h1>
      <div className="profile-card">
        <div className="profile-info">
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Address:</strong> {formatAddress(user.address)}</p>
        </div>
        <div className="profile-actions mt-4">
          <button onClick={handleEditAddress} className="btn btn-product-detail">
            Edit Address
          </button>
          <button onClick={onLogout} className="btn btn-buy">
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}