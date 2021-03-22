import * as THREE from 'three'
import earcut from 'earcut'
//@ts-ignore
import points3dto2d from 'points-3d-to-2d'

//@ts-ignore
import _OrbitControls from 'three-orbit-controls'
const OrbitControls = _OrbitControls(THREE)

import fontdata from './data/fontdata'
import colors from './data/colors'
import { Editor } from './editor'
import { Python, IPlane } from './python'
import { PlaneViewer } from './planeViewer'
import { DomManager } from './domManager'


const colornames = Object.keys(colors).filter((name) => name !== 'grey')

function randomColor(k: keyof typeof colors.red = 500) {
  const index = Math.floor(Math.random() * colornames.length)
  const name = colornames[index] as keyof typeof colors
  const hexString = colors[name][k]
  const hex = +hexString.replace('#', '0x')
  return hex
}

function removeDuplicates<T, K>(arr: T[], hashFunc: (v: T) => K): T[] {
  const uniques: T[] = []
  const hashes: K[] = []

  for (const val of arr) {
    const hash = hashFunc(val)
    if (!hashes.includes(hash)) {
      uniques.push(val)
      hashes.push(hash)
    }
  }

  return uniques
}

function handleError(e: string, editor: Editor) {
  const lines = e.split('\n') as string[]
  const lastLineIndex = Math.max(
    ...lines
      .map((text, index) => ({ text, index }))
      .filter(({ text }) => text.includes('<module>'))
      .map(({ index }) => index)
  )
  const errorLine = lines[lastLineIndex]
  const codeLine = +errorLine.replace(/\D/g, '')
  const errorBlocks = lines[lines.length - 2].split(': ')
  const codeLineContent = editor.getContent(codeLine)
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

  editor.showMarker({
    message,
    columns: [startColumn, endColumn],
    lines: [codeLine, codeLine]
  })
}

function roundVec(v: THREE.Vector3, round = 1e-6) {
  let [x, y, z] = v.toArray()

  x = Math.round(x / round) * round
  y = Math.round(y / round) * round
  z = Math.round(z / round) * round

  return new THREE.Vector3(x, y, z)
}

function getMatrixOnPlane(plane: IPlane) {
  // https://stackoverflow.com/questions/49769459/convert-points-on-a-3d-plane-to-2d-coordinates
  const A = plane.points[0].position
  const B = plane.points[1].position
  const C = plane.points[2].position
  const AB = new THREE.Vector3().subVectors(B, A)
  const AC = new THREE.Vector3().subVectors(C, A)
  const N = new THREE.Vector3().crossVectors(AB, AC).normalize()
  const U = AB.clone().normalize()
  const V = new THREE.Vector3().crossVectors(U, N)
  const S = new THREE.Matrix4()

  /*
      [Ax Ux Vx Nx]
  S = [Ay Uy Vy Ny]
      [Az Uz Vz Nz]
      [1  1  1  1 ]
  */

  S.set(A.x, U.x, V.x, N.x, A.y, U.y, V.y, N.y, A.z, U.z, V.z, N.z, 1, 1, 1, 1)

  const D = new THREE.Matrix4()
  D.set(0, 1, 0, 0,/**/ 0, 0, 1, 0, /**/0, 0, 0, 1, /**/1, 1, 1, 1)

  const Sinv = S.invert()

  const M = new THREE.Matrix4().multiplyMatrices(D, Sinv)

  console.log('A', A.toArray(), A.applyMatrix4(M).toArray())
  console.log('B', B.toArray(), B.applyMatrix4(M).toArray())
  console.log('C', C.toArray(), C.applyMatrix4(M).toArray())

  return M
}

