import { useRef } from "react";

export default function QueryEditor({ query, onChange, onRun, loading }) {
  const ref = useRef(null);

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <span className="editor-label">SQL Editor</span>
        <button className="run-btn" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : "Run"}
        </button>
      </div>
      <textarea
        ref={ref}
        className="editor-textarea"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder={"SELECT ...\n\nPress Ctrl+Enter (or Cmd+Enter) to run."}
      />
    </div>
  );
}
