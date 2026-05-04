# Vendor API - Frontend Implementation Guide

## Quick Start (Copy-Paste Ready Code)

### 1. Check Vendor Exists

```javascript
// React/Next.js Example
import { useState } from 'react';

function VendorLogin() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckVendor = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/check-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      if (data.exists) {
        // Redirect to OTP login
        window.location.href = `/vendor/login?mobile=${mobileNumber}`;
      } else {
        // Redirect to registration
        window.location.href = `/vendor/register?mobile=${mobileNumber}`;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="tel"
        placeholder="Enter mobile number"
        value={mobileNumber}
        onChange={(e) => setMobileNumber(e.target.value)}
        maxLength="10"
      />
      <button onClick={handleCheckVendor} disabled={loading}>
        {loading ? 'Checking...' : 'Continue'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default VendorLogin;
```

---

### 2. OTP Login Flow

```javascript
// OTP Screen Component
import { useState } from 'react';

function OTPLogin({ mobile }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    setError('');
    setSending(true);

    try {
      const response = await fetch('/api/vendor/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile })
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        alert('OTP sent to your mobile');
        // For testing, check console: [SIMULATION] Vendor OTP: 1234
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send OTP');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile, otp })
      });

      const data = await response.json();

      if (data.success) {
        // Store token and vendor info
        localStorage.setItem('vendor_token', data.token);
        localStorage.setItem('vendor_id', data.vendor.vendorId);
        localStorage.setItem('vendor_email', data.vendor.email);
        
        // Redirect to dashboard
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Verification failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p>Enter OTP sent to {mobile}</p>

      {!otpSent && (
        <button onClick={handleSendOTP} disabled={sending}>
          {sending ? 'Sending OTP...' : 'Send OTP'}
        </button>
      )}

      {otpSent && (
        <>
          <input
            type="text"
            placeholder="Enter 4-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 4))}
            maxLength="4"
          />
          <p style={{ fontSize: '12px', color: 'gray' }}>
            Test OTP: 1234
          </p>
          <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 4}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default OTPLogin;
```

---

### 3. Registration - Step 1

```javascript
// Step 1: Basic Information
import { useState } from 'react';
import { useRouter } from 'next/router';

function RegisterStep1({ initialMobile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    mobileNumber: initialMobile || '',
    ownerName: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/register/step-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (data.success) {
        // Store for next steps
        sessionStorage.setItem('vendor_id', data.vendorId);
        sessionStorage.setItem('registration_step', 1);
        
        // Go to step 2
        router.push('/vendor/register/step-2');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Step 1 of 3: Basic Information</h2>

      <div>
        <label>Mobile Number</label>
        <input
          type="tel"
          name="mobileNumber"
          value={form.mobileNumber}
          onChange={handleChange}
          disabled
          required
        />
        <small>Pre-filled from login</small>
      </div>

      <div>
        <label>Owner Name *</label>
        <input
          type="text"
          name="ownerName"
          placeholder="Enter your full name"
          value={form.ownerName}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label>Email Address *</label>
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Continue to Step 2'}
      </button>
    </form>
  );
}

export default RegisterStep1;
```

---

### 4. Registration - Step 2

```javascript
// Step 2: Business Details
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

function RegisterStep2() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [form, setForm] = useState({
    storeName: '',
    category: '',
    storeAbout: '',
    state: '',
    district: '',
    mandal: '',
    thumbnailUrl: '',
    bannerUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = sessionStorage.getItem('vendor_id');
    if (!id) {
      router.push('/vendor/register');
      return;
    }
    setVendorId(id);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/register/step-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, ...form })
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('registration_step', 2);
        router.push('/vendor/register/step-3');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save business details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Step 2 of 3: Business Details</h2>

      <div>
        <label>Store Name *</label>
        <input
          type="text"
          name="storeName"
          placeholder="e.g., Raj's Electronics"
          value={form.storeName}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label>Category *</label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          <option value="">Select Category</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Food & Beverages">Food & Beverages</option>
          <option value="Beauty & Wellness">Beauty & Wellness</option>
          <option value="Home & Garden">Home & Garden</option>
          <option value="Sports & Outdoor">Sports & Outdoor</option>
          <option value="Books & Media">Books & Media</option>
        </select>
      </div>

      <div>
        <label>Store Description *</label>
        <textarea
          name="storeAbout"
          placeholder="Tell us about your store (min. 10 characters)"
          value={form.storeAbout}
          onChange={handleChange}
          rows={4}
          required
        />
      </div>

      <div className="location-section">
        <h4>Location</h4>

        <div>
          <label>State *</label>
          <select
            name="state"
            value={form.state}
            onChange={handleChange}
            required
          >
            <option value="">Select State</option>
            <option value="Telangana">Telangana</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Karnataka">Karnataka</option>
            {/* Add more states */}
          </select>
        </div>

        <div>
          <label>District *</label>
          <input
            type="text"
            name="district"
            placeholder="e.g., Hyderabad"
            value={form.district}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Mandal *</label>
          <input
            type="text"
            name="mandal"
            placeholder="e.g., Khairatabad"
            value={form.mandal}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="media-section">
        <h4>Store Media</h4>

        <div>
          <label>Thumbnail Image URL</label>
          <input
            type="text"
            name="thumbnailUrl"
            placeholder="Upload to S3 first and paste URL"
            value={form.thumbnailUrl}
            onChange={handleChange}
          />
          <small>(Square 1:1 ratio, PNG or JPG)</small>
        </div>

        <div>
          <label>Banner Image URL</label>
          <input
            type="text"
            name="bannerUrl"
            placeholder="Upload to S3 first and paste URL"
            value={form.bannerUrl}
            onChange={handleChange}
          />
          <small>(Wide 16:9 ratio, recommended 1920x1080)</small>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
        >
          Back
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Continue to Step 3'}
        </button>
      </div>
    </form>
  );
}

export default RegisterStep2;
```

