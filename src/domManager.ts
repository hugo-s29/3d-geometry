import download from 'js-file-download'
import { Editor } from './editor'

export class DomManager {
  private loader: HTMLDivElement
  private runBtn: HTMLButtonElement
  private saveBtn: HTMLButtonElement

  public editor: Editor

  static FILE_NAME = 'saveFile.py'

  constructor(runCode: () => any, editor: Editor) {
    const loader = document.querySelector('.loader') as HTMLDivElement
    this.loader = loader
    loader.classList.remove('loading')

    const runBtn = document.querySelector('.run-btn') as HTMLButtonElement
    runBtn.addEventListener('click', () => runCode())
    this.runBtn = runBtn

    this.editor = editor

    const saveBtn = document.querySelector('.save-btn') as HTMLButtonElement
    saveBtn.addEventListener('click', () => this.downloadCode())
    this.saveBtn = saveBtn

    window.addEventListener('keydown', (e) => {
      if (e.keyCode == 83 && e.ctrlKey) {
        e.preventDefault()
        this.downloadCode()
      }
    })
  }

  public downloadCode() {
    download(this.editor.getContent(), DomManager.FILE_NAME)
  }
}
