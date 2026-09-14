import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, MSSQL } from "@codemirror/lang-sql";
import { keymap } from "@codemirror/view";

export default function QueryEditor({ query, onChange, onRun, loading }) {
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const runKeymap = useMemo(
    () =>
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onRunRef.current();
            return true;
          },
        },
      ]),
    []
  );

  const extensions = useMemo(
    () => [sql({ dialect: MSSQL, upperCaseKeywords: true }), runKeymap],
    [runKeymap]
  );

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <span className="editor-label">SQL Editor</span>
        <button className="run-btn" onClick={onRun} disabled={loading}>
          {loading ? "Running…" : "Run"}
        </button>
      </div>
      <CodeMirror
        value={query}
        onChange={onChange}
        extensions={extensions}
        theme="dark"
        height="180px"
        className="sql-editor"
        placeholder="SELECT ... (Ctrl/Cmd+Enter to run)"
      />
    </div>
  );
}
