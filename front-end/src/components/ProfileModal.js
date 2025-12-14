import React, { useEffect, useState } from "react";
import axios from "axios";

function ProfileModal({ onClose }) {
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
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm({
          name: res.data.name || "",
          email: res.data.email || "",
          avatarUrl: res.data.avatarUrl || "",
        });
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
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
      // refresh cached name/email
      localStorage.setItem("myUserName", form.name);
      localStorage.setItem("myUserEmail", form.email);
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
      <div className="modal-overlay glass-backdrop">
        <div className="glass-card modal-card-sm elevated floating">
          <p className="muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay glass-backdrop">
      <div className="glass-card modal-card-lg elevated floating">
        <div className="modal-header-bar">
          <div>
            <p className="kicker">Account</p>
            <h2 className="modal-title">Profile & Security</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-grid">
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

          {error && <p className="error-text small">{error}</p>}
          {success && <p className="success-text small">{success}</p>}

          <div className="form-actions end">
            <button className="chip ghost" onClick={onClose}>
              Close
            </button>
            <button className="chip primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="panel-divider soft" />

        <div className="form-grid">
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

export default ProfileModal;