async function main() {
  const python = new Python()
  const editor = new Editor('.editor', runCode)
  const domManager = new DomManager(runCode, editor)
  await python.prepare()

  const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
  const [w, h] = [innerWidth, innerHeight * 0.8]
  renderer.setSize(w, h)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)

  const controls = new OrbitControls(camera, renderer.domElement)
  const point_geom = new THREE.SphereGeometry(0.1, 8, 8)
  const point_mate = new THREE.MeshBasicMaterial({ color: colors.blue[500] })
  // const point_mate2 = new THREE.MeshBasicMaterial({ color: colors.red[500], opacity: 0.3 })
  const text_mate = new THREE.MeshBasicMaterial({ color: colors.grey[100] })
  const lines_mate = new THREE.LineBasicMaterial({ color: colors.grey[300] })

  const font = new THREE.Font(fontdata)

  const texts: THREE.Mesh[] = []

  camera.position.z = 8
  camera.position.y = 4
  camera.lookAt(0, 0, 0)

  controls.update()

  async function runCode() {
    editor.removeMarkers()

    try {
      await python.runCode(editor.getContent())
      console.count()
    } catch (e) {
      handleError(e.toString(), editor)
    }

    const { shapes, rotate, planes, arrows, lines, points } = python.getData()

    controls.autoRotate = typeof rotate === "number"
    controls.autoRotateSpeed = rotate || 0

    renderer.clippingPlanes = []
    scene.clear()
    while (texts.length > 0) texts.pop()

    const sections: [IPlane, number][] = []

    for (const _plane of planes) {
      const { plane, section, size } = _plane
      const color = randomColor()

      const plane_mesh = new PlaneViewer(plane, 5 * size, color)
      scene.add(plane_mesh)

      if (section)
        sections.push([_plane, color])
    }


    for (const { name, position } of points) {
      const sphere = new THREE.Mesh(point_geom, point_mate)
      const [x, y, z] = position.toArray()
      sphere.position.set(x, y, z)
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

    for (const { a, b } of arrows) {
      const origin = a.position
      const dir = new THREE.Vector3().subVectors(b.position, a.position)
      const len = dir.length()
      const arr = new THREE.ArrowHelper(dir.normalize(), origin, len)
      scene.add(arr)
    }

    for (const { a, b } of lines) {
      const pts = [a.position, b.position]
      const lines_geom = new THREE.BufferGeometry().setFromPoints(pts)
      const mesh = new THREE.Line(lines_geom, lines_mate)
      scene.add(mesh)
    }

    for (const shape of shapes) {

      for (const [plane, color] of sections) {
        let intersection: THREE.Vector3[] = []

        for (const { points: [a, b, c] } of shape.faces_data) {
          const ab = new THREE.Line3(a.position, b.position)
          const bc = new THREE.Line3(b.position, c.position)
          const ac = new THREE.Line3(a.position, c.position)

          const i1 = (plane.plane.intersectLine(ab, new THREE.Vector3()))
          const i2 = (plane.plane.intersectLine(bc, new THREE.Vector3()))
          const i3 = (plane.plane.intersectLine(ac, new THREE.Vector3()))

          for (const i of [i1, i2, i3])
            if (i)
              intersection.push(roundVec(i))
        }

        if (intersection.length >= 3) {
          console.log(intersection.length)
          intersection = removeDuplicates(intersection, (v) => v.toArray().join(' '))
          console.log(intersection.length)

          // const mat = getMatrixOnPlane(plane)

          const triangulationPoints: THREE.Vector3[] = intersection
          // const _ctr = new THREE.Vector3();
          // const _plane = new THREE.Plane()
          // const _q = new THREE.Quaternion();
          // const _y = new THREE.Vector3();
          // const _x = new THREE.Vector3();

          // const X = new THREE.Vector3(1.0, 0.0, 0.0);
          // const Y = new THREE.Vector3(0.0, 1.0, 0.0);
          // const Z = new THREE.Vector3(0.0, 0.0, 1.0);

          // const _tmp = new THREE.Vector3();

          // const _basis = new THREE.Matrix4();

          // // compute centroid
          // _ctr.setScalar(0.0);
          // for (const pt of triangulationPoints)
          //   _ctr.add(pt);
          // _ctr.multiplyScalar(1.0 / triangulationPoints.length);

          // // compute face normal
          // _plane.setFromCoplanarPoints(_ctr, triangulationPoints[0], triangulationPoints[1]);
          // const _z = _plane.normal;

          // // compute basis
          // _q.setFromUnitVectors(Z, _z);
          // _x.copy(X).applyQuaternion(_q);
          // _y.crossVectors(_x, _z);
          // _y.normalize();
          // _basis.makeBasis(_x, _y, _z);
          // _basis.setPosition(_ctr);

          // // project the 3D points on the 2D plane
          // const projPoints = [];
          // for (const pt of triangulationPoints) {
          //   _tmp.subVectors(pt, _ctr);
          //   projPoints.push(new THREE.Vector2(_tmp.dot(_x), _tmp.dot(_y)));
          // }

          // create the geometry (Three.js triangulation with ShapeBufferGeometry)
          // const shape = new THREE.Shape(projPoints);
          // const geometry = new THREE.ShapeBufferGeometry(shape);

          // transform geometry back to the initial coordinate system
          // geometry.applyMatrix4(_basis);

          // const triangulationVertices = [projPoints.map(pt => pt.toArray())].flat(Infinity)
          const intersectionGeometry = new THREE.BufferGeometry()

          const triangulationVertices = points3dto2d(intersection.map(pt => pt.toArray())).points
          const data = earcut.flatten([triangulationVertices])
          const triangles = earcut(data.vertices, data.holes, data.dimensions)
          console.log(triangles, data, triangulationVertices)

          intersectionGeometry.setIndex(triangles.flat())
          intersectionGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(intersection.map(pt => pt.toArray()).flat()), 3))
          // intersectionGeometry.applyMatrix4(_basis);
          const intersectionMesh = new THREE.Mesh(intersectionGeometry, new THREE.LineBasicMaterial({
            side: THREE.DoubleSide,
            color: 0x00ff00
          }))
          scene.add(intersectionMesh)

          // scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
          //   color,
          //   side: THREE.DoubleSide
          // })))
        }
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

    renderer.render(scene, camera)
  }

  runCode()
}

main()
