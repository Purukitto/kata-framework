import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  type InitializeResult,
  type CompletionItem as LSPCompletionItem,
  CompletionItemKind,
  SymbolKind,
  type DocumentSymbol as LSPDocumentSymbol,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { WorkspaceIndex } from "./workspace";
import { getDiagnostics } from "./diagnostics";
import { getCompletions } from "./completions";
import { getHover } from "./hover";
import { getDefinition } from "./definition";
import { getDocumentSymbols } from "./symbols";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const index = new WorkspaceIndex();

connection.onInitialize((): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["@", "$", "{", '"'] },
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
    },
  };
});

documents.onDidChangeContent((change) => {
  const uri = change.document.uri;
  const content = change.document.getText();

  const diagnostics = getDiagnostics(uri, content, index);

  connection.sendDiagnostics({
    uri,
    diagnostics: diagnostics.map((d) => ({
      range: d.range,
      severity: d.severity,
      message: d.message,
      source: d.source,
    })),
  });
});

connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const items = getCompletions(
    doc.getText(),
    params.position.line,
    params.position.character,
    index
  );

  return items.map(
    (item): LSPCompletionItem => ({
      label: item.label,
      kind:
        item.kind === "scene"
          ? CompletionItemKind.Module
          : item.kind === "variable"
            ? CompletionItemKind.Variable
            : CompletionItemKind.File,
      detail: item.detail,
    })
  );
});

connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const result = getHover(
    doc.getText(),
    params.position.line,
    params.position.character,
    index
  );

  if (!result) return null;

  return {
    contents: { kind: "markdown" as const, value: result.contents },
  };
});

connection.onDefinition((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const result = getDefinition(
    doc.getText(),
    params.position.line,
    params.position.character,
    index
  );

  if (!result) return null;

  return {
    uri: result.uri,
    range: result.range,
  };
});

connection.onDocumentSymbol((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const symbols = getDocumentSymbols(doc.getText(), params.textDocument.uri, index);

  return symbols.map(
    (s): LSPDocumentSymbol => ({
      name: s.name,
      kind:
        s.kind === "module"
          ? SymbolKind.Module
          : s.kind === "function"
            ? SymbolKind.Function
            : SymbolKind.Property,
      range: s.range,
      selectionRange: s.range,
    })
  );
});

documents.listen(connection);
connection.listen();
