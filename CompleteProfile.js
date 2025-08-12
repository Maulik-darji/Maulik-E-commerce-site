// New component for completing user profile
function CompleteProfile({ user, onUpdateProfile }) {
  const navigate = useNavigate();
  // Update state to handle individual address fields
  const [flat, setFlat] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flat || !street || !city || !state || !pincode) {
      alert("Please fill in all address fields.");
      return;
    }
    const fullAddress = { flat, street, city, state, pincode };
    await onUpdateProfile({ address: fullAddress });
    alert("Profile updated successfully!");
    navigate("/");
  };

  return (
    <main className="main-content profile-complete">
      <h1 className="main-title">Complete Your Profile</h1>
      <p className="text-center mb-6">
        Hello {user?.firstName || user?.email}! Please provide your delivery address to continue.
      </p>
      <form onSubmit={handleSubmit} className="auth-form max-w-sm mx-auto">
        <div className="form-group">
          <label htmlFor="flat">Flat / House / Apartment Number</label>
          <input
            id="flat"
            type="text"
            placeholder="e.g., Flat No. 302, House No. 15A"
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="street">Street / Locality / Area / Colony / Sector</label>
          <input
            id="street"
            type="text"
            placeholder="e.g., MG Road, Sector 22, Green Park"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="city">City / Town / Village</label>
          <input
            id="city"
            type="text"
            placeholder="e.g., Mumbai, Pune, Delhi"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State / Union Territory</label>
          <input
            id="state"
            type="text"
            placeholder="e.g., Maharashtra, Karnataka"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="pincode">Pincode / ZIP code</label>
          <input
            id="pincode"
            type="text"
            placeholder="e.g., 400001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn auth-btn">
          Save Address
        </button>
      </form>
    </main>
  );
}