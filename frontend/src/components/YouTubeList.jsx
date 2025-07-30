import React, { useState } from 'react';

function YouTubeList({ videos }) {
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [progress, setProgress] = useState({}); // per-video progress
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState("");
  const [theme, setTheme] = useState('light');

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
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mp3s.zip';
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
    setProgress(p => ({ ...p, [id]: 0 }));
    try {
      // Simulate progress polling (replace with real backend progress API if available)
      let interval = setInterval(() => {
        setProgress(p => ({ ...p, [id]: Math.min((p[id] || 0) + 20, 100) }));
      }, 500);
      const res = await fetch(`http://localhost:4000/download/${id}`);
      if (!res.ok) throw new Error('Download failed');
      clearInterval(interval);
      setProgress(p => ({ ...p, [id]: 100 }));
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(d => ({ ...d, [id]: false }));
      setProgress(p => ({ ...p, [id]: 0 }));
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
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mp3s.zip';
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
        {videos.map(video => (
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
            </div>
            <button
              onClick={() => handleDownload(video.id)}
              disabled={!!downloading[video.id]}
              style={{ marginLeft: 12 }}
            >
              {downloading[video.id] ? 'Downloading...' : 'Download MP3'}
            </button>
            {downloading[video.id] && (
              <progress value={progress[video.id] || 0} max="100" style={{ marginLeft: 8 }} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="yt-list">
      <div className="yt-list-controls">
        <button onClick={handleDownloadSelected} disabled={selected.length === 0 || downloading.selected}>
          {downloading.selected ? 'Downloading...' : 'Download Selected'}
        </button>
        <button onClick={handleDownloadAll} disabled={downloading.all}>
          {downloading.all ? 'Downloading...' : 'Download All'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <ul>
        {videos.map(video => (
          <li key={video.id} className="yt-list-item">
            <input
              type="checkbox"
              checked={selected.includes(video.id)}
              onChange={() => handleSelect(video.id)}
            />
            <img src={video.thumbnail} alt={video.title} className="yt-thumb" />
            <div className="yt-info">
              <div className="yt-title">{video.title}</div>
              <div className="yt-duration">{video.duration}s</div>
            </div>
            <button onClick={() => handleDownload(video.id)} disabled={!!downloading[video.id]}>
              {downloading[video.id] ? 'Downloading...' : 'Download MP3'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default YouTubeList;
