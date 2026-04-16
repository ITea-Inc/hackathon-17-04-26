import React from 'react';

const StreamView = ({ onBack }) => {
  return (
    <div className="flex gap-2 p-2" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="stream-content flex flex-col gap-1" style={{ flex: 3 }}>
        <div className="hacker-border scanline" style={{ flex: 1, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
           <h2 style={{ color: '#0f0', textShadow: '0 0 5px #0f0' }}>STREAM_VIEWER_V1.0</h2>
           <div style={{ fontStyle: 'italic', color: '#888' }}>RECEIVING_DATA_STREAM...</div>
        </div>
        <div className="hacker-border p-1 flex justify-between items-start">
          <div>
            <h3 style={{ margin: 0 }}>REWRITING_LINUX_KERNEL_IN_JS (PART_42)</h3>
            <span style={{ fontSize: '0.9rem' }}>KernelChaos // LINUX_HACKING</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span style={{ color: 'red', fontWeight: 'bold' }}>● LIVE</span>
            <span style={{ fontSize: '0.8rem' }}>14,242 VIEWERS</span>
            <button className="hacker-button" style={{ fontSize: '0.7rem' }} onClick={onBack}>BACK_TO_HOME</button>
          </div>
        </div>
      </div>

      <div className="chat-section flex flex-col gap-1" style={{ width: '300px' }}>
        <div className="hacker-border p-1" style={{ textAlign: 'center', fontWeight: 'bold' }}>STREAM_CHAT</div>
        <div className="hacker-border p-1 flex-col" style={{ flex: 1, overflowY: 'auto', fontSize: '0.8rem', gap: '5px', display: 'flex' }}>
          <div className="chat-msg"><span style={{ fontWeight: 'bold' }}>User123:</span> how did u do that?</div>
          <div className="chat-msg"><span style={{ fontWeight: 'bold' }}>ByteMaster:</span> use void* lol</div>
          <div className="chat-msg"><span style={{ fontWeight: 'bold' }}>NoobHaxor:</span> is this java or script?</div>
          <div className="chat-msg" style={{ color: '#555' }}>[!] Moderation: Don't spam.</div>
          <div className="chat-msg"><span style={{ fontWeight: 'bold' }}>KernelChaos:</span> check the github repo guys</div>
          <div className="chat-msg"><span style={{ fontWeight: 'bold' }}>Root_0:</span> amazing quality tonight</div>
        </div>
        <div className="hacker-border p-1">
          <input type="text" className="hacker-input" style={{ width: '100%', fontSize: '0.8rem' }} placeholder="SEND_MESSAGE..." />
        </div>
      </div>
    </div>
  );
};

export default StreamView;