---

### 5. Registration - Step 3

```javascript
// Step 3: Final Details
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

function RegisterStep3() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [form, setForm] = useState({
    fullAddress: '',
    agentCode: ''
  });
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = sessionStorage.getItem('vendor_id');
    if (!id) {
      router.push('/vendor/register');
      return;
    }
    setVendorId(id);
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates([longitude, latitude]); // [lng, lat]
          alert('Location captured!');
        },
        (error) => {
          alert('Error getting location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation not supported');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/vendor/register/step-3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          fullAddress: form.fullAddress,
          locationCoordinates: coordinates,
          agentCode: form.agentCode || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.clear();
        alert('Registration submitted successfully!');
        router.push('/vendor/wait-approval');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to submit registration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Step 3 of 3: Final Details</h2>

      <div>
        <label>Full Address *</label>
        <textarea
          name="fullAddress"
          placeholder="123 Main Street, Opp. Railway Station, City, State, PIN"
          value={form.fullAddress}
          onChange={handleChange}
          rows={3}
          required
        />
        <small>Include street, landmark, city, state, and postal code</small>
      </div>

      <div>
        <label>Business Location</label>
        <button
          type="button"
          onClick={getLocation}
          disabled={loading}
        >
          📍 Get Current Location
        </button>
        {coordinates && (
          <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
            <p>Coordinates captured:</p>
            <p>Latitude: {coordinates[1]}</p>
            <p>Longitude: {coordinates[0]}</p>
          </div>
        )}
      </div>

      <div>
        <label>Agent Code (Optional)</label>
        <input
          type="text"
          name="agentCode"
          placeholder="Ask your agent for code (if applicable)"
          value={form.agentCode}
          onChange={handleChange}
        />
        <small>Leave blank if you don't have an agent</small>
      </div>

      <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '5px' }}>
        <p>
          ✅ By submitting this form, your application will be sent for admin review.
          You'll receive an email once approved.
        </p>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
        >
          Back
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Registration'}
        </button>
      </div>
    </form>
  );
}

export default RegisterStep3;
```

---

### 6. Utility Functions

```javascript
// apiClient.js - Reusable API calls

export const vendorAPI = {
  async checkVendor(mobileNumber) {
    const response = await fetch('/api/vendor/check-vendor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber })
    });
    return response.json();
  },

  async sendOtp(mobileNumber) {
    const response = await fetch('/api/vendor/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber })
    });
    return response.json();
  },

  async verifyOtp(mobileNumber, otp) {
    const response = await fetch('/api/vendor/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, otp })
    });
    return response.json();
  },

  async registerStep1(mobileNumber, ownerName, email) {
    const response = await fetch('/api/vendor/register/step-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, ownerName, email })
    });
    return response.json();
  },

  async registerStep2(vendorId, data) {
    const response = await fetch('/api/vendor/register/step-2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, ...data })
    });
    return response.json();
  },

  async registerStep3(vendorId, data) {
    const response = await fetch('/api/vendor/register/step-3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, ...data })
    });
    return response.json();
  }
};

// Usage:
// const result = await vendorAPI.checkVendor('9398447214');
```

---

### 7. URL Routing Setup

```javascript
// routes structure for Next.js

pages/
├── vendor/
│   ├── login/
│   │   └── index.js          // OTP login screen
│   ├── register/
│   │   ├── index.js          // Step 1
│   │   ├── step-2.js         // Step 2
│   │   ├── step-3.js         // Step 3
│   │   └── success.js        // Success screen
│   ├── wait-approval.js      // Waiting for admin approval
│   └── dashboard/
│       └── index.js          // Dashboard (requires token)
```

---

## Key Implementation Tips

1. **Pre-fill Mobile Number**
   ```javascript
   const mobile = router.query.mobile;
   // Pre-fill in form
   ```

2. **Store Session Data**
   ```javascript
   sessionStorage.setItem('vendor_id', vendorId);
   // Retrieve: sessionStorage.getItem('vendor_id')
   ```

3. **Store Authentication Token**
   ```javascript
   localStorage.setItem('vendor_token', token);
   // Use in headers: Authorization: Bearer {token}
   ```

4. **Validate Mobile Number**
   ```javascript
   const validateMobile = (num) => /^[6-9]\d{9}$/.test(num);
   ```

5. **Validate Email**
   ```javascript
   const validateEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
   ```

6. **Error Handling Priority**
   ```javascript
   if (!response.ok) {
     // Check HTTP status
   }
   if (!data.success) {
     // Check API success flag
   }
   // Handle network errors in catch block
   ```

---

## Testing Checklist

- [ ] Mobile number validation works on frontend
- [ ] Can check vendor with test mobile
- [ ] OTP login flow works end-to-end
- [ ] Registration Step 1 creates vendor
- [ ] Registration Step 2 saves business details
- [ ] Registration Step 3 changes status to pending_approval
- [ ] Token is stored correctly
- [ ] Token is sent in Authorization header for protected routes
- [ ] Error messages display properly
- [ ] Can't skip steps (Step 1 → must do Step 2)
- [ ] Session data persists between page reloads (step 2, 3)
- [ ] Geolocation works on Step 3

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on check-vendor | Routes not loaded | Check file paths |
| vendorId missing | Step 1 not completed | Call step-1 first |
| OTP always wrong | Testing OTP not 1234 | Check console for [SIMULATION] |
| Token not working | Not storing properly | Use localStorage, not sessionStorage |
| Can't proceed to step 2 | Step 1 not complete | Check registrationStep value |

