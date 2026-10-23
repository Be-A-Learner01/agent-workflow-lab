import { useState, useRef } from 'react';

function App() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const wsRef = useRef(null);

  const start = () => {
    setLog([]);
    setRunning(true);
    setLog((p) => [...p, '⏳ 正在连接服务器...']);

    // 注意：Vite 默认前端在 5173 端口，后端在 8000 端口
    const ws = new WebSocket('ws://localhost:8000/ws/run');
    wsRef.current = ws;

    ws.onopen = () => {
      setLog((p) => [...p, '✅ 连接成功，正在发送任务...']);
      ws.send(JSON.stringify({ topic: 'AI Agent 趋势' }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'node_done') {
        setLog((p) => [...p, `▶ 节点 [${msg.node}] 执行完成`]);
      }
      if (msg.type === 'done') {
        setLog((p) => [...p, '🎉 全部完成']);
        setRunning(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setLog((p) => [...p, '❌ 连接发生错误']);
      setRunning(false);
    };

    ws.onclose = () => {
      setRunning(false);
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">AI Agent 工作流实时进度</h1>

        <button
          onClick={start}
          disabled={running}
          className={`px-6 py-2 rounded-lg font-medium text-white transition-colors
            ${running ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {running ? '运行中...' : '开始生成'}
        </button>

        <ul className="mt-6 space-y-2">
          {log.map((item, index) => (
            <li key={index} className="p-3 bg-gray-50 border-l-4 border-blue-500 rounded text-gray-700 font-mono text-sm">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;