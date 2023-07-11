import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Environment, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Matrix4 } from "three";
import "./App.css";
import { useQueryParam } from "./useQueryParam";
import { PresetsType } from "@react-three/drei/helpers/environment-assets";

function Helmet({ model }: { model: string }) {
  const gltf = useGLTF(model);
  return <primitive object={gltf.scene} />;
}

function App() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker>();
  const [faceTransform, setFaceTransform] = useState<Matrix4>();

  const model = useQueryParam("model", "thomas.glb");
  const environment = useQueryParam<PresetsType>("environment", "dawn");

  const goFullscreen = (element: HTMLElement) => {
    element.requestFullscreen();
  };

  useEffect(() => {
    async function init() {
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        ),
        {
          baseOptions: {
            modelAssetPath: "face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputFacialTransformationMatrixes: true,
        }
      );
    }

    init();
  }, []);

  const videoFrameCallback: VideoFrameRequestCallback = (timestamp: number) => {
    const video = webcamRef.current?.video;

    if (!video) return;

    video.requestVideoFrameCallback(videoFrameCallback);

    const faceLandmarker = faceLandmarkerRef.current;
    if (!faceLandmarker) return;

    const results = faceLandmarker.detectForVideo(video, timestamp);
    const transform = results.facialTransformationMatrixes?.[0];

    if (transform) {
      setFaceTransform(new Matrix4().fromArray(transform.data));
    }
  };

  const ready = (video: HTMLVideoElement) => {
    video.requestVideoFrameCallback(videoFrameCallback);
  };

  return (
    <div
      style={{ height: "100vh", width: "100%" }}
      onClick={(e) => goFullscreen(e.currentTarget)}
      ref={containerRef}
    >
      <Webcam
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        ref={webcamRef}
        videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
        onLoadedMetadata={(e) => ready(e.currentTarget)}
      />
      <Canvas camera={{ position: [0, 0, 0], fov: 60 }} ref={canvasRef}>
        <Environment preset={environment} background={false} />
        {faceTransform && (
          <group matrix={faceTransform} matrixAutoUpdate={false}>
            <Helmet model={model} />
          </group>
        )}
        <EffectComposer>
          <Bloom luminanceThreshold={0} luminanceSmoothing={0.7} height={300} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default App;
