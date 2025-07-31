import React, { useEffect, useState } from "react";

function formatTime(ms) {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function ProgressDetails({ progress }) {
  const [convertingElapsed, setConvertingElapsed] = useState(null);
  useEffect(() => {
    let timer;
    if (progress.phase === "converting" && progress.convertingStarted) {
      timer = setInterval(() => {
        setConvertingElapsed(((Date.now() - progress.convertingStarted) / 1000).toFixed(1));
      }, 1000);
      setConvertingElapsed(((Date.now() - progress.convertingStarted) / 1000).toFixed(1));
    } else {
      setConvertingElapsed(null);
    }
    return () => timer && clearInterval(timer);
  }, [progress.phase, progress.convertingStarted]);

  return (
    <div className="progress-details">
      <div><strong>Phase:</strong> {progress.phase}</div>
      <div><strong>Percent:</strong> {progress.percent ? `${progress.percent}%` : '—'}</div>
      <div><strong>Elapsed:</strong> {progress.started ? `${((Date.now() - progress.started) / 1000).toFixed(1)}s` : '—'}</div>
      {progress.phase === 'downloading' && (
        <div className="progress-bar" style={{ width: '100%', background: '#eee', borderRadius: 8, height: 8, margin: '8px 0' }}>
          <div style={{ width: `${progress.percent || 0}%`, background: '#3b82f6', height: '100%', borderRadius: 8, transition: 'width 0.3s' }} />
        </div>
      )}
      {progress.phase === 'converting' && (
        <div style={{ margin: '8px 0' }}>
          <div className="progress-bar-indeterminate" style={{ width: '100%', background: '#eee', borderRadius: 8, height: 8, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: '40%',
              background: 'linear-gradient(90deg, #3b82f6 40%, #60a5fa 100%)',
              height: '100%',
              borderRadius: 8,
              position: 'absolute',
              left: 0,
              animation: 'indeterminateBar 1.2s linear infinite'
            }} />
          </div>
          <style>{`
            @keyframes indeterminateBar {
              0% { left: 0; }
              100% { left: 60%; }
            }
          `}</style>
        </div>
      )}
      {progress.phase === 'converting' && (
        <div><strong>Converting Elapsed:</strong> {convertingElapsed ? `${convertingElapsed}s` : '—'}</div>
      )}
      {progress.phase === 'finished' && progress.convertingElapsed && (
        <div><strong>Converting Time:</strong> {`${(progress.convertingElapsed / 1000).toFixed(1)}s`}</div>
      )}
      {progress.title && (
        <div><strong>Title:</strong> {progress.title}</div>
      )}
      {progress.outputFile && (
        <div><strong>Filename:</strong> {progress.outputFile}</div>
      )}
      {progress.error && (
        <div className="error"><strong>Error:</strong> {progress.error}</div>
      )}
    </div>
  );
}

function YouTubeList({ videos }) {
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [progress, setProgress] = useState({}); // per-video progress
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState("");
  const [theme, setTheme] = useState('light');

  // Poll progress for each downloading video
  useEffect(() => {
    const polling = {};
    Object.keys(downloading).forEach(id => {
      if (downloading[id]) {
        polling[id] = setInterval(async () => {
          try {
            const res = await fetch(`http://localhost:4000/progress/${id}`);
            if (res.ok) {
              const data = await res.json();
              setProgress(p => ({ ...p, [id]: data }));
              if (data.phase === 'finished' || data.phase === 'error') {
                clearInterval(polling[id]);
              }
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 1000);
      }
    });
    return () => {
      Object.values(polling).forEach(clearInterval);
    };
  }, [downloading]);

  const handleSelect = (id) => {
    setSelected(selected =>
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(videos.map(v => v.id));
    } else {
      setSelected([]);
    }
  };
  const handleDownloadAll = async () => {
    setError("");
    setDownloading(d => ({ ...d, all: true }));
    setBatchProgress({ completed: 0, total: videos.length });
    try {
      let completed = 0;
      let interval = setInterval(() => {
        completed = Math.min(completed + 1, videos.length);
        setBatchProgress({ completed, total: videos.length });
      }, 1000);
      const res = await fetch('http://localhost:4000/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: videos.map(v => v.id) })
      });
      if (!res.ok) throw new Error('Batch download failed');
      clearInterval(interval);
      setBatchProgress({ completed: videos.length, total: videos.length });
      // Get filename from Content-Disposition header if present
      let filename = 'mp3s.zip';
      const cd = res.headers.get('Content-Disposition');
      if (cd) {
        const match = cd.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(d => ({ ...d, all: false }));
      setBatchProgress({ completed: 0, total: 0 });
    }
  };

  const handleDownload = async (id) => {
    setError("");
    setDownloading(d => ({ ...d, [id]: true }));
    setProgress(p => ({ ...p, [id]: { phase: 'starting', percent: 0 } }));
    try {
      const res = await fetch(`http://localhost:4000/download/${id}`);
      if (!res.ok) throw new Error('Download failed');
      setProgress(p => ({ ...p, [id]: { phase: 'finished', percent: 100 } }));
      // Get filename from Content-Disposition header if present
      let filename = `${id}.mp3`;
      const cd = res.headers.get('Content-Disposition');
      if (cd) {
        const match = cd.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
      setProgress(p => ({ ...p, [id]: { phase: 'error', error: err.message } }));
    } finally {
      setDownloading(d => ({ ...d, [id]: false }));
    }
  };

  const handleDownloadSelected = async () => {
    setError("");
    setDownloading(d => ({ ...d, selected: true }));
    setBatchProgress({ completed: 0, total: selected.length });
    try {
      // Simulate batch progress polling (replace with real backend progress API if available)
      let completed = 0;
      let interval = setInterval(() => {
        completed = Math.min(completed + 1, selected.length);
        setBatchProgress({ completed, total: selected.length });
      }, 1000);
      const res = await fetch('http://localhost:4000/download-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected })
      });
      if (!res.ok) throw new Error('Batch download failed');
      clearInterval(interval);
      setBatchProgress({ completed: selected.length, total: selected.length });
      // Get filename from Content-Disposition header if present
      let filename = 'mp3s.zip';
      const cd = res.headers.get('Content-Disposition');
      if (cd) {
        const match = cd.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(d => ({ ...d, selected: false }));
      setBatchProgress({ completed: 0, total: 0 });
    }
  };

  return (
    <div className={`yt-list theme-${theme}`} style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ marginRight: 12 }}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
          </button>
        </div>
        <div>
          <input
            type="checkbox"
            checked={selected.length === videos.length && videos.length > 0}
            onChange={handleSelectAll}
            id="select-all"
          />
          <label htmlFor="select-all" style={{ marginLeft: 6, fontWeight: 500 }}>Select All</label>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="yt-list-controls">
        <button onClick={handleDownloadSelected} disabled={selected.length === 0 || downloading.selected}>
          {downloading.selected ? 'Downloading...' : 'Download Selected'}
        </button>
        <button onClick={handleDownloadAll} disabled={downloading.all}>
          {downloading.all ? 'Downloading...' : 'Download All'}
        </button>
      </div>
      {(downloading.selected || downloading.all) && (
        <div style={{ marginBottom: 12 }}>
          Batch Progress: {batchProgress.completed} / {batchProgress.total}
          <progress value={batchProgress.completed} max={batchProgress.total} style={{ marginLeft: 8, verticalAlign: 'middle' }} />
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {videos.map(video => {
          const prog = progress[video.id] || {};
          return (
            <li key={video.id} className="yt-list-item">
              <input
                type="checkbox"
                checked={selected.includes(video.id)}
                onChange={() => handleSelect(video.id)}
                style={{ marginRight: 12 }}
              />
              {video.thumbnail && (
                <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
              )}
              <div className="yt-info">
                <div className="yt-title">{video.title}</div>
                {video.duration && <div className="yt-duration">Duration: {video.duration}s</div>}
                {downloading[video.id] && (
                  <div style={{ marginTop: 8, fontSize: '1em', fontWeight: 500 }}>
                    <span>Phase: {prog.phase || 'starting'}</span>
                    {prog.percent !== undefined && (
                      <span style={{ marginLeft: 12 }}>Progress: {prog.percent}%</span>
                    )}
                    {prog.started && (
                      <span style={{ marginLeft: 12 }}>Elapsed: {formatTime(Date.now() - prog.started)}</span>
                    )}
                    {prog.error && (
                      <span style={{ color: 'red', marginLeft: 12 }}>Error: {prog.error}</span>
                    )}
                  </div>
                )}
                {video.progress && <ProgressDetails progress={video.progress} />}
              </div>
              <button
                onClick={() => handleDownload(video.id)}
                disabled={!!downloading[video.id]}
                style={{ marginLeft: 12 }}
              >
                {downloading[video.id] ? 'Downloading...' : 'Download MP3'}
              </button>
              {downloading[video.id] && (
                <progress value={prog.percent || 0} max="100" style={{ marginLeft: 8 }} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default YouTubeList;
