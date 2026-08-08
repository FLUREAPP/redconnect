import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Hubungkan ke server backend (otomatis mendeteksi domain Render atau localhost)
const socket = io();

// IKON MENU UTAMA
const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="15" height="12" rx="2" ry="2" />
    <polygon points="17 14 22 17 22 7 17 10" />
  </svg>
);
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);

// IKON KONTAK (FOOTER)
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
);
const IGIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
);

function App() {
  const [myGender, setMyGender] = useState('male');
  const [lookingFor, setLookingFor] = useState('anyone');
  const [statusText, setStatusText] = useState('Siap mencari obrolan...');
  const [isSearching, setIsSearching] = useState(false);

  // Tangkap sinyal Socket.io dari server
  useEffect(() => {
    socket.on("waiting_for_partner", () => {
      setStatusText("Mencari pasangan obrolan... Mohon tunggu sebentar.");
    });

    socket.on("match_found", (data) => {
      setStatusText(`🎉 Berhasil tersambung dengan partner! Ruang: ${data.room}`);
      setIsSearching(false);
    });

    return () => {
      socket.off("waiting_for_partner");
      socket.off("match_found");
    };
  }, []);

  // Fungsi ketika tombol "Mulai Obrolan Baru" diklik
  const handleStartChat = () => {
    setIsSearching(true);
    setStatusText("Menghubungkan ke server...");
    // Kirim sinyal ke backend server.ts untuk masuk antrean match
    socket.emit("join_queue", { myGender, lookingFor });
  };

  const handleAuthClick = () => {
    const username = prompt("Masukkan Username:");
    const password = prompt("Masukkan Password:");
    if (username && password) {
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || data.error);
      })
      .catch(err => alert("Gagal terhubung ke server pendaftaran."));
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="brand-logo">
          <LogoIcon /> RedConnect
        </div>
        <div className="nav-menu">
          <div className="nav-item active"><HomeIcon /> Beranda</div>
          <div className="nav-item"><UsersIcon /> Teman Baru</div>
          <div className="nav-item"><ChatIcon /> Komunitas</div>
          <div className="nav-item"><StarIcon /> Premium</div>
        </div>
        <div className="nav-menu" style={{ marginTop: 'auto' }}>
          <div className="nav-item"><SettingsIcon /> Pengaturan</div>
        </div>
      </aside>

      <main className="main-wrapper">
        <div className="header-top">
          <span style={{ cursor: 'pointer', fontWeight: 'bold', color: '#E63946' }} onClick={handleAuthClick}>
            Masuk / Daftar Akun
          </span>
        </div>

        <div className="content-area">
          <h1 className="hero-title">Koneksi apa yang Anda cari hari ini?</h1>
          <p className="hero-subtitle">Bangun obrolan video yang aman, anonim, dan instan.</p>

          <div className="action-panel">
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginLeft: '5px' }}>Atur preferensi obrolan Anda...</div>
            <div className="input-row">
              <select className="glass-select" value={myGender} onChange={(e) => setMyGender(e.target.value)}>
                <option value="male">Saya Pria</option>
                <option value="female">Saya Wanita</option>
              </select>
              <select className="glass-select" value={lookingFor} onChange={(e) => setLookingFor(e.target.value)}>
                <option value="anyone">Mencari Siapa Saja</option>
                <option value="male">Mencari Pria</option>
                <option value="female">Mencari Wanita</option>
              </select>
            </div>
            
            <div style={{ marginTop: '15px', color: '#E63946', fontWeight: '500', fontSize: '15px' }}>
              {statusText}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button className="btn-action" onClick={handleStartChat} disabled={isSearching}>
                {isSearching ? 'Sedang Mencari...' : 'Mulai Obrolan Baru'}
                <span className="arrow-icon">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="dev-footer">
          <div className="dev-footer-content">
            <div>
              <span className="dev-label">About Developer</span>
              <h2 className="dev-name">Rizky Mahreza</h2>
              <p className="dev-bio">HSE enthusiast & creator exploring tech and AI. Building digital experiences and sharing the journey.</p>
              
              <div className="contact-list">
                <div className="contact-item"><LocationIcon /> Riau, Indonesia</div>
                <a href="mailto:rizkymahreza@icloud.com" className="contact-item"><MailIcon /> rizkymahreza@icloud.com</a>
                <a href="https://wa.me/13312207673" target="_blank" rel="noopener noreferrer" className="contact-item"><PhoneIcon /> (+1) 331-220-7673</a>
              </div>

              <div className="dev-socials">
                <span className="social-label">Follow me</span>
                <div className="social-icons">
                  <a href="https://www.instagram.com/rizkymahreza?igsh=eXV3cnR6cDZrbTA4&utm_source=qr" target="_blank" rel="noopener noreferrer"><IGIcon /></a>
                  <a href="https://linkedin.com/in/rizky-mahreza" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="links-title">Quick Links</h3>
              <a href="https://hse-excellence.preview.emergentagent.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio" target="_blank" rel="noopener noreferrer" className="link-item">Portfolio</a>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}

export default App;