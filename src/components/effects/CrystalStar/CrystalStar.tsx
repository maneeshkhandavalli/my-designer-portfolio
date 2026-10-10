import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { MathUtils, type Mesh } from 'three'
import { WebGLCanvas } from '@/components/effects/WebGLCanvas/WebGLCanvas'
import { createStarGeometry } from './starGeometry'

/** Scroll-driven values written by GSAP (Story section) and read every frame. */
export type StarMotion = {
  scale: number
  /** Z rotation in radians. */
  spin: number
  /** Vertical offset in star radii. */
  lift: number
}

type CrystalStarProps = {
  motion: RefObject<StarMotion>
  /** Render loop runs only while true (pause when off-screen). */
  active: boolean
  reducedMotion: boolean
  className?: string
}

/**
 * The six-point red star as a WebGL object that reads as the flat PNG graphic:
 * its dimensionality shows mostly through motion (tilt, float, scroll spin).
 * Lazy-loaded (default export) so three.js stays out of the initial bundle.
 */
export default function CrystalStar({ motion, active, reducedMotion, className }: CrystalStarProps) {
  return (
    <WebGLCanvas
      flat
      className={className}
      // Reduced motion: the star is static — render on demand, not every frame.
      frameloop={active ? (reducedMotion ? 'demand' : 'always') : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 30 }}
      fallback={<img src="/assets/images/main-star.png" alt="" className="mx-auto h-[70%] w-auto" />}
    >
      {/* Front-on, ambient + key·N·L + fill·N·L ≈ π, so the star renders at its sampled PNG colours;
          tilting shifts the key light slightly — that is the only visible "3D" shading. */}
      <ambientLight intensity={2.6} />
      <directionalLight position={[-3, 4, 5]} intensity={0.7} />
      <directionalLight position={[3, -2, 4]} intensity={0.15} />
      <Star motion={motion} reducedMotion={reducedMotion} />
    </WebGLCanvas>
  )
}

type StarProps = {
  motion: RefObject<StarMotion>
  reducedMotion: boolean
}

function Star({ motion, reducedMotion }: StarProps) {
  const mesh = useRef<Mesh>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const geometry = useMemo(() => createStarGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    if (reducedMotion) return
    const onPointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [reducedMotion])

  useFrame(({ clock }, delta) => {
    const star = mesh.current
    if (!star) return
    const { scale, spin, lift } = motion.current
    const t = clock.elapsedTime
    // Idle "breathing" + pointer tilt; zero when reduced motion is requested.
    const live = reducedMotion ? 0 : 1
    const targetX = (-pointer.current.y * 0.14 + Math.sin(t * 0.31) * 0.035) * live
    const targetY = (pointer.current.x * 0.18 + Math.cos(t * 0.23) * 0.045) * live

    star.rotation.x = MathUtils.damp(star.rotation.x, targetX, 2, delta)
    star.rotation.y = MathUtils.damp(star.rotation.y, targetY, 2, delta)
    star.rotation.z = spin + Math.sin(t * 0.13) * 0.03 * live
    star.position.y = lift + Math.sin(t * 0.42) * 0.035 * live
    star.scale.setScalar(scale)
  })

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.7} metalness={0} />
    </mesh>
  )
}
