import React, { useEffect, useState } from 'react';
import Script from 'next/script';

const CERT_WIDTH_PX = 1122; // 297mm @ 96dpi
const CERT_HEIGHT_PX = 794; // 210mm @ 96dpi

export function BirthdayCertificateModal({
  isOpen,
  onClose,
  student,
  staff,
  school,
  isStaff = false,
}: any) {
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [scale, setScale] = useState(1);

  const person = staff || student;
  const staffMode = isStaff || !!staff;

  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      // Leave comfortable padding on mobile & desktop
      const availWidth = Math.min(window.innerWidth - 28, 920);
      const availHeight = window.innerHeight - 170; // room for top close + bottom buttons
      const scaleW = availWidth / CERT_WIDTH_PX;
      const scaleH = availHeight / CERT_HEIGHT_PX;
      setScale(Math.max(0.22, Math.min(scaleW, scaleH, 0.85)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    // Prevent background page scrolling while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', updateScale);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !person || !school) return null;

  const displayName = person.fullName || person.name || 'Member';
  const dobText = person.dob ? new Date(person.dob).toLocaleDateString('en-IN') : 'this day';

  const downloadPDF = () => {
    const original = document.getElementById(`birthday-certificate-${person.id}`);
    if (!original) return;

    // Clone to render full A4 landscape PDF without mobile screen scaling
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.width = '297mm';
    clone.style.height = '210mm';
    clone.style.transform = 'none';
    clone.style.margin = '0';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const safeFileName = String(displayName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const opt = {
      margin: 0,
      filename: `${safeFileName}_Birthday_Certificate.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf()
        .set(opt)
        .from(clone)
        .save()
        .then(() => {
          if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        })
        .catch(() => {
          if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        });
    } else {
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
    }
  };

  const scaledW = Math.round(CERT_WIDTH_PX * scale);
  const scaledH = Math.round(CERT_HEIGHT_PX * scale);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '14px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        strategy="lazyOnload"
        onLoad={() => setIsPdfReady(true)}
      />

      {/* Corner Close Button (always reachable on mobile) */}
      <button
        type="button"
        aria-label="Close birthday card"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'fixed',
          top: '14px',
          right: '14px',
          background: '#ef4444',
          border: '2px solid rgba(255,255,255,0.4)',
          color: 'white',
          fontSize: '24px',
          lineHeight: 1,
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 10001,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        &times;
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
          gap: '14px',
        }}
      >
        {/* Scaled Certificate Preview Box */}
        <div
          style={{
            width: `${scaledW}px`,
            height: `${scaledH}px`,
            overflow: 'hidden',
            borderRadius: '8px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
          }}
        >
          <div
            id={`birthday-certificate-${person.id}`}
            style={{
              width: `${CERT_WIDTH_PX}px`,
              height: `${CERT_HEIGHT_PX}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: '#ffffff',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(243,244,246,1) 100%)',
              border: `10px solid ${school.themeColor || '#6366f1'}`,
              padding: '40px',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'serif',
              color: '#1f2937',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Decorative Corner Ornaments */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '60px', color: school.themeColor || '#6366f1', opacity: 0.2 }}>🎉</div>
            <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '60px', color: school.themeColor || '#6366f1', opacity: 0.2 }}>🎉</div>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '60px', color: school.themeColor || '#6366f1', opacity: 0.2 }}>🎈</div>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '60px', color: school.themeColor || '#6366f1', opacity: 0.2 }}>🎈</div>

            {/* School Branding */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
              {school.logo && <img src={school.logo} alt="School Logo" style={{ height: '80px', objectFit: 'contain' }} crossOrigin="anonymous" />}
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: school.themeColor || '#6366f1', textTransform: 'uppercase', textAlign: 'center' }}>
                {school.name}
              </h1>
            </div>

            <h2 style={{ fontSize: '48px', color: '#f59e0b', margin: '0 0 18px 0', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
              Happy Birthday!
            </h2>

            <p style={{ fontSize: '24px', margin: '16px 0', fontStyle: 'italic', color: '#4b5563' }}>
              This special birthday wish is presented to
            </p>

            <h3 style={{ fontSize: '42px', margin: '10px 0', color: '#111827', textDecoration: 'underline', textDecorationColor: school.themeColor || '#6366f1', textAlign: 'center' }}>
              {displayName}
            </h3>

            <div style={{ fontSize: '20px', margin: '24px 0', textAlign: 'center', color: '#374151', lineHeight: '1.5', maxWidth: '80%' }}>
              {staffMode ? (
                <p style={{ margin: '5px 0' }}>
                  <strong>Valued Educator &amp; Staff Member</strong>
                  {Array.isArray(person.subject) && person.subject.length > 0 ? ` (${person.subject.join(', ')})` : ''}
                </p>
              ) : (
                <p style={{ margin: '5px 0' }}>
                  Child of <strong>{person.fatherName || person.parentLinks?.[0]?.name || 'Parents'}</strong>
                </p>
              )}
              <p style={{ margin: '5px 0' }}>Born on <strong>{dobText}</strong></p>
            </div>

            <p style={{ fontSize: '22px', margin: '10px 0', color: '#4b5563', maxWidth: '620px', textAlign: 'center' }}>
              Wishing you a fantastic day filled with joy, laughter, and a wonderful year ahead!
            </p>

            <div style={{ marginTop: 'auto', display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'flex-end' }}>
              <div style={{ borderTop: '2px solid #9ca3af', width: '200px', textAlign: 'center', paddingTop: '10px', fontSize: '18px' }}>
                {staffMode ? 'Director' : 'Class Teacher'}
              </div>
              <div style={{ borderTop: '2px solid #9ca3af', width: '200px', textAlign: 'center', paddingTop: '10px', fontSize: '18px' }}>
                Principal
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={downloadPDF}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              opacity: isPdfReady ? 1 : 0.75,
            }}
          >
            🎁 Download Certificate
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#334155',
              color: 'white',
              border: '1px solid #475569',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
