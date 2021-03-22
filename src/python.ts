//@ts-nocheck
import lib_file from './python/library.py'
import export_variables_file from './python/exportVariables.py'
import reset_variables_file from './python/resetVariables.py'
//@ts-check
import { Vector3, Plane } from 'three'

export interface IPoint {
  name: string
  position: Vector3
}

export interface IFaceData {
  normal: Vector3
  constant: number
  points: IPoint[]
}

export interface IShape {
  points: IPoint[]
  faces_data: IFaceData[]
}

export interface IPlane {
  normal: Vector3
  points: [IPoint, IPoint, IPoint]
  section: boolean
  size: number
  plane: Plane
}

export interface ILine {
  a: IPoint
  b: IPoint
}

export interface IArrow {
  a: IPoint
  b: IPoint
}

export class Python {
  private pyodide!: any
  private library!: string
  private export_variables!: string
  private reset_variables!: string

  constructor() { }

  public async prepare() {
    //@ts-ignore
    await window.languagePluginLoader
    //@ts-ignore
    this.pyodide = window.pyodide

    const [library, export_variables, reset_variables] = await this.getAllAsyncData()
    await this.runPythonCode(library)
    this.library = library
    this.export_variables = export_variables
    this.reset_variables = reset_variables
  }

  protected getAllAsyncData() {
    return Promise.all([this.getCodeFromFile(lib_file), this.getCodeFromFile(export_variables_file), this.getCodeFromFile(reset_variables_file)])
  }

  protected getCodeFromFile(file: string) {
    return fetch(file).then((r) => r.text())
  }

  protected async runPythonCode(code: string) {
    await this.pyodide.runPythonAsync(code)
  }

  protected resetVariables() {
    return this.runPythonCode(this.reset_variables)
  }

  protected exportVariables() {
    return this.runPythonCode(this.export_variables)
  }

  public async runCode(code: string) {
    await this.resetVariables()
    await this.runPythonCode(code)
    await this.exportVariables()
  }

  public getData() {
    const _points = JSON.parse(this.pyodide.globals.result_points) as any[]
    const _shapes = JSON.parse(this.pyodide.globals.result_shapes) as any[]
    const _planes = JSON.parse(this.pyodide.globals.result_planes) as any[]
    const _arrows = Array.from(new Set(JSON.parse(this.pyodide.globals.result_arrows))) as string[]
    const _lines = Array.from(new Set(JSON.parse(this.pyodide.globals.result_lines))) as string[]
    const _rotate = this.pyodide.globals.result_rotate as number

    const toVec = ([x, y, z]: [number, number, number]) => new Vector3(x, y, z)
    const points = _points.map(({ name, position }): IPoint => ({ name, position: toVec(position) }))

    const findPointByName = (name: string) => points.find((pt) => pt.name === name)

    const shapes = _shapes.map(
      ({ points, faces_data }): IShape => ({
        points: points.map((name) => findPointByName(name)),
        faces_data: faces_data.map(
          ({ normal, constant, points }): IFaceData => ({
            normal: toVec(normal),
            constant,
            points: points.map(({ name, position }): IPoint => ({ name, position: toVec(position) })),
          })
        ),
      })
    )

    const planes = _planes.map(
      ([normal, a, b, c, section, size]): IPlane => ({
        normal: toVec(normal),
        points: [a, b, c].map(({ name, position }): IPoint => ({ name, position: toVec(position) })),
        section,
        size,
        plane: new Plane(toVec(normal)).translate(toVec(a.position)),
      })
    )

    const arrows = _arrows
      .map((pts) => pts.split(''))
      .map(
        ([a, b]): IArrow => ({
          a: findPointByName(a),
          b: findPointByName(b),
        })
      )

    const lines = _lines
      .map((pts) => pts.split(''))
      .map(
        ([a, b]): IArrow => ({
          a: findPointByName(a),
          b: findPointByName(b),
        })
      )

    const rotate = _rotate > 0 ? _rotate : false

    return { shapes, planes, arrows, points, lines, rotate }
  }
}
