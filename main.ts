import * as THREE from 'three'
import _OrbitControls from 'three-orbit-controls'
import fontdata from './fontdata'
import * as monaco from 'monaco-editor'
//@ts-ignore
import lib_file from './library.py'
//@ts-ignore
import export_variables_file from './exportVariables.py'
//@ts-ignore
import reset_variables_file from './resetVariables.py'
import colors from './colors'
import download from 'js-file-download'

const OrbitControls = _OrbitControls(THREE)

const code = `Pyramid('ABCDE')
midPoint("I", "AB")
plane("ABC", section=True)`

class PlaneViewer extends THREE.Line {
  plane: THREE.Plane
  size: number
  constructor(plane, size = 1, hex = 0xffff00, section) {
    const color = hex

    const positions = [1, -1, 1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 0, 0, 1]

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.computeBoundingSphere()

    super(geometry, new THREE.LineBasicMaterial({ color: color, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }))

    this.type = 'PlaneHelper'

    this.plane = plane

    this.size = size

    const positions2 = [1, 1, 1, -1, 1, 1, -1, -1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1]

    const geometry2 = new THREE.BufferGeometry()
    geometry2.setAttribute('position', new THREE.Float32BufferAttribute(positions2, 3))
    geometry2.computeBoundingSphere()

    this.add(
      new THREE.Mesh(
        geometry2,
        new THREE.MeshBasicMaterial({
          color: color,
          opacity: 0.2,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    )
  }

  updateMatrixWorld(force) {
    let scale = -this.plane.constant

    if (Math.abs(scale) < 1e-8) scale = 1e-8 // sign does not matter

    this.scale.set(0.5 * this.size, 0.5 * this.size, scale)

    this.lookAt(this.plane.normal)

    super.updateMatrixWorld(force)
  }
}

async function main() {
  //@ts-ignore
  await window.languagePluginLoader

  document.querySelector('.loader').classList.remove('loading')

  //@ts-ignore
  const { pyodide } = window

  const el: HTMLElement = document.querySelector('.editor')
  const run: HTMLElement = document.querySelector('.run-btn')
  const editor = monaco.editor.create(el, {
    theme: 'vs-dark',
    model: monaco.editor.createModel(code, 'python'),
    minimap: {
      enabled: false,
    },
  })

  function makeSuggestion({
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
    // const last_chars = model.getValueInRange({ startLineNumber: pos.lineNumber, startColumn: 0, endLineNumber: pos.lineNumber, endColumn: pos.column })
    const range: monaco.IRange = {
      startLineNumber: pos.lineNumber,
      endLineNumber: pos.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    }

    // const startIndex = label.indexOf(last_chars)
    // const insertText = label.slice(startIndex + last_chars.length, label.length)

    return {
      label,
      kind,
      insertText: label,
      range,
    }
  }

  const { CompletionItemKind } = monaco.languages

  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, pos) => ({
      suggestions: [
        makeSuggestion({ model, pos, kind: CompletionItemKind.Class, label: 'Cube("ABCDEFGH")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Class, label: 'Box("ABCDEFGH", 2.0, 3.0, 5.0)' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'plane("ABC", section=True)' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'plane("ABC", section=False)' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'midPoint("I", "AB")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'pointFromVec("IJ", 2.0 * vec("AI"))' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'vec("AB")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'line("AB")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'showVector("AB")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'arrow("AB")' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'rotate()' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'rotate(2.0)' }),
        makeSuggestion({ model, pos, kind: CompletionItemKind.Function, label: 'dontRotate()' }),
      ],
    }),
  })

  editor.addAction({
    id: 'run-code',
    label: 'Run Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run(edi) {
      return runCode()
    },
  })

  editor.layout()
  const fileName = 'saveFile.py'

  window.addEventListener('keydown', (e) => {
    if (e.keyCode == 83 && e.ctrlKey) {
      e.preventDefault()
      download(editor.getModel().getLinesContent().join('\n'), fileName)
    }
  })

  document.querySelector('.save-btn').addEventListener('click', () => {
    download(editor.getModel().getLinesContent().join('\n'), fileName)
  })

  const [lib, exportVariables, resetVariables] = await Promise.all([
    fetch(lib_file).then((r) => r.text()),
    fetch(export_variables_file).then((r) => r.text()),
    fetch(reset_variables_file).then((r) => r.text()),
  ])
  await pyodide.runPythonAsync(lib)

  const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
  const [w, h] = [innerWidth, innerHeight * 0.8]
  renderer.setSize(w, h)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)

  window.addEventListener('resize', () => {
    const [w, h] = [innerWidth, innerHeight * 0.8]
    renderer.setSize(w, h)
    camera.aspect = w / h
  })

  const controls = new OrbitControls(camera, renderer.domElement)
  const point_geom = new THREE.SphereGeometry(0.1, 8, 8)
  const point_mate = new THREE.MeshBasicMaterial({ color: colors.blue[500] })
  const text_mate = new THREE.MeshBasicMaterial({ color: colors.grey[100] })
  const lines_mate = new THREE.LineBasicMaterial({ color: colors.grey[300] })

  const font = new THREE.Font(fontdata)

  const colornames = Object.keys(colors).filter((name) => name !== 'grey')

  function randomColor(k: number = 500) {
    const index = Math.floor(Math.random() * colornames.length)
    const name = colornames[index]
    return colors[name][k]
  }

  const texts: THREE.Mesh[] = []
  const objectMaterials: THREE.RawShaderMaterial[] = []

  run.addEventListener('click', () => runCode())

  camera.position.z = 8
  camera.position.y = 4
  camera.lookAt(0, 0, 0)

  controls.update()

  function hexToRGB(h) {
    const r = '0x' + h[1] + h[2]
    const g = '0x' + h[3] + h[4]
    const b = '0x' + h[5] + h[6]

    return new THREE.Vector3(+r / 255, +g / 255, +b / 255)
  }

  async function runCode() {
    monaco.editor.setModelMarkers(editor.getModel(), 'VECTOR_MATH', [])

    try {
      await pyodide.runPythonAsync(resetVariables)
      await pyodide.runPythonAsync(editor.getModel().getLinesContent().join('\n'))
      await pyodide.runPythonAsync(exportVariables)
      console.count()
    } catch (e) {
      const lines = e.toString().split('\n')
      const lastLineIndex = Math.max(
        lines
          .map((text, index) => ({ text, index }))
          .filter(({ text }) => text.includes('<module>'))
          .map(({ index }) => index)
      )
      const errorLine = lines[lastLineIndex]
      const codeLine = +errorLine.replace(/\D/g, '')
      const errorBlocks = lines[lines.length - 2].split(': ')
      const codeLineContent = editor.getModel().getLineContent(codeLine)
      const errorName = errorBlocks.shift()
      const message = errorBlocks.join(': ')

      let startColumn = 1
      let endColumn = codeLineContent.length + 1

      if (errorName === 'UnknownPointError') {
        // Start searching at '('
        const startSearchIndex = codeLineContent.indexOf('(')
        const startPointSearch = message.indexOf("'")
        const point = message.slice(startPointSearch + 1, startPointSearch + 2)
        const pointIndex = codeLineContent.slice(startSearchIndex, codeLineContent.length).indexOf(point) + startSearchIndex + 1
        startColumn = pointIndex
        endColumn = pointIndex + 1
      }

      monaco.editor.setModelMarkers(editor.getModel(), 'VECTOR_MATH', [
        {
          message,
          severity: monaco.MarkerSeverity.Error,
          startColumn,
          endColumn,
          startLineNumber: codeLine,
          endLineNumber: codeLine,
        },
      ])

      return
    }

    const points = JSON.parse(pyodide.globals.result_points)
    const shapes = JSON.parse(pyodide.globals.result_shapes)
    const planes = JSON.parse(pyodide.globals.result_planes)
    const arrows = JSON.parse(pyodide.globals.result_arrows)
    const lines = Array.from(new Set(JSON.parse(pyodide.globals.result_lines))) as string[]
    const rotate = pyodide.globals.result_rotate

    controls.autoRotate = rotate > 0
    controls.autoRotateSpeed = rotate

    const clippingPlanes: [THREE.Plane, string][] = []

    renderer.clippingPlanes = []
    scene.clear()
    while (texts.length > 0) texts.pop()
    while (objectMaterials.length > 0) objectMaterials.pop()

    const threePlanes: THREE.Plane[] = []

    for (const [_normal, a, b, c, section, size] of planes) {
      const normal = new THREE.Vector3(_normal[0], _normal[1], _normal[2])
      const plane = new THREE.Plane(normal)
      plane.translate(new THREE.Vector3(a[0], a[1], a[2]))

      threePlanes.push(plane)

      const color = randomColor()

      if (section) {
        clippingPlanes.push([plane, color])
      }

      const plane_mesh = new PlaneViewer(plane, 5 * size, color, section)
      scene.add(plane_mesh)
    }


    for (const [name, x, y, z] of points) {
      const sphere = new THREE.Mesh(point_geom, point_mate)
      sphere.position.x = x
      sphere.position.y = y
      sphere.position.z = z
      scene.add(sphere)

      const text_geom = new THREE.TextGeometry(name, { font })
      const text_mesh = new THREE.Mesh(text_geom, text_mate)
      text_mesh.scale.x = 0.002
      text_mesh.scale.y = 0.002
      text_mesh.scale.z = 0.0001
      text_mesh.translateX(x + 0.1)
      text_mesh.translateY(y + 0.1)
      text_mesh.translateZ(z)
      texts.push(text_mesh)
      scene.add(text_mesh)
    }

    for (const arrow of arrows) {
      const a = arrow[0]
      const b = arrow[1]
      const [ax, ay, az] = points.find((pt) => pt[0] === a).filter((_, i) => i >= 1)
      const [bx, by, bz] = points.find((pt) => pt[0] === b).filter((_, i) => i >= 1)
      const A = new THREE.Vector3(ax, ay, az)
      const B = new THREE.Vector3(bx, by, bz)
      const origin = A.clone()
      const dir = new THREE.Vector3().subVectors(B, A)
      const len = dir.length()
      const arr = new THREE.ArrowHelper(dir.normalize(), origin, len)
      scene.add(arr)
    }

    for (const line of lines) {
      const a = line[0]
      const b = line[1]
      const [ax, ay, az] = points.find((pt) => pt[0] === a).filter((_, i) => i >= 1)
      const [bx, by, bz] = points.find((pt) => pt[0] === b).filter((_, i) => i >= 1)
      const pts = [new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]
      const lines_geom = new THREE.BufferGeometry().setFromPoints(pts)
      const mesh = new THREE.Line(lines_geom, lines_mate)
      scene.add(mesh)
    }

    for (const shape of shapes) {
      console.log(shape)
      const faces = shape.faces

      for (const plane of threePlanes) {


      }
    }
  }

  animate()
  function animate() {
    requestAnimationFrame(animate)
    controls.update()

    for (const text of texts) {
      text.lookAt(camera.position)
    }

    for (const mat of objectMaterials) mat.uniforms.camera.value = camera.position

    renderer.render(scene, camera)
  }

  runCode()
}

main()
