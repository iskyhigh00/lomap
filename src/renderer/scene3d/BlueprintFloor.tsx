import { useEffect, useState } from 'react'
import * as THREE from 'three'
import type { BlueprintDocument } from '@blueprint/types'
import { getBlueprintBitmap } from '@blueprint/blueprintImageCache'

const SLAB_THICKNESS = 6 // reads as a physical floor slab, not a floating decal
const FLOOR_TOP = -0.5 // top face just under zones/grid so it reads as ground

function BlueprintPlane({ doc }: { doc: BlueprintDocument }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const bitmap = getBlueprintBitmap(doc.id)
    if (!bitmap) return
    const tex = new THREE.Texture(bitmap)
    tex.needsUpdate = true
    tex.colorSpace = THREE.SRGBColorSpace
    setTexture(tex)
    return () => tex.dispose()
  }, [doc.id])

  if (!texture) return null

  const width = doc.naturalWidth * doc.transform.scaleX
  const height = doc.naturalHeight * doc.transform.scaleY
  const center = { x: doc.transform.x + width / 2, y: doc.transform.y + height / 2 }

  // The outer group does the one, already-verified world→scene mapping
  // (`ZoneMeshes` uses the identical +90°-about-X trick: a local (x, y, 0)
  // point lands at scene (x, 0, y)). Both meshes' position/Z-rotation stay
  // in that pre-transform local space, so their in-plane spin uses the
  // *raw* world rotation (not `worldRotationToScene`'s negation) — that
  // negation only applies when rotating directly around the scene's own Y
  // axis, which this two-step composition never does directly.
  //
  // Physical thickness ("losa") is a second, untextured box sitting just
  // beneath the original (unchanged, already-correct) textured plane rather
  // than reworking the plane into a textured box face — six-face material
  // index mapping under this rotation is easy to get backwards, and the
  // plane's orientation was already verified against the 2D plan.
  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, FLOOR_TOP, 0]}>
      <mesh position={[center.x, center.y, 0]} rotation={[0, 0, doc.transform.rotation]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent opacity={doc.opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[center.x, center.y, SLAB_THICKNESS / 2 + 0.05]} rotation={[0, 0, doc.transform.rotation]}>
        <boxGeometry args={[width, height, SLAB_THICKNESS]} />
        <meshStandardMaterial color="#232a34" roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Optional floor reference — the same blueprint documents the 2D editor
 * traces over, reused as-is (no separate 3D image pipeline). Toggled by the
 * 3D view's own overlay, off by default so a project with no blueprint pays
 * nothing for this. */
export function BlueprintFloor({ documents }: { documents: BlueprintDocument[] }) {
  const visible = documents.filter((doc) => doc.visible)
  return (
    <>
      {visible.map((doc) => (
        <BlueprintPlane key={doc.id} doc={doc} />
      ))}
    </>
  )
}
