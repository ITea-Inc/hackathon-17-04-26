import React from 'react';

const HomeView = ({ onStreamSelect }) => {
  const categories = ['GO', 'RUST', 'WEB_DEV', 'NETWORKING', 'SECURITY', 'LINUX'];
  const liveStreams = [
    { title: 'BUILDING_A_COMPILER_IN_C', streamer: 'CompilerWizard', viewers: '14.2k' },
    { title: 'REVERSING_MALWARE_LIVE', streamer: 'MalwareHunter', viewers: '8.1k' },
    { title: 'KUBERNETES_TROUBLESHOOTING', streamer: 'CloudNative', viewers: '5.5k' },
    { title: 'RUST_ZERO_TO_HERO', streamer: 'Rusty', viewers: '3.2k' },
  ];

  return (
    <div className="p-2 flex flex-col gap-2">
      <section className="featured-hero hacker-border p-2 flex gap-2" style={{ height: '300px' }}>
        <div className="placeholder hacker-border flex items-center justify-center" style={{ flex: 2, background: '#eee' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem' }}>FEATURED_STREAM_PREVIEW</h2>
            <p>// VIDEO_FEED_ACTIVE</p>
          </div>
        </div>
        <div className="stream-info flex flex-col justify-between" style={{ flex: 1 }}>
          <div>
            <span style={{ fontSize: '0.8rem', background: 'black', color: 'white', padding: '2px 5px' }}>FEATURED</span>
            <h3 style={{ marginTop: '10px' }}>REWRITING_LINUX_KERNEL_IN_JS</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>STREAMER: KernelChaos</p>
          </div>
          <button className="hacker-button" onClick={onStreamSelect}>WATCH_NOW</button>
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h3>CATEGORIES:</h3>
        <div className="flex gap-1 flex-wrap" style={{ marginTop: '10px' }}>
          {categories.map((cat, i) => (
            <div key={i} className="hacker-border p-1" style={{ cursor: 'pointer', minWidth: '100px', textAlign: 'center' }}>
              {cat}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h3>LIVE_STREAMS:</h3>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
          {liveStreams.map((stream, i) => (
            <div key={i} className="hacker-border p-1" style={{ cursor: 'pointer' }} onClick={onStreamSelect}>
              <div className="hacker-border" style={{ height: '160px', background: '#f0f0f0', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                 <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>// THUMBNAIL_PLACEHOLDER</span>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{stream.title}</div>
              <div style={{ fontSize: '0.8rem' }}>{stream.streamer}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{stream.viewers} VIEWERS</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomeView;
