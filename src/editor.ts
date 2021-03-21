import * as monaco from 'monaco-editor'

export interface IMarker {
  message: string
  columns: [number, number]
  lines: [number, number]
}

export class Editor {
  static DEFAULT_CODE = `Tetrahedron('SABC')`

  protected editor!: monaco.editor.IStandaloneCodeEditor
  protected runCode: () => any

  constructor(selector: string, runCode: () => any) {
    const el = document.querySelector(selector) as HTMLElement
    this.editor = this.createEditor(el)
    this.addActions()
    this.addSuggestions()
    this.runCode = runCode
  }

  protected getModel() {
    return this.editor.getModel() as monaco.editor.ITextModel
  }

  public removeMarkers() {
    monaco.editor.setModelMarkers(this.getModel(), 'VECTOR_MATH', [])
  }

  public showMarker(marker: IMarker) {
    const { message, columns, lines } = marker
    const [startColumn, endColumn] = columns
    const [startLineNumber, endLineNumber] = lines

    monaco.editor.setModelMarkers(this.getModel(), 'VECTOR_MATH', [
      {
        message,
        severity: monaco.MarkerSeverity.Error,
        startColumn,
        endColumn,
        startLineNumber,
        endLineNumber,
      },
    ])
  }

  private createEditor(el: HTMLElement) {
    const editor = monaco.editor.create(el, {
      theme: 'vs-dark',
      model: monaco.editor.createModel(Editor.DEFAULT_CODE, 'python'),
      minimap: {
        enabled: false,
      },
    })
    editor.layout()
    return editor
  }

  public getContent(line?: number) {
    if (line === undefined) return this.getModel().getLinesContent().join('\n')
    else return this.getModel().getLineContent(line)
  }

  protected makeSuggestion({
    model,
    pos,
    kind,
    label,
  }: {
    model: monaco.editor.ITextModel
    pos: monaco.Position
    label: string
    kind: monaco.languages.CompletionItemKind
  }): monaco.languages.CompletionItem {
    const word = model.getWordUntilPosition(pos)
    const range: monaco.IRange = {
      startLineNumber: pos.lineNumber,
      endLineNumber: pos.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    }

    return {
      label,
      kind,
      insertText: label,
      range,
    }
  }

  protected addActions() {
    this.editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: (editor) => this.runCode(),
    })
  }

  protected addSuggestions() {
    const { CompletionItemKind } = monaco.languages

    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, pos) => ({
        suggestions: [
          // this.makeSuggestion({ model, pos, kind: CompletionItemKind.Class, label: 'Cube("ABCDEFGH")' }),
          // this.makeSuggestion({ model, pos, kind: CompletionItemKind.Class, label: 'Box("ABCDEFGH", 2.0, 3.0, 5.0)' }),
          // this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'plane("ABC", section=True)' }),
          // this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'plane("ABC", section=False)' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'plane("ABC")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'midPoint("I", "AB")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'pointFromVec("IJ", 2.0 * vec("AI"))' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'vec("AB")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'line("AB")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'showVector("AB")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'arrow("AB")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'rotate()' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'rotate(2.0)' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'dontRotate()' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'Tetrahedron("SABC")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'Pyramid("SABCD")' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'Pyramid("SABCD", base=Square)' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'Pyramid("SABCDE", base=Pentagon)' }),
          this.makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'Pyramid("SABCDEF", base=Hexagon)' }),
        ],
      }),
    })
  }
}
