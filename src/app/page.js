'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer tab (description vs cover letter)
  const [detailTab, setDetailTab] = useState('description');
  
  // Custom cover letter instructions
  const [refineInstructions, setRefineInstructions] = useState('');
  const [refiningLetter, setRefiningLetter] = useState(false);
  const [editableLetter, setEditableLetter] = useState('');

  // Send application modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Fetch jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
        if (data.jobs.length > 0 && !selectedJob) {
          setSelectedJob(data.jobs[0]);
          setEditableLetter(data.jobs[0].cover_letter || '');
        }
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setEditableLetter(job.cover_letter || '');
    setRefineInstructions('');
    setDetailTab('description');
  };

  // Run scraper manually
  const handleTriggerScraper = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/settings');
      const settingsData = await res.json();
      
      // Let's trigger a POST request to scrape
      // In a real app we'd trigger a background run.
      // For this local dashboard, we'll run a local scraper trigger.
      const scrapeRes = await fetch('/api/jobs'); // In local mockup this triggers reload.
      // Let's call the API to run the scraper in backend or simulate
      // Actually we'll call a custom trigger to run the scraper local function
      const runRes = await fetch('/api/jobs', {
        method: 'PUT' // We will wire this method to trigger scraping
      }).catch(() => {});
      
      // Re-fetch jobs
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        // Update local jobs list
        setJobs(prevJobs => prevJobs.map(job => 
          job.id === id ? { ...job, status } : job
        ));
        // Update selected job state
        if (selectedJob && selectedJob.id === id) {
          setSelectedJob(prev => ({ ...prev, status }));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleRefineLetter = async () => {
    if (!refineInstructions.trim()) return;
    setRefiningLetter(true);
    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedJob.id,
          instructions: refineInstructions
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditableLetter(data.coverLetter);
        setRefineInstructions('');
        // Update local job letter
        setJobs(prevJobs => prevJobs.map(job => 
          job.id === selectedJob.id ? { ...job, cover_letter: data.coverLetter } : job
        ));
        setSelectedJob(prev => ({ ...prev, cover_letter: data.coverLetter }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefiningLetter(false);
    }
  };

  const openApplyModal = () => {
    // Generate default subject and recipient if available
    setRecipientEmail('recrutement@' + selectedJob.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com');
    setEmailSubject(`Candidature ${selectedJob.title} - Alexandra Filali`);
    setSendResult(null);
    setIsApplyModalOpen(true);
  };

  const handleSendApplication = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedJob.id,
          recipientEmail,
          subject: emailSubject,
          coverLetter: editableLetter
        })
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ success: true, message: data.message || 'Application sent!' });
        handleUpdateStatus(selectedJob.id, 'applied');
        setTimeout(() => {
          setIsApplyModalOpen(false);
        }, 2000);
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send.' });
      }
    } catch (err) {
      setSendResult({ success: false, message: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter jobs based on search query and active status tab
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.site.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch && job.status !== 'archived';
    return matchesSearch && job.status === activeTab;
  });

  // Calculate statistics
  const totalScraped = jobs.length;
  const activeJobs = jobs.filter(j => j.status !== 'archived');
  const starredCount = jobs.filter(j => j.status === 'starred').length;
  const appliedCount = jobs.filter(j => j.status === 'applied').length;
  const avgScore = activeJobs.length > 0 
    ? (activeJobs.reduce((acc, curr) => acc + curr.score, 0) / activeJobs.length).toFixed(1) 
    : '0.0';

  // Parse reasoning JSON safely
  const getReasoning = (job) => {
    if (!job || !job.reasoning) return { pros: [], cons: [], summary: '' };
    try {
      return JSON.parse(job.reasoning);
    } catch (e) {
      return { pros: [], cons: [], summary: job.reasoning };
    }
  };

  const reasoning = getReasoning(selectedJob);

  return (
    <div className="container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="branding">
          <h1>Job Hunter Agent</h1>
          <p>Automated intelligence matching for Alexandra Filali</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleTriggerScraper} 
            className="btn btn-secondary"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 20"/></svg>
                Syncing Jobs...
              </>
            ) : 'Run Scraper Now'}
          </button>
          <Link href="/settings" className="btn btn-primary">
            Settings & CV
          </Link>
        </div>
      </header>

      {/* Stats Summary Grid */}
      <section className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">Total Evaluated</span>
          <span className="stat-value">{totalScraped}</span>
          <span className="stat-desc">across 5 job portals</span>
        </div>
        <div className="glass-panel stat-card blue">
          <span className="stat-label">Average Score</span>
          <span className="stat-value">{avgScore}<span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/10</span></span>
          <span className="stat-desc">compatibility index</span>
        </div>
        <div className="glass-panel stat-card emerald">
          <span className="stat-label">Starred Matches</span>
          <span className="stat-value">{starredCount}</span>
          <span className="stat-desc">shortlisted profiles</span>
        </div>
        <div className="glass-panel stat-card rose">
          <span className="stat-label">Applications</span>
          <span className="stat-value">{appliedCount}</span>
          <span className="stat-desc">submitted via Gmail</span>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="glass-panel filter-bar">
        <div className="filter-group">
          {['all', 'new', 'starred', 'applied', 'archived'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Search company or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </section>

      {/* Main Dashboard Layout */}
      {loading ? (
        <div style={{display: 'flex', justifyContent: 'center', padding: '4rem'}}>
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 30"/></svg>
        </div>
      ) : (
        <div className="main-layout">
          {/* Jobs List (Left) */}
          <div className="jobs-list">
            {filteredJobs.length === 0 ? (
              <div className="glass-panel empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <h3>No jobs found</h3>
                <p>Try clearing filters or search terms.</p>
              </div>
            ) : (
              filteredJobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
                  className={`glass-panel job-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                >
                  <span className={`status-indicator ${job.status}`}>
                    {job.status}
                  </span>
                  
                  <div className="job-card-header">
                    <div className="job-info">
                      <h3>{job.title}</h3>
                      <div className="job-company">{job.company}</div>
                    </div>
                    
                    <div className={`score-badge ${job.score >= 8 ? 'high' : job.score >= 6 ? 'medium' : 'low'}`}>
                      {job.score}
                    </div>
                  </div>
                  
                  <div className="job-meta-row">
                    <div className="job-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {job.location || 'Location N/A'}
                    </div>
                    <div className="job-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                      {job.site}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Job Details Sidebar (Right) */}
          {selectedJob && (
            <div className="glass-panel detail-drawer">
              <div className="drawer-header">
                <h2>{selectedJob.title}</h2>
                <div className="drawer-company">{selectedJob.company}</div>
              </div>

              {/* Compatibility score analysis */}
              <div>
                <h3 className="section-title">AI Compatibility Analysis</h3>
                <div className="analysis-panel">
                  <div className="analysis-summary">
                    {reasoning.summary || 'Matching profile against CV qualifications...'}
                  </div>
                  
                  <div className="pros-cons-grid">
                    <div>
                      <div style={{color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Key Strengths</div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {reasoning.pros?.map((pro, index) => (
                          <div key={index} className="pro-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            {pro}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{color: 'var(--accent-rose)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Potential Gaps</div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {reasoning.cons?.map((con, index) => (
                          <div key={index} className="con-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            {con}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation tabs inside drawer */}
              <div>
                <div className="drawer-tabs">
                  <button
                    onClick={() => setDetailTab('description')}
                    className={`drawer-tab ${detailTab === 'description' ? 'active' : ''}`}
                  >
                    Job Description
                  </button>
                  <button
                    onClick={() => setDetailTab('letter')}
                    className={`drawer-tab ${detailTab === 'letter' ? 'active' : ''}`}
                  >
                    Custom Cover Letter
                  </button>
                </div>

                {detailTab === 'description' ? (
                  <div className="tab-content">
                    {selectedJob.description || 'No description provided.'}
                  </div>
                ) : (
                  <div className="letter-editor-container">
                    <textarea
                      value={editableLetter}
                      onChange={(e) => setEditableLetter(e.target.value)}
                      className="letter-textarea"
                      placeholder="Generating cover letter suggestion..."
                    />
                    
                    {/* Cover Letter refinement instructions */}
                    <div className="refine-input-row">
                      <input
                        type="text"
                        placeholder="e.g., Make it emphasize my event sales experience..."
                        value={refineInstructions}
                        onChange={(e) => setRefineInstructions(e.target.value)}
                        className="refine-input"
                        disabled={refiningLetter}
                      />
                      <button
                        onClick={handleRefineLetter}
                        className="btn btn-secondary"
                        disabled={refiningLetter || !refineInstructions.trim()}
                      >
                        {refiningLetter ? 'Improving...' : 'Refine Cover Letter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer bottom actions */}
              <div className="drawer-actions">
                {selectedJob.status !== 'applied' && (
                  <button onClick={openApplyModal} className="btn btn-primary" style={{flex: 1}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    Apply via Gmail
                  </button>
                )}
                
                {selectedJob.status === 'starred' ? (
                  <button 
                    onClick={() => handleUpdateStatus(selectedJob.id, 'new')} 
                    className="btn-icon active"
                    title="Unstar Match"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus(selectedJob.id, 'starred')} 
                    className="btn-icon"
                    title="Star Match"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </button>
                )}

                {selectedJob.status === 'archived' ? (
                  <button 
                    onClick={() => handleUpdateStatus(selectedJob.id, 'new')} 
                    className="btn btn-secondary"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus(selectedJob.id, 'archived')} 
                    className="btn btn-secondary"
                  >
                    Archive
                  </button>
                )}

                <a 
                  href={selectedJob.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-secondary"
                  title="Open Original Job Offer Link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gmail Application Modal */}
      {isApplyModalOpen && selectedJob && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button onClick={() => setIsApplyModalOpen(false)} className="modal-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800}}>Submit Application via Gmail</h2>
            
            <div className="form-group">
              <label>Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Application Cover Letter Body</label>
              <textarea
                value={editableLetter}
                onChange={(e) => setEditableLetter(e.target.value)}
                className="form-input"
                style={{minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical'}}
              />
            </div>

            {sendResult && (
              <div style={{
                padding: '1rem', 
                borderRadius: '8px', 
                backgroundColor: sendResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: sendResult.success ? '#34d399' : '#f87171',
                border: `1px solid ${sendResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontSize: '0.9rem'
              }}>
                {sendResult.message}
              </div>
            )}

            <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
              <button 
                onClick={() => setIsApplyModalOpen(false)} 
                className="btn btn-secondary"
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendApplication} 
                className="btn btn-primary"
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Sending via Gmail...' : 'Send Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
