'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [cvText, setCvText] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [sites, setSites] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Available job sites to search
  const availableSites = ['Welcome to the Jungle', 'APEC', 'JobTeaser', 'LinkedIn', 'HelloWork'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setCvText(data.settings.cv_text || '');
        setEmailSender(data.settings.email_sender || '');
        
        const criteria = JSON.parse(data.settings.search_criteria || '{}');
        setKeywords(criteria.keywords || []);
        setLocations(criteria.locations || []);
        setSites(criteria.sites || availableSites);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    const search_criteria = {
      keywords,
      locations,
      sites
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: cvText,
          search_criteria,
          email_sender: emailSender
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ success: true, text: 'Settings saved successfully!' });
      } else {
        setStatusMessage({ success: false, text: data.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setStatusMessage({ success: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleAddLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleSiteToggle = (site) => {
    if (sites.includes(site)) {
      setSites(sites.filter(s => s !== site));
    } else {
      setSites([...sites, site]);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="branding">
          <h1>Agent Configuration</h1>
          <p>Update search parameters, credentials, and CV profile</p>
        </div>
        <div className="header-actions">
          <Link href="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {loading ? (
        <div style={{display: 'flex', justifyContent: 'center', padding: '4rem'}}>
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 30"/></svg>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="settings-container">
          {/* Left Column: CV Input */}
          <div className="glass-panel settings-card">
            <h2 className="section-title" style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>
              Curriculum Vitae (Markdown / Plain Text)
            </h2>
            <div className="form-group">
              <label htmlFor="cv-text">Your CV Text</label>
              <textarea
                id="cv-text"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                className="form-textarea"
                placeholder="Paste your CV text here..."
                required
              />
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                The AI Evaluator uses this text to score job compatibility from 1 to 10 and write personalized cover letters.
              </p>
            </div>
          </div>

          {/* Right Column: Search Parameters & Email Settings */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            
            {/* Search Criteria Card */}
            <div className="glass-panel settings-card">
              <h2 className="section-title" style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>
                Search Parameters
              </h2>
              
              {/* Keywords */}
              <div className="form-group">
                <label>Job Title Keywords</label>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g. Marketing Research"
                    className="form-input"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  />
                  <button type="button" onClick={handleAddKeyword} className="btn btn-secondary">
                    Add
                  </button>
                </div>
                <div className="criteria-list">
                  {keywords.map((kw, i) => (
                    <span key={i} className="chip">
                      {kw}
                      <button type="button" onClick={() => handleRemoveKeyword(i)} className="chip-remove">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="form-group">
                <label>Locations</label>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Paris"
                    className="form-input"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                  />
                  <button type="button" onClick={handleAddLocation} className="btn btn-secondary">
                    Add
                  </button>
                </div>
                <div className="criteria-list">
                  {locations.map((loc, i) => (
                    <span key={i} className="chip">
                      {loc}
                      <button type="button" onClick={() => handleRemoveLocation(i)} className="chip-remove">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Job Portals */}
              <div className="form-group">
                <label>Scrape Job Sites</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem'}}>
                  {availableSites.map(site => (
                    <label key={site} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'none', color: 'var(--text-primary)', cursor: 'pointer'}}>
                      <input
                        type="checkbox"
                        checked={sites.includes(site)}
                        onChange={() => handleSiteToggle(site)}
                        style={{width: '16px', height: '16px', accentColor: 'var(--accent-purple)'}}
                      />
                      {site}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Email Config Card */}
            <div className="glass-panel settings-card">
              <h2 className="section-title" style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>
                SMTP & Gmail Credentials
              </h2>
              
              <div className="form-group">
                <label htmlFor="email-sender">Default Sender Email</label>
                <input
                  id="email-sender"
                  type="email"
                  value={emailSender}
                  onChange={(e) => setEmailSender(e.target.value)}
                  placeholder="alex.sf@outlook.fr"
                  className="form-input"
                />
              </div>

              <div style={{
                padding: '1rem', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(2, 132, 199, 0.1)', 
                border: '1px solid rgba(2, 132, 199, 0.25)', 
                fontSize: '0.8rem',
                lineHeight: '1.5',
                color: 'var(--text-secondary)'
              }}>
                <strong style={{color: 'var(--text-primary)'}}>Deploying to production?</strong> Ensure you configure the following Environment Variables in your Vercel project panel:
                <ul style={{marginLeft: '1.25rem', marginTop: '0.25rem'}}>
                  <li><code>GMAIL_USER</code>: Your Gmail sending address</li>
                  <li><code>GMAIL_PASS</code>: Your 16-character Google App Password</li>
                  <li><code>GEMINI_API_KEY</code>: Google Gemini API Key</li>
                </ul>
              </div>
            </div>

            {/* Status alerts & Submit */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {statusMessage && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: statusMessage.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: statusMessage.success ? '#34d399' : '#f87171',
                  border: `1px solid ${statusMessage.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '0.9rem'
                }}>
                  {statusMessage.text}
                </div>
              )}
              
              <button
                type="submit"
                className="btn btn-primary"
                style={{width: '100%', padding: '1rem', fontSize: '1rem'}}
                disabled={saving}
              >
                {saving ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
