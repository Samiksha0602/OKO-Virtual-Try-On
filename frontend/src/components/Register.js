import React, { useState } from 'react';
import axios from 'axios';

const Register = ({ onRegistered, onSwitchToLogin }) => {
  const [form, setForm] = useState({ username: '', password: '', secret_key: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.secret_key !== 'sap') {
      setMessage('Invalid secret key. Registration denied');
      return;
    }
    try {
      await axios.post('http://localhost:5000/register', form);
      setMessage('Registration successful! Redirecting to login...');
      setForm({ username: '', password: '', secret_key: '' });
      setTimeout(() => {
        setMessage('');
        onRegistered(); // redirect to login
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="container mt-5 p-4 border rounded shadow" style={{ maxWidth: '400px' }}>
      <h3 className="mb-3 text-center">Shopkeeper Register</h3>
      <form onSubmit={handleSubmit}>
        <input
          className="form-control mb-2"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          className="form-control mb-2"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <input
          className="form-control mb-2"
          name="secret_key"
          placeholder="Secret Key"
          value={form.secret_key}
          onChange={handleChange}
          required
        />
        <button className="btn btn-success w-100" type="submit">Register</button>
      </form>
      {message && <p className="text-info mt-2">{message}</p>}
      <p className="mt-3 text-center">
        Already have an account?{" "}
        <button className="btn btn-link p-0" onClick={onSwitchToLogin}>
          Back to Login
        </button>
      </p>
    </div>
  );
};

export default Register;
