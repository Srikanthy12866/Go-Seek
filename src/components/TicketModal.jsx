import React, { useState } from 'react';
import './TicketModal.css';

const APP_API = process.env.REACT_APP_APP_API || 'https://go-seek-backend.onrender.com/api';

export default function TicketModal({ isOpen, onClose, currentUser, hardwareSnapshot }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [name, setName] = useState(currentUser?.name || '');
  const [priority, setPriority] = useState('MEDIUM');
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide an issue title.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    setLoading(true);

    let systemInfo = '';
    if (attachDiagnostics && hardwareSnapshot) {
      try {
        systemInfo = JSON.stringify({
          runtime: hardwareSnapshot.runtime || 'browser',
          os: hardwareSnapshot.operatingSystem,
          browser: hardwareSnapshot.browser,
          screen: hardwareSnapshot.screen,
          cpu: hardwareSnapshot.cpu?.logicalCores ? `${hardwareSnapshot.cpu.logicalCores} cores` : hardwareSnapshot.cpuThreads,
          memory: hardwareSnapshot.memory?.totalBytes || hardwareSnapshot.memory,
          battery: hardwareSnapshot.battery,
          capturedAt: hardwareSnapshot.updatedAt,
        }, null, 2);
      } catch (err) {
        systemInfo = 'Could not serialize telemetry context.';
      }
    }

    const payload = {
      appSource: 'Go-Seek',
      title: title.trim(),
      description: description.trim(),
      userEmail: email.trim(),
      userName: name.trim() || 'Go-Seek User',
      priority,
      systemInfo,
    };

    try {
      const response = await fetch(`${APP_API}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit issue ticket.');
      }

      setSubmittedTicket(data);
    } catch (err) {
      setError(err.message || 'Could not connect to ticketing service on port 8082.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="ticket-overlay" onClick={onClose}>
      <div className="ticket-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="ticket-close-btn" onClick={onClose} aria-label="Close">✕</button>

        {submittedTicket ? (
          <div className="ticket-success-view">
            <div className="success-icon-badge">✓</div>
            <h2>Ticket Submitted Successfully!</h2>
            <p className="ticket-ref-text">
              Ticket ID: <strong>{submittedTicket.ticketCode}</strong>
            </p>
            <p className="success-desc">
              Your issue report has been logged in <strong>app_db</strong> and an email notification has been dispatched to <strong>srikanthy12866@gmail.com</strong>.
            </p>
            <div className="ticket-summary-box">
              <div><span>Title:</span> {submittedTicket.title}</div>
              <div><span>Priority:</span> {submittedTicket.priority}</div>
              <div><span>Reported by:</span> {submittedTicket.userEmail}</div>
            </div>
            <button className="ticket-submit-btn" onClick={handleReset}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="ticket-header">
              <div className="ticket-badge">GO-SEEK ISSUE DESK</div>
              <h2>Report an Issue or Bug</h2>
              <p className="ticket-subtitle">
                Found a telemetry anomaly or hardware readout issue? Submit a ticket and our development team will inspect it.
              </p>
            </div>

            {error && <div className="ticket-error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="ticket-form">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="ticket-title">Issue Summary *</label>
                  <input
                    id="ticket-title"
                    type="text"
                    placeholder="e.g. CPU clocks not updating on Ubuntu 24.04"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group priority-group">
                  <label htmlFor="ticket-priority">Priority</label>
                  <select
                    id="ticket-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ticket-desc">Detailed Description *</label>
                <textarea
                  id="ticket-desc"
                  rows={4}
                  placeholder="Describe what occurred, your OS environment, or unexpected behavior..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="ticket-name">Your Name</label>
                  <input
                    id="ticket-name"
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="ticket-email">Your Email *</label>
                  <input
                    id="ticket-email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {hardwareSnapshot && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={attachDiagnostics}
                    onChange={(e) => setAttachDiagnostics(e.target.checked)}
                  />
                  <span>Attach local hardware &amp; browser telemetry snapshot for faster diagnosis</span>
                </label>
              )}

              <button type="submit" className="ticket-submit-btn" disabled={loading}>
                {loading ? 'Submitting & Dispatching Alert…' : 'Submit Issue Ticket'}
              </button>
            </form>

            <div className="ticket-footer-note">
              Sends an instant notification alert to <strong>srikanthy12866@gmail.com</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
