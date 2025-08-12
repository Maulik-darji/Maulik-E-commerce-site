import React, { useState, useEffect } from 'react';

// Import the PRODUCTS array from your main App.js
// For now, we'll create a local state to manage products
export default function ProductManagement({ db }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    discount: '',
    stock: '',
    image: null,
    imagePreview: null
  });

  // For now, we'll use localStorage to persist products
  // In a real app, you'd use Firebase
  useEffect(() => {
    const savedProducts = localStorage.getItem('adminProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  const saveProductsToStorage = (productsList) => {
    localStorage.setItem('adminProducts', JSON.stringify(productsList));
    // Notify the main website that products have been updated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('productsUpdated'));
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewProduct(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotalPrice = () => {
    const price = parseFloat(newProduct.price) || 0;
    const discount = parseFloat(newProduct.discount) || 0;
    return Math.max(0, price - discount);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!newProduct.title || !newProduct.description || !newProduct.price || !newProduct.stock) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Generate a unique ID for the product
      const productId = Date.now().toString();
      
      // In a real app, you would upload the image to Firebase Storage first
      // For now, we'll use a placeholder image URL
      const imageUrl = newProduct.imagePreview || 'https://via.placeholder.com/300x300?text=Product+Image';
      
      const productData = {
        id: productId,
        title: newProduct.title,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        discount: parseFloat(newProduct.discount) || 0,
        stock: parseInt(newProduct.stock),
        image: imageUrl,
        createdAt: new Date().toISOString(),
        status: 'live'
      };

      // Add to local state
      const updatedProducts = [...products, productData];
      setProducts(updatedProducts);
      saveProductsToStorage(updatedProducts);
      
      alert('Product added successfully!');
      setShowAddForm(false);
      setNewProduct({
        title: '',
        description: '',
        price: '',
        discount: '',
        stock: '',
        image: null,
        imagePreview: null
      });
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        setLoading(true);
        
        // Remove from local state
        const updatedProducts = products.filter(product => product.id !== productId);
        setProducts(updatedProducts);
        saveProductsToStorage(updatedProducts);
        
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      setLoading(true);
      
      // Update status in local state
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, status: currentStatus === 'live' ? 'draft' : 'live' }
          : product
      );
      
      setProducts(updatedProducts);
      saveProductsToStorage(updatedProducts);
      
      const newStatus = currentStatus === 'live' ? 'draft' : 'live';
      alert(`Product status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content-card">
        <div className="loading-spinner">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="admin-content-card">
      <div className="admin-header">
        <h1 className="admin-content-title">Product Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add Product
        </button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="add-product-form">
          <h2>Add New Product</h2>
          <form onSubmit={handleAddProduct}>
            <div className="form-group">
              <label htmlFor="image">Product Image (Optional)</label>
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {newProduct.imagePreview && (
                <div className="image-preview">
                  <img src={newProduct.imagePreview} alt="Preview" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="title">Product Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newProduct.title}
                onChange={handleInputChange}
                placeholder="Enter product title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Product Description *</label>
              <textarea
                id="description"
                name="description"
                value={newProduct.description}
                onChange={handleInputChange}
                placeholder="Enter product description"
                rows="4"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">Price (₹) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={newProduct.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="discount">Discount (₹)</label>
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  value={newProduct.discount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock">Stock Quantity *</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={newProduct.stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            {newProduct.price && (
              <div className="price-summary">
                <strong>Price Summary:</strong>
                <div>Original Price: ₹{newProduct.price}</div>
                <div>Discount: ₹{newProduct.discount || 0}</div>
                <div>Final Price: ₹{calculateTotalPrice()}</div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Adding...' : 'Add Product'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="products-list">
        <h2>Current Products ({products.length})</h2>
        {products.length === 0 ? (
          <p className="no-products">No products found. Add your first product above!</p>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card-admin">
                <div className="product-image">
                  <img src={product.image} alt={product.title} />
                  <div className="product-status">
                    <span className={`status-badge ${product.status}`}>
                      {product.status}
                    </span>
                  </div>
                </div>
                
                <div className="product-info">
                  <h3>{product.title}</h3>
                  <p className="product-description">{product.description}</p>
                  
                  <div className="product-details">
                    <div className="price-info">
                      <span className="original-price">₹{product.price}</span>
                      {product.discount > 0 && (
                        <span className="discount-price">₹{product.price - product.discount}</span>
                      )}
                    </div>
                    
                    <div className="stock-info">
                      <strong>Stock:</strong> {product.stock} units
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <button
                      className={`btn btn-sm ${product.status === 'live' ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleStatus(product.id, product.status)}
                      disabled={loading}
                    >
                      {product.status === 'live' ? 'Set to Draft' : 'Set to Live'}
                    </button>
                    
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}