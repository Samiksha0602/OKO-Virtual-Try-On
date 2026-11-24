import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/login', form);
      setMessage(res.data.message);
      onLogin(res.data.secret_key, form.username);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="container mt-5 p-4 border rounded shadow" style={{ maxWidth: '400px' }}>
      <h3 className="mb-3 text-center">Shopkeeper Login</h3>
      <form onSubmit={handleSubmit}>
        <input
          className="form-control mb-2"
          name="username"
          placeholder="Username"
          onChange={handleChange}
          required
        />
        <input
          className="form-control mb-2"
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />
        <button className="btn btn-primary w-100" type="submit">Login</button>
      </form>
      {message && <p className="text-danger mt-2">{message}</p>}
      <p className="mt-3 text-center">
        Don’t have an account?{" "}
        <button className="btn btn-link p-0" onClick={onSwitchToRegister}>
          Register here
        </button>
      </p>
    </div>
  );
};

export default Login;
