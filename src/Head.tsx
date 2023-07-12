import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";

interface HeadGLTF extends GLTF {
  materials: { [key: string]: MeshStandardMaterial };
}

interface HeadProps {
  visible: boolean
}

export function Head({ visible }: HeadProps) {
  const gltf = useGLTF("head.glb") as HeadGLTF;
  useMemo(() => {
    const gltfMaterial = Object.values(gltf.materials)[0];
    gltfMaterial.color.set(0x0000ff);
    gltfMaterial.colorWrite = !!visible;
    gltfMaterial.transparent = !!visible;
    gltfMaterial.opacity = 0.5;
  }, [gltf, visible]);
  // Scale head so ears don't appear over the helmet.
  const scale = [0.8, 0.9, 1.0] as const

  return (
    <mesh scale={scale}>
      <primitive object={gltf.scene} />
    </mesh>
  );
}
