"use client";
import { useState, useRef, useEffect } from "react";
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stepData, setStepData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // 初始化相机
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // 初始化渲染器
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    rendererRef.current = renderer;

    // 添加轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 清理函数
    return () => {
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  const handleRun = async () => {
    try {
      setLoading(true);
      setError("");
      setStepData(null);

      const response = await fetch('/api/text-to-cad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await response.json();

      if (data.success) {
        setStepData(data.result);
        // 清除现有模型
        if (sceneRef.current) {
          while(sceneRef.current.children.length > 0){ 
            sceneRef.current.remove(sceneRef.current.children[0]); 
          }
        }

        // 将 STEP 文件转换为 STL 格式（这里需要后端支持）
        const stlResponse = await fetch('/api/convert-to-stl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stepData: data.result }),
        });

        const stlData = await stlResponse.json();
        
        if (stlData.success) {
          // 加载 STL 模型
          const loader = new STLLoader();
          const geometry = loader.parse(stlData.stlData);
          const material = new THREE.MeshBasicMaterial({ 
            color: 0x156289,  // STEP蓝色
            transparent: true,
            opacity: 0.3,     // 降低不透明度，增加透明度
            side: THREE.DoubleSide,
            depthWrite: true
          });
          const mesh = new THREE.Mesh(geometry, material);

          // 居中模型
          geometry.computeBoundingBox();
          const center = new THREE.Vector3();
          geometry.boundingBox?.getCenter(center);
          mesh.position.sub(center);

          // 调整模型大小
          const size = new THREE.Vector3();
          geometry.boundingBox?.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          mesh.scale.multiplyScalar(scale);

          sceneRef.current?.add(mesh);
        } else {
          setError(stlData.error || '模型转换失败');
        }
      } else {
        setError(data.error || '处理失败');
      }
    } catch (err) {
      setError('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadStep = () => {
    if (!stepData) return;
    
    // 创建Blob对象
    const blob = new Blob([stepData], { type: 'application/step' });
    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.step';  // 设置下载文件名
    document.body.appendChild(a);
    a.click();
    // 清理
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-4">
        <textarea
          className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入3D模型描述..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        
        <div className="flex gap-4">
          <button
            className={`flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
            onClick={handleRun}
            disabled={loading}
          >
            {loading ? '处理中...' : '运行'}
          </button>

          <button
            className={`py-2 px-4 bg-green-500 text-white rounded-lg transition-colors ${
              !stepData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
            onClick={handleDownloadStep}
            disabled={!stepData}
          >
            下载STEP文件
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="w-full h-[500px] border border-gray-300 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
