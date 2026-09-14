import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, MSSQL } from "@codemirror/lang-sql";
import { keymap, EditorView } from "@codemirror/view";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";

const sqlTheme = createTheme({
  theme: "dark",
  settings: {
    background: "#0f1117",
    foreground: "#d7e3ff",
    caret: "#4f8cff",
    selection: "#2a3a5c",
    selectionMatch: "#2a3a5c",
    lineHighlight: "#161a24",
    gutterBackground: "#0f1117",
    gutterForeground: "#6a737d",
    gutterActiveForeground: "#d7e3ff",
  },
  styles: [
    { tag: t.keyword, color: "#c792ea", fontWeight: "500" },
    { tag: t.string, color: "#c3e88d" },
    { tag: t.number, color: "#f78c6c" },
    { tag: t.comment, color: "#6a737d", fontStyle: "italic" },
    { tag: t.function(t.variableName), color: "#82aaff" },
    { tag: t.typeName, color: "#ffcb6b" },
    { tag: t.propertyName, color: "#d7e3ff" },
    { tag: t.variableName, color: "#d7e3ff" },
    { tag: t.operator, color: "#89ddff" },
    { tag: t.punctuation, color: "#89ddff" },
  ],
});

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
    () => [
      sql({ dialect: MSSQL, upperCaseKeywords: true }),
      EditorView.lineWrapping,
      runKeymap,
    ],
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
        theme={sqlTheme}
        height="180px"
        className="sql-editor"
        placeholder="SELECT ... (Ctrl/Cmd+Enter to run)"
      />
    </div>
  );
}
