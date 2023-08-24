import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Environment, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Matrix4 } from "three";
import { PresetsType } from "@react-three/drei/helpers/environment-assets";
import { useKey } from "react-use";
import "./App.css";
import { useQueryParam } from "./useQueryParam";
import { Head } from "./Head";

interface Module {
  default: string;
}

const supportedEnvironments: PresetsType[] = [
  "sunset",
  "dawn",
  "night",
  "warehouse",
  "forest",
  "apartment",
  "studio",
  "city",
  "park",
  "lobby",
];

const supportedModels = [
  "thomas.glb",
  "guyman.glb",
  "apple_vision_pro_2023.glb",
];

const modules = import.meta.glob<Module>(
  "/node_modules/@pmndrs/assets/hdri/*.exr.js",
  { eager: false }
);

const mod = (n: number, m: number): number => ((n % m) + m) % m;

const previous = (current: string, available: string[]): string =>
  available[mod(available.indexOf(current) - 1, available.length)];

const next = (current: string, available: string[]): string =>
  available[mod(available.indexOf(current) + 1, available.length)];

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
  const showHead = useQueryParam<"true" | "false">("head", "false") === "true";
  const defaultModel = useQueryParam("model", "thomas.glb");
  const defaultEnvironment = useQueryParam<PresetsType>(
    "environment",
    "studio"
  );
  const [model, setModel] = useState<string>(defaultModel);
  const [environment, setEnvironment] =
    useState<PresetsType>(defaultEnvironment);
  const [environmentFiles, setEnvironmentFiles] = useState<Promise<Module>>();
  const lastSeenRef = useRef(0)

  useKey("ArrowRight", () =>
    setEnvironment(
      (environment) => next(environment, supportedEnvironments) as PresetsType
    )
  );
  useKey("ArrowLeft", () =>
    setEnvironment(
      (environment) =>
        previous(environment, supportedEnvironments) as PresetsType
    )
  );
  useKey("ArrowUp", () => setModel((model) => next(model, supportedModels)));
  useKey("ArrowDown", () =>
    setModel((model) => previous(model, supportedModels))
  );

  useEffect(() => {
    async function loadEnvironmentFiles() {
      if (supportedEnvironments.includes(environment)) {
        const data =
          modules[`/node_modules/@pmndrs/assets/hdri/${environment}.exr.js`]();
        setEnvironmentFiles(data);
      }
    }

    loadEnvironmentFiles();
  }, [environment]);

  const switchHelmet = () => {
    setModel((model: string) => model === "thomas.glb" ? "guyman.glb" : "thomas.glb")
    setEnvironment((environment: string) => environment === "studio" ? "apartment" : "studio")
  }

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
      lastSeenRef.current = timestamp
      setFaceTransform(new Matrix4().fromArray(transform.data));
    } else {
      setFaceTransform(undefined)
      if (lastSeenRef.current > 0 && timestamp - lastSeenRef.current > 200) {
        switchHelmet()
        lastSeenRef.current = -1
      }
    }
  };

  const ready = (video: HTMLVideoElement) => {
    video.requestVideoFrameCallback(videoFrameCallback);
  };

  const [deviceId, setDeviceId] = useState({});

  useEffect(() => {
    async function chooseDevice() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(({ kind }) => kind === "videoinput");

      const preferedCamera =
        cameras?.find(({ label }) =>
          label.toLowerCase().includes("facetime")
        ) || cameras[0];

      setDeviceId(preferedCamera.deviceId);
    }

    chooseDevice();
  }, []);

  return (
    <div
      style={{ height: "100vh", width: "100%" }}
      onClick={(e) => goFullscreen(e.currentTarget)}
      ref={containerRef}
    >
      {deviceId && (
        <Webcam
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          ref={webcamRef}
          videoConstraints={{
            deviceId,
            facingMode: "user",
            width: 640,
            height: 480,
          }}
          onLoadedMetadata={(e) => ready(e.currentTarget)}
        />
      )}
      <Canvas camera={{ position: [0, 0, 0], fov: 60 }} ref={canvasRef}>
        {environmentFiles && (
          <Environment files={environmentFiles} background={false} />
        )}
        {faceTransform && (
          <group matrix={faceTransform} matrixAutoUpdate={false}>
            <Head visible={showHead} />
            <Helmet model={model} />
          </group>
        )}
      </Canvas>
    </div>
  );
}

export default App;
