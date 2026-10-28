import { useState } from 'react';
import {
  ReactFlow, Background, Controls, useNodesState, useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'write', position: { x: 150, y: 50 }, data: { label: '✍️ 写稿' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'review', position: { x: 150, y: 200 }, data: { label: '🔍 审核' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
  { id: 'end', position: { x: 400, y: 350 }, data: { label: '🏁 结束' }, style: { padding: '10px 20px', borderRadius: '8px', border: '2px solid #d1d5db', background: '#fff' } },
];

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
  style: { strokeWidth: 2 }
};

const initialEdges = [
  { id: 'e-write-review', source: 'write', target: 'review', label: '初稿', ...defaultEdgeOptions },
  { id: 'e-review-write', source: 'review', target: 'write', label: '打回重写', ...defaultEdgeOptions, style: { ...defaultEdgeOptions.style, stroke: '#d1d5db' } },
  { id: 'e-review-end', source: 'review', target: 'end', label: '通过/超限', ...defaultEdgeOptions, style: { ...defaultEdgeOptions.style, stroke: '#d1d5db' } },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [running, setRunning] = useState(false);

  // 直接写普通函数，避免 Hooks 依赖地狱
  const resetGraph = () => {
    setNodes((nds) => nds.map(n => ({ ...n, style: { ...n.style, border: '2px solid #d1d5db', background: '#fff', fontWeight: 'normal' } })));
    setEdges((eds) => eds.map(e => ({ ...e, style: { ...e.style, stroke: '#d1d5db', strokeWidth: 2 }, animated: false })));
  };

  const setNodeStatus = (nodeId, status) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        if (status === 'running') return { ...node, style: { ...node.style, border: '3px solid #3b82f6', background: '#eff6ff', fontWeight: 'bold' } };
        if (status === 'done') return { ...node, style: { ...node.style, border: '3px solid #10b981', background: '#ecfdf5', fontWeight: 'normal' } };
      }
      return node;
    }));
  };

  const highlightEdge = (source, target) => {
    const edgeId = `e-${source}-${target}`;
    setEdges((eds) => eds.map((e) => {
      if (e.id === edgeId) {
        const color = target === 'write' ? '#f59e0b' : '#3b82f6';
        return { ...e, animated: true, style: { ...e.style, stroke: color, strokeWidth: 3 } };
      }
      return e;
    }));
  };

  const startWorkflow = () => {
    setRunning(true);
    resetGraph();

    const ws = new WebSocket('ws://localhost:8000/ws/run');
    let lastNode = null;

    ws.onopen = () => ws.send(JSON.stringify({ topic: 'AI Agent 趋势' }));

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === 'node_start') {
        setNodeStatus(msg.node, 'running');
        if (lastNode) highlightEdge(lastNode, msg.node);
        lastNode = msg.node;
      }

      if (msg.type === 'node_done') {
        setNodeStatus(msg.node, 'done');
      }

      if (msg.type === 'done') {
        setNodeStatus('end', 'done');
        if (lastNode) highlightEdge(lastNode, 'end');
        setRunning(false);
        ws.close();
      }
    };

    ws.onerror = () => setRunning(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0 }}>
      <div style={{ width: '300px', padding: '20px', borderRight: '1px solid #eee', zIndex: 10, background: '#fff', boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginTop: 0 }}>工作流控制台</h2>
        <button onClick={startWorkflow} disabled={running}
          style={{ padding: '12px', width: '100%', background: running ? '#9ca3af' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: running ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          {running ? '运行中...' : '▶ 开始生成'}
        </button>

        <div style={{ marginTop: '30px', fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
          <p><strong>图例：</strong></p>
          <p><span style={{ color: '#3b82f6' }}>■</span> 蓝色：节点正在执行</p>
          <p><span style={{ color: '#10b981' }}>■</span> 绿色：节点执行完成</p>
        </div>
      </div>

      <div style={{ flex: 1, height: '100%' }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}