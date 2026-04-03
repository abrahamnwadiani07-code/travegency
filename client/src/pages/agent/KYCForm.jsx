import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { COUNTRIES } from '../../data/countries';
import './KYCForm.css';

const API = process.env.REACT_APP_API_URL || '/api';
function getToken() { return localStorage.getItem('tragency_token'); }

const ID_TYPES = [
  { value: 'passport', label: 'International Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_card', label: "Voter's Card" },
  { value: 'residence_permit', label: 'Residence Permit' },
];

export default function KYCForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1=form, 2=selfie, 3=review, 4=done
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [form, setForm] = useState({
    idType: '', idNumber: '', idCountry: '', idExpiry: '',
    businessRegistration: '', taxId: '',
    bankName: '', bankAccountNumber: '', bankAccountName: '',
  });
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [businessDoc, setBusinessDoc] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  // Webcam
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    loadStatus();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line

  async function loadStatus() {
    try {
      const token = getToken();
      const res = await fetch(`${API}/kyc/status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setKycStatus(data);
      if (data.kycStatus === 'submitted' || data.kycStatus === 'approved') setStep(4);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  function updateForm(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  // ── Webcam ──
  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (e) {
      setError('Camera access denied. Please allow camera access or upload a selfie photo instead.');
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      stopCamera();
      setStep(3);
    }, 'image/jpeg', 0.9);
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    setStream(null);
  }

  function retakeSelfie() {
    setSelfieFile(null);
    setSelfiePreview(null);
    setStep(2);
  }

  // ── Submit ──
  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('idType', form.idType);
      formData.append('idNumber', form.idNumber);
      formData.append('idCountry', form.idCountry);
      formData.append('idExpiry', form.idExpiry);
      formData.append('businessRegistration', form.businessRegistration);
      formData.append('taxId', form.taxId);
      formData.append('bankName', form.bankName);
      formData.append('bankAccountNumber', form.bankAccountNumber);
      formData.append('bankAccountName', form.bankAccountName);
      if (idFront) formData.append('idFront', idFront);
      if (idBack) formData.append('idBack', idBack);
      if (selfieFile) formData.append('selfie', selfieFile);
      if (businessDoc) formData.append('businessDoc', businessDoc);

      const res = await fetch(`${API}/kyc/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setStep(4);
      setKycStatus({ kycStatus: 'submitted' });
    } catch (e) {
      setError(e.message);
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="kyc-page"><div className="kyc-inner"><p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Loading...</p></div></div>;

  return (
    <div className="kyc-page">
      <div className="kyc-inner">
        <h1 className="serif kyc-title">Identity Verification (KYC)</h1>
        <p className="kyc-sub">Verify your identity to become a trusted agent on Tragency</p>

        {/* Step indicator */}
        <div className="kyc-steps">
          {['ID Document', 'Selfie', 'Review', 'Done'].map((s, i) => (
            <div key={i} className={`kyc-step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="kyc-step-num">{step > i + 1 ? '\u2713' : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {error && <div className="kyc-error">{error}</div>}

        {/* ══ STEP 1: ID Document ══ */}
        {step === 1 && (
          <div className="kyc-section anim-fadeUp">
            <h2 className="serif">Upload Your ID Document</h2>

            <div className="kyc-form-grid">
              <div className="kyc-fg">
                <label>ID Type *</label>
                <select value={form.idType} onChange={updateForm('idType')} required>
                  <option value="">Select ID type...</option>
                  {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="kyc-fg">
                <label>ID Number *</label>
                <input value={form.idNumber} onChange={updateForm('idNumber')} placeholder="Enter ID number" required />
              </div>

              <div className="kyc-fg">
                <label>Issuing Country *</label>
                <select value={form.idCountry} onChange={updateForm('idCountry')} required>
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
              </div>

              <div className="kyc-fg">
                <label>Expiry Date</label>
                <input type="date" value={form.idExpiry} onChange={updateForm('idExpiry')} />
              </div>
            </div>

            <div className="kyc-upload-grid">
              <div className="kyc-upload-box">
                <label>ID Front *</label>
                <div className="kyc-dropzone" onClick={() => document.getElementById('idFrontInput').click()}>
                  {idFront ? (
                    <div className="kyc-file-preview">
                      <span className="kyc-file-icon">{'\u2705'}</span>
                      <span>{idFront.name}</span>
                    </div>
                  ) : (
                    <div className="kyc-drop-text">
                      <span>{'\uD83D\uDCF7'}</span>
                      <p>Click to upload front of ID</p>
                      <small>JPG, PNG or PDF (max 10MB)</small>
                    </div>
                  )}
                </div>
                <input id="idFrontInput" type="file" accept="image/*,.pdf" hidden onChange={e => setIdFront(e.target.files[0])} />
              </div>

              <div className="kyc-upload-box">
                <label>ID Back (optional)</label>
                <div className="kyc-dropzone" onClick={() => document.getElementById('idBackInput').click()}>
                  {idBack ? (
                    <div className="kyc-file-preview">
                      <span className="kyc-file-icon">{'\u2705'}</span>
                      <span>{idBack.name}</span>
                    </div>
                  ) : (
                    <div className="kyc-drop-text">
                      <span>{'\uD83D\uDCF7'}</span>
                      <p>Click to upload back of ID</p>
                      <small>JPG, PNG or PDF (max 10MB)</small>
                    </div>
                  )}
                </div>
                <input id="idBackInput" type="file" accept="image/*,.pdf" hidden onChange={e => setIdBack(e.target.files[0])} />
              </div>
            </div>

            <h3 className="serif" style={{ marginTop: 24 }}>Business Details (optional)</h3>
            <div className="kyc-form-grid">
              <div className="kyc-fg"><label>Business Registration</label><input value={form.businessRegistration} onChange={updateForm('businessRegistration')} placeholder="e.g. CAC number, Company House number" /></div>
              <div className="kyc-fg"><label>Tax ID</label><input value={form.taxId} onChange={updateForm('taxId')} placeholder="Tax identification number" /></div>
              <div className="kyc-fg"><label>Bank Name</label><input value={form.bankName} onChange={updateForm('bankName')} placeholder="Your bank name" /></div>
              <div className="kyc-fg"><label>Account Number</label><input value={form.bankAccountNumber} onChange={updateForm('bankAccountNumber')} placeholder="Bank account number" /></div>
              <div className="kyc-fg"><label>Account Name</label><input value={form.bankAccountName} onChange={updateForm('bankAccountName')} placeholder="Account holder name" /></div>
            </div>

            <div className="kyc-upload-box" style={{ marginTop: 16 }}>
              <label>Business Document (optional)</label>
              <div className="kyc-dropzone" onClick={() => document.getElementById('businessDocInput').click()}>
                {businessDoc ? (
                  <div className="kyc-file-preview"><span className="kyc-file-icon">{'\u2705'}</span><span>{businessDoc.name}</span></div>
                ) : (
                  <div className="kyc-drop-text"><span>{'\uD83D\uDCC4'}</span><p>Upload business registration certificate</p></div>
                )}
              </div>
              <input id="businessDocInput" type="file" accept="image/*,.pdf" hidden onChange={e => setBusinessDoc(e.target.files[0])} />
            </div>

            <div className="kyc-actions">
              <button className="kyc-btn-primary" onClick={() => {
                if (!form.idType || !form.idNumber || !form.idCountry || !idFront) {
                  setError('Please fill in ID type, number, country, and upload the front of your ID');
                  return;
                }
                setError('');
                setStep(2);
              }}>Continue to Selfie &rarr;</button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Selfie ══ */}
        {step === 2 && (
          <div className="kyc-section anim-fadeUp">
            <h2 className="serif">Take a Selfie</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
              We need a clear photo of your face to compare with your ID document. Make sure your face is well-lit and clearly visible.
            </p>

            {!cameraActive && !selfiePreview && (
              <div className="kyc-selfie-options">
                <button className="kyc-btn-primary" onClick={startCamera}>
                  {'\uD83D\uDCF7'} Open Camera
                </button>
                <span style={{ color: 'var(--muted)' }}>or</span>
                <label className="kyc-btn-secondary" style={{ cursor: 'pointer' }}>
                  {'\uD83D\uDCC1'} Upload Photo
                  <input type="file" accept="image/*" hidden onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelfieFile(file);
                      setSelfiePreview(URL.createObjectURL(file));
                      setStep(3);
                    }
                  }} />
                </label>
              </div>
            )}

            {cameraActive && (
              <div className="kyc-camera-wrap">
                <video ref={videoRef} autoPlay playsInline muted className="kyc-video" />
                <canvas ref={canvasRef} hidden />
                <div className="kyc-camera-actions">
                  <button className="kyc-btn-primary" onClick={capturePhoto}>{'\uD83D\uDCF8'} Capture</button>
                  <button className="kyc-btn-secondary" onClick={() => { stopCamera(); }}>Cancel</button>
                </div>
              </div>
            )}

            <div className="kyc-actions" style={{ marginTop: 16 }}>
              <button className="kyc-btn-secondary" onClick={() => setStep(1)}>&larr; Back</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Review ══ */}
        {step === 3 && (
          <div className="kyc-section anim-fadeUp">
            <h2 className="serif">Review & Submit</h2>

            <div className="kyc-review-grid">
              <div className="kyc-review-card">
                <h4>ID Document</h4>
                <div className="kyc-review-row"><span>Type:</span><strong>{ID_TYPES.find(t => t.value === form.idType)?.label}</strong></div>
                <div className="kyc-review-row"><span>Number:</span><strong>{form.idNumber}</strong></div>
                <div className="kyc-review-row"><span>Country:</span><strong>{form.idCountry}</strong></div>
                {form.idExpiry && <div className="kyc-review-row"><span>Expiry:</span><strong>{form.idExpiry}</strong></div>}
                <div className="kyc-review-row"><span>Front:</span><strong style={{ color: 'var(--success)' }}>{'\u2705'} Uploaded</strong></div>
                {idBack && <div className="kyc-review-row"><span>Back:</span><strong style={{ color: 'var(--success)' }}>{'\u2705'} Uploaded</strong></div>}
              </div>

              {selfiePreview && (
                <div className="kyc-review-card">
                  <h4>Selfie</h4>
                  <img src={selfiePreview} alt="Selfie" className="kyc-selfie-preview" />
                  <button className="kyc-btn-sm" onClick={retakeSelfie}>Retake</button>
                </div>
              )}
            </div>

            {form.businessRegistration && (
              <div className="kyc-review-card" style={{ marginTop: 12 }}>
                <h4>Business Details</h4>
                {form.businessRegistration && <div className="kyc-review-row"><span>Registration:</span><strong>{form.businessRegistration}</strong></div>}
                {form.taxId && <div className="kyc-review-row"><span>Tax ID:</span><strong>{form.taxId}</strong></div>}
                {form.bankName && <div className="kyc-review-row"><span>Bank:</span><strong>{form.bankName}</strong></div>}
                {form.bankAccountNumber && <div className="kyc-review-row"><span>Account #:</span><strong>{form.bankAccountNumber}</strong></div>}
              </div>
            )}

            <div className="kyc-actions" style={{ marginTop: 24 }}>
              <button className="kyc-btn-secondary" onClick={() => setStep(1)}>&larr; Edit Details</button>
              <button className="kyc-btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Done ══ */}
        {step === 4 && (
          <div className="kyc-section kyc-done anim-fadeUp">
            <div className="kyc-done-icon">
              {kycStatus?.kycStatus === 'approved' ? '\u2705' : kycStatus?.kycStatus === 'rejected' ? '\u274C' : '\u23F3'}
            </div>
            <h2 className="serif">
              {kycStatus?.kycStatus === 'approved' ? 'Verified!' :
               kycStatus?.kycStatus === 'rejected' ? 'Verification Rejected' :
               'Under Review'}
            </h2>
            <p>
              {kycStatus?.kycStatus === 'approved'
                ? 'Your identity has been verified. You can now receive bookings on Tragency.'
                : kycStatus?.kycStatus === 'rejected'
                ? `Your verification was rejected. ${kycStatus.reviewerNotes || 'Please resubmit with correct documents.'}`
                : 'Your documents have been submitted and are being reviewed by our team. You will be notified once approved.'}
            </p>
            {kycStatus?.kycStatus === 'rejected' && (
              <button className="kyc-btn-primary" onClick={() => { setStep(1); setError(''); }}>
                Resubmit Documents
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
