import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiLoader, FiArrowLeft } from "react-icons/fi";

function ProfilePanel({ mode = "profile", onBack, onUpdatedProfile }) {
  const token = localStorage.getItem("splitzyToken");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    avatarUrl: "",
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        setForm({
          name: res.data.name || "",
          email: res.data.email || "",
          avatarUrl: res.data.avatarUrl || "",
        });
      } catch (err) {
        if (!active) return;
        setError("Failed to load profile");
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("Profile updated");
      onUpdatedProfile?.(form);
    } catch (err) {
      setError(err.response?.data || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    setPwError("");
    setPwSuccess("");
    if (!pwForm.newPassword || pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/profile/password`, pwForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPwSuccess("Password updated");
      setPwForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPwError(err.response?.data || "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-panel">
        <div className="profile-header">
          <div className="back-pill muted">
            <FiLoader className="spin" /> Loading profile...
          </div>
        </div>
        <div className="profile-card skeleton" />
      </div>
    );
  }

  return (
    <div className="profile-panel">
      <div className="profile-header">
        {onBack && (
          <button className="back-btn mobile-only" onClick={onBack}>
            <FiArrowLeft size={20} />
          </button>
        )}
        <div>
          <p className="kicker">Account</p>
          <h2 className="panel-title">Profile & Security</h2>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="profile-grid">
        <div className="glass-card profile-card">
          <h4 className="section-title">Profile</h4>
          <div className="form-section">
            <label className="label">Name</label>
            <input
              className="input modern"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="form-section">
            <label className="label">Email</label>
            <input
              className="input modern"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-section">
            <label className="label">Avatar URL</label>
            <input
              className="input modern"
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-actions end">
            <button className="chip primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="glass-card profile-card">
          <h4 className="section-title">Password</h4>
          <div className="form-section">
            <label className="label">Current password (skip if none set)</label>
            <input
              type="password"
              className="input modern"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              placeholder="Current password"
            />
          </div>
          <div className="form-section">
            <label className="label">New password</label>
            <input
              type="password"
              className="input modern"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              placeholder="At least 8 characters"
            />
          </div>

          {pwError && <p className="error-text small">{pwError}</p>}
          {pwSuccess && <p className="success-text small">{pwSuccess}</p>}

          <div className="form-actions end">
            <button className="chip primary ghost" onClick={handlePassword} disabled={pwSaving}>
              {pwSaving ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePanel;

