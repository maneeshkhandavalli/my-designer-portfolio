import { Preload } from '@react-three/drei'
import { Canvas, type CanvasProps } from '@react-three/fiber'
import { Component, Suspense, type ReactNode } from 'react'

const DEFAULT_GL: CanvasProps['gl'] = {
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
}

/**
 * Shared React Three Fiber canvas with portfolio defaults:
 * transparent background (page black shows through), DPR capped at 2,
 * and a Suspense boundary so models/textures can load lazily.
 *
 * If WebGL is unavailable (disabled, blocklisted GPU, context creation failure)
 * three.js throws while creating the renderer; the boundary below renders the
 * consumer's `fallback` instead, so one decorative canvas never takes the page down.
 *
 * Consumers (e.g. the CrystalStar scene) should be lazy-loaded with
 * React.lazy so three.js stays out of the initial bundle.
 */
export function WebGLCanvas({ children, dpr = [1, 2], gl = DEFAULT_GL, fallback, ...props }: CanvasProps) {
  return (
    <WebGLBoundary fallback={fallback ?? null}>
      <Canvas dpr={dpr} gl={gl} fallback={fallback} {...props}>
        <Suspense fallback={null}>
          {children}
          <Preload all />
        </Suspense>
      </Canvas>
    </WebGLBoundary>
  )
}

type BoundaryProps = { fallback: ReactNode; children: ReactNode }

class WebGLBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
