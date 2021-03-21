import * as THREE from 'three'

export class PlaneViewer extends THREE.Line {
  plane: THREE.Plane
  size: number
  constructor(plane: THREE.Plane, size = 1, hex = 0xffff00) {
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

  updateMatrixWorld(force?: boolean) {
    let scale = -this.plane.constant

    if (Math.abs(scale) < 1e-8) scale = 1e-8 // sign does not matter

    this.scale.set(0.5 * this.size, 0.5 * this.size, scale)

    this.lookAt(this.plane.normal)

    super.updateMatrixWorld(force)
  }
}
