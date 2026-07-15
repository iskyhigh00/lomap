import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Box } from '@editor/hitTest'

export type CameraMode = 'orbit' | 'walk'

const WALK_SPEED = 220 // cm/s — a brisk walking pace at this scene's 1-unit-= 1cm scale
const WALK_HEIGHT = 170 // eye height, cm

function frameBounds(camera: THREE.PerspectiveCamera, controls: OrbitControlsImpl | null, bounds: Box) {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minY + bounds.maxY) / 2
  const spanX = bounds.maxX - bounds.minX
  const spanZ = bounds.maxY - bounds.minY
  const radius = Math.max(spanX, spanZ, 200) / 2
  const distance = radius / Math.tan((camera.fov * Math.PI) / 360) + radius * 0.3

  camera.position.set(centerX + distance * 0.6, distance * 0.7, centerZ + distance * 0.6)
  camera.near = Math.max(1, distance / 1000)
  camera.far = distance * 20
  camera.updateProjectionMatrix()
  camera.lookAt(centerX, 0, centerZ)

  if (controls) {
    controls.target.set(centerX, 0, centerZ)
    controls.update()
  }
}

/** WASD/arrow-key movement for walk mode — `PointerLockControls` only
 * supplies mouse-look, not translation. Movement is constrained to the
 * horizontal plane at a fixed eye height (no flying, no gravity/collision
 * yet — a placeholder-grade walkthrough, matching the rest of this phase's
 * "performance and sync over realism" brief). */
function useWalkMovement(enabled: boolean) {
  const { camera } = useThree()
  const pressed = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled) return
    const keys = pressed.current
    const down = (e: KeyboardEvent) => keys.add(e.code)
    const up = (e: KeyboardEvent) => keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.clear()
    }
  }, [enabled])

  useFrame((_, delta) => {
    if (!enabled) return
    const keys = pressed.current
    if (keys.size === 0) return
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()

    const move = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(forward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(forward)
    if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right)
    if (move.lengthSq() === 0) return
    move.normalize().multiplyScalar(WALK_SPEED * delta)
    camera.position.add(move)
    camera.position.y = WALK_HEIGHT
  })
}

export function CameraRig({ mode, bounds, frameSignal }: { mode: CameraMode; bounds: Box | null; frameSignal: number }) {
  const { camera } = useThree()
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  useWalkMovement(mode === 'walk')

  // Auto-frame on mount and whenever the toolbar's "Encuadre" button bumps
  // `frameSignal` — not on every entity edit, which would fight a user
  // mid-orbit while the 2D view (kept in sync) is being edited elsewhere.
  useEffect(() => {
    if (!bounds || !(camera instanceof THREE.PerspectiveCamera)) return
    frameBounds(camera, mode === 'orbit' ? orbitRef.current : null, bounds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameSignal])

  useEffect(() => {
    if (mode === 'walk' && camera instanceof THREE.PerspectiveCamera) {
      camera.position.y = WALK_HEIGHT
    }
  }, [mode, camera])

  if (mode === 'walk') {
    return <PointerLockControls />
  }
  return <OrbitControls ref={orbitRef} makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2 - 0.02} />
}
