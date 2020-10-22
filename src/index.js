import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useResource, useThree } from 'react-three-fiber'
import './styles.css'
import Environment from '@react-three/drei/Environment'
import { PerspectiveCamera, Plane, useAspect, useTexture } from '@react-three/drei'
import { refCameraLayer1, refCameraLayer2, savePassBackface, savePassEnv } from './store'
import { BackfaceMaterial } from './backfaceMaterial'
import { RefractionMaterial } from './refractionMaterial'
import usePostprocessing from './use-postprocessing'

extend({ BackfaceMaterial, RefractionMaterial })

const tempObject = new THREE.Object3D()
const NUM = 24

function easeOutQuint(x) {
  return 1 - Math.pow(1 - x, 5)
}

function getRandomPosNeg() {
  return Math.random() * Math.random() > 0.5 ? -1 : 1
}

function Spheres({ material, material2 }) {
  const ref = useRef()
  const ref2 = useRef()
  const ref3 = useRef()
  const params = useMemo(
    () =>
      new Array(NUM).fill().map((_, index) => ({
        scaleFactor: 1.2 * Math.random(),
        timeFactor: 0.3 + 0.2 * Math.random(),
        bias: {
          x: getRandomPosNeg(),
          y: getRandomPosNeg(),
          z: getRandomPosNeg()
        }
      })),
    []
  )

  useFrame((state) => {
    const _time = state.clock.getElapsedTime()
    for (let i = 0; i < NUM; i++) {
      const id = i
      const time = _time * params[id].timeFactor
      const x = Math.cos((2 * Math.PI * id) / NUM + time)
      const z = Math.sin((2 * Math.PI * id) / NUM + time)
      tempObject.position.x = 8 * x + params[id].bias.x
      tempObject.position.z = 6 * z + params[id].bias.z
      tempObject.position.y = -2 * Math.PI + 2 * (((2 * Math.PI * id) / NUM + time + Math.PI / 2) % (2 * Math.PI)) + params[id].bias.y

      const scale = params[id].scaleFactor * easeOutQuint((0.1 + (z + 1)) / 2)
      tempObject.scale.set(scale, scale, scale)
      tempObject.updateMatrix()
      ref.current.setMatrixAt(id, tempObject.matrix)
      if (ref2.current) {
        ref2.current.setMatrixAt(id, tempObject.matrix)
        ref3.current.setMatrixAt(id, tempObject.matrix)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref2.current && ref3.current) {
      ref2.current.instanceMatrix.needsUpdate = true
      ref3.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={ref} args={[null, null, NUM]} material={material}>
        <octahedronBufferGeometry args={[1, 8]}></octahedronBufferGeometry>
      </instancedMesh>
      {material2 && (
        <>
          <instancedMesh ref={ref2} args={[null, null, NUM]} material={material2} layers={2}>
            <octahedronBufferGeometry args={[1, 8]}></octahedronBufferGeometry>
          </instancedMesh>
          <instancedMesh ref={ref3} args={[null, null, NUM]}>
            <octahedronBufferGeometry args={[1.001, 8]}></octahedronBufferGeometry>
            <meshPhysicalMaterial ref={material2} metalness={1} roughness={0} clearcoat={1} color="white" transparent opacity={0.3} />
          </instancedMesh>
        </>
      )}
    </>
  )
}

function Scene() {
  const material1 = useResource()
  const material2 = useResource()
  const material3 = useResource()
  const backface = useResource()
  const refraction = useResource()
  const { size } = useThree()
  const uniforms = useMemo(
    () => ({
      envMap: savePassEnv.current?.renderTarget.texture,
      backfaceMap: savePassBackface.current?.renderTarget.texture,
      resolution: new THREE.Vector2(size.width, size.height)
    }),
    [size, savePassEnv.current, savePassBackface.current]
  )
  return (
    <>
      <meshPhysicalMaterial ref={material1} metalness={1} roughness={0.2} clearcoat={1} color="black" />
      <meshPhysicalMaterial ref={material2} metalness={0.4} roughness={1} color="gold" transparent transmission={0.9} toneMapped={false} />
      <meshPhysicalMaterial ref={material3} metalness={0.2} roughness={0.8} clearcoat={0} color="gray" />
      <refractionMaterial ref={refraction} {...uniforms} transparent />
      <backfaceMaterial ref={backface} side={THREE.BackSide} />
      <Spheres material={material1.current} />
      <Spheres material={material2.current} />
      <Spheres material={material3.current} />
      <Spheres material={refraction.current} material2={backface.current} />
    </>
  )
}

function Title({ layers = 0, ...props }) {
  const group = useRef()
  const [textGeo, setTextGeo] = useState()

  useEffect(() => {
    new THREE.FontLoader().load('/Alata_Regular.json', (font) => {
      const config = { font: font, size: 2.2, height: 0, curveSegments: 8 }
      setTextGeo([
        new THREE.TextGeometry('Not an', config),
        new THREE.TextGeometry('application', config),
        new THREE.TextGeometry('Just a demo', config)
      ])
    })
    if (layers === 1) group.current.lookAt(0, 0, 0)
  }, [layers])

  return (
    <group ref={group} {...props}>
      <mesh layers={layers} geometry={textGeo?.[0]} position={[-4, 2.5, 0]} material-toneMapped={false}></mesh>
      <mesh layers={layers} geometry={textGeo?.[1]} position={[-4, 0, 0]} material-toneMapped={false}></mesh>
      <mesh layers={layers} geometry={textGeo?.[2]} position={[-4, -2.5, 0]} material-toneMapped={false}></mesh>
    </group>
  )
}

function TitleCopies(props) {
  const vertices = useMemo(() => {
    const y = new THREE.IcosahedronGeometry(20, 0)
    return y.vertices
  }, [])

  return (
    <group {...props}>
      {vertices.map((vertex, index) => (
        <Title key={`0${index}`} position={vertex} layers={1} />
      ))}
    </group>
  )
}

function Cameras() {
  useResource(refCameraLayer1)
  useResource(refCameraLayer2)
  usePostprocessing()
  return (
    <>
      <PerspectiveCamera ref={refCameraLayer1} layers={1} position={[0, 0, 15]} near={0.1} far={100}  />
      <PerspectiveCamera ref={refCameraLayer2} layers={2} position={[0, 0, 15]} near={0.1} far={100}  />
    </>
  )
}

function Background() {
  const texture = useTexture('/background.jpg')
  const scale = useAspect('cover', 1024, 512, 2)
  return <Plane position={[0, 0, -20]} scale={scale} material-map={texture} layers={1} />
}

ReactDOM.render(
  <Canvas
    gl={{ powerPreference: 'high-performance' }}
    pixelRatio={[1, 2]}
    camera={{ position: [0, 0, 15], near: 0.1, far: 100 }}
    onCreated={({ gl }) => (gl.setClearColor('black'), (gl.toneMappingExposure = 1.5))}>
    <spotLight position={[50, 30, -50]} intensity={4} />
    <spotLight angle={Math.PI / 4} position={[-30, 10, 30]} intensity={4} color="orange" />
    <spotLight angle={Math.PI / 4} position={[-5, 50, 30]} intensity={4} color="orange" />
    <Cameras />
    <Suspense fallback={null}>
      <Environment files="studio_small_02_1k.hdr" />
      <Background />
    </Suspense>
    <group position={[-3, -1, 0]}>
      <group rotation={[(Math.PI * 2) / 8, Math.PI / 8, (-Math.PI * 1) / 8]} position={[2, 0, 0]}>
        <Scene />
      </group>
      <Title />
      <TitleCopies />
    </group>
  </Canvas>,
  document.getElementById('root')
)
