"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Sparkles, Terminal, Activity, Cpu, Eye, Radio, Network } from "lucide-react";

export function RealVisualShowcase() {
  const [activeTab, setActiveTab] = useState<"agents" | "voice" | "vision" | "neural" | "hardware">("agents");

  // Agent visualizer interactive state
  const [agentStep, setAgentStep] = useState(2);
  const [agentOutput, setAgentOutput] = useState("Executing test verification on extracted Python function...");

  // Voice visualizer canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(true);

  // Vision visualizer interactive state
  const [visionConfidence, setVisionConfidence] = useState(99.4);

  // Neural network canvas
  const neuralCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas waveform effect for Voice tab
  useEffect(() => {
    if (activeTab !== "voice") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      for (let w = 0; w < 4; w++) {
        ctx.beginPath();
        ctx.lineWidth = 3 - w * 0.6;
        ctx.strokeStyle = w === 0 ? "#FF5500" : w === 1 ? "#FF3366" : w === 2 ? "#FFAA00" : "#8B5CF6";

        for (let x = 0; x < width; x++) {
          const freq = 0.02 + w * 0.012;
          const amp = (height * 0.35) * (isAudioActive ? Math.sin((x * 0.04) + phase) * 0.8 + 0.25 : 0.04);
          const y = centerY + Math.sin(x * freq + phase + w * 0.8) * amp;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      phase += isAudioActive ? 0.08 : 0.01;
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [activeTab, isAudioActive]);

  // Neural Synaptic Canvas for Neural Tab
  useEffect(() => {
    if (activeTab !== "neural") return;
    const canvas = neuralCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    const width = canvas.width;
    const height = canvas.height;

    // 4 Layers of Neurons
    const layers = [
      [ { y: 0.2 }, { y: 0.4 }, { y: 0.6 }, { y: 0.8 } ],
      [ { y: 0.15 }, { y: 0.35 }, { y: 0.55 }, { y: 0.75 }, { y: 0.9 } ],
      [ { y: 0.2 }, { y: 0.4 }, { y: 0.6 }, { y: 0.8 } ],
      [ { y: 0.35 }, { y: 0.65 } ],
    ];

    let pulse = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw synapses
      for (let l = 0; l < layers.length - 1; l++) {
        const x1 = (l + 1) * (width / (layers.length + 1));
        const x2 = (l + 2) * (width / (layers.length + 1));

        layers[l].forEach((n1, i1) => {
          layers[l + 1].forEach((n2, i2) => {
            const y1 = n1.y * height;
            const y2 = n2.y * height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            const intensity = Math.sin(pulse + i1 * 0.5 + i2 * 0.8) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(255, 85, 0, ${0.1 + intensity * 0.35})`;
            ctx.lineWidth = 1 + intensity * 1.5;
            ctx.stroke();
          });
        });
      }

      // Draw neuron nodes
      layers.forEach((layer, l) => {
        const x = (l + 1) * (width / (layers.length + 1));
        layer.forEach((n, i) => {
          const y = n.y * height;
          const nodePulse = Math.sin(pulse * 2 + l + i) * 0.5 + 0.5;

          ctx.beginPath();
          ctx.arc(x, y, 7 + nodePulse * 3, 0, Math.PI * 2);
          ctx.fillStyle = l === 0 ? "#8B5CF6" : l === layers.length - 1 ? "#FF3366" : "#FF5500";
          ctx.shadowColor = "#FF5500";
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      });

      pulse += 0.04;
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [activeTab]);

  const stepList = [
    { title: "Synthesizing User Goal", time: "110ms", status: "complete" },
    { title: "Querying Multimodal Reasoning Engine", time: "240ms", status: "complete" },
    { title: "Sandboxed Code Execution", time: "380ms", status: agentStep >= 2 ? (agentStep === 2 ? "active" : "complete") : "pending" },
    { title: "Live Unit Benchmark Verification", time: "95ms", status: agentStep >= 3 ? "complete" : "pending" },
  ];

  const handleNextStep = () => {
    if (agentStep < 3) {
      setAgentStep(agentStep + 1);
      setAgentOutput("Benchmark passed with 99.1% precision. Ready for live demo.");
    } else {
      setAgentStep(1);
      setAgentOutput("Re-initializing agent loop with updated multimodal parameters...");
    }
  };

  return (
    <section id="visual-showcase" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5500]/20 to-[#FF3366]/20 border border-[#FF5500]/30 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Tech Sandboxes</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
            See What Students Actually Build
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            Real software, live audio pipelines, neural synapses, and computer vision. Interact with the live simulations below to explore the technical craft.
          </p>
        </div>

        {/* Interactive Showcase Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {[
            { id: "agents", label: "Autonomous Agent Engine", icon: Terminal },
            { id: "neural", label: "Synaptic Neural Network", icon: Network },
            { id: "voice", label: "Real-Time Voice & Waveforms", icon: Radio },
            { id: "vision", label: "Spatial Computer Vision HUD", icon: Eye },
            { id: "hardware", label: "Hardware & Edge Telemetry", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#FF5500] via-[#FF3366] to-[#FFAA00] text-white shadow-xl shadow-[#FF5500]/25 scale-105"
                    : "bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Interactive Sandboxes */}
        <div className="rounded-3xl bg-[#0C0C12] border border-white/15 p-6 sm:p-10 shadow-2xl overflow-hidden relative">
          {/* Top window styling */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-zinc-400 font-medium">
                {activeTab === "agents" && "runtime://autonomous-agent-loop"}
                {activeTab === "neural" && "runtime://synaptic-weights-canvas"}
                {activeTab === "voice" && "runtime://realtime-speech-spectrogram"}
                {activeTab === "vision" && "runtime://spatial-camera-hud"}
                {activeTab === "hardware" && "runtime://edge-microcontroller-deck"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#FF5500] font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
              <span>LIVE DEMO</span>
            </div>
          </div>

          {/* Tab 1: Autonomous Agent Reasoning Visualizer */}
          {activeTab === "agents" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Agent Execution Pipeline
                </div>
                <div className="space-y-3">
                  {stepList.map((st, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                        st.status === "complete"
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : st.status === "active"
                          ? "bg-[#FF5500]/15 border-[#FF5500] text-white shadow-lg shadow-[#FF5500]/10 animate-pulse"
                          : "bg-white/[0.02] border-white/5 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold">0{i + 1}</span>
                        <span className="text-sm font-semibold">{st.title}</span>
                      </div>
                      <div className="font-mono text-xs opacity-75">{st.time}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleNextStep}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3366] text-white font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-lg shadow-[#FF5500]/25 hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Advance Agent Execution</span>
                  </button>
                  <span className="text-xs text-zinc-400">Click to step through loop</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Live Synthetic Code & Execution
                </div>
                <div className="p-6 rounded-2xl bg-black/90 border border-white/10 font-mono text-xs text-zinc-300 space-y-3">
                  <div className="text-zinc-500"># Autonomous Agent Loop:</div>
                  <div className="text-emerald-400">
                    <span className="text-purple-400">async def</span> evaluate_model(prompt: str):
                  </div>
                  <div className="pl-4 text-zinc-300">
                    router = <span className="text-amber-300">ModelRouter</span>(latency_target_ms=50)
                  </div>
                  <div className="pl-4 text-zinc-300">
                    response = <span className="text-purple-400">await</span> router.dispatch(prompt)
                  </div>
                  <div className="pl-4 text-emerald-400">
                    <span className="text-purple-400">return</span> response.verify_accuracy()
                  </div>

                  <div className="pt-3 border-t border-white/10 text-xs text-[#FF5500] font-semibold">
                    &gt; {agentOutput}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Synaptic Neural Network Canvas */}
          {activeTab === "neural" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Deep Neural Network Synaptic Weights
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Animated feedforward architecture with active backpropagation energy pulses.
                  </p>
                </div>
                <div className="font-mono text-xs text-orange-400 bg-orange-950/40 px-3 py-1.5 rounded-lg border border-orange-500/30">
                  4 Hidden Layers • 15 Synapses Firing
                </div>
              </div>

              <div className="h-56 w-full bg-black/80 rounded-2xl border border-white/10 flex items-center justify-center p-4 relative overflow-hidden">
                <canvas ref={neuralCanvasRef} width={800} height={220} className="w-full h-full" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">WEIGHT UPDATES</div>
                  <div className="text-white font-bold">120,000 / sec</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">ACTIVATION</div>
                  <div className="text-[#FF5500] font-bold">GELU Non-Linear</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">LOSS FUNCTION</div>
                  <div className="text-emerald-400 font-bold">Cross-Entropy 0.012</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">INFERENCE DEVICE</div>
                  <div className="text-purple-400 font-bold">Edge TPU / WebGPU</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Real-Time Audio & Waveform Visualizer */}
          {activeTab === "voice" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Sub-100ms Multimodal Speech Stream
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live bidirectional speech spectrogram built using WebRTC & edge inference.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAudioActive(!isAudioActive)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {isAudioActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAudioActive ? "Pause Audio Stream" : "Resume Stream"}</span>
                  </button>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                    38ms Edge Latency
                  </span>
                </div>
              </div>

              <div className="h-44 w-full bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center p-4 relative overflow-hidden">
                <canvas ref={canvasRef} width={800} height={160} className="w-full h-full" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">SAMPLING RATE</div>
                  <div className="text-white font-bold">24kHz PCM</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">SENTIMENT</div>
                  <div className="text-emerald-400 font-bold">Positive (98.4%)</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">INFERENCE ENGINE</div>
                  <div className="text-[#FF5500] font-bold">Gemini 2.5 Flash</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-zinc-500 text-[10px]">PACKET LOSS</div>
                  <div className="text-white font-bold">0.00%</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Spatial Computer Vision HUD */}
          {activeTab === "vision" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Spatial Object Detection & Depth Mesh
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Real-time bounding box tracking and autonomous spatial mapping running at 60 FPS.
                  </p>
                </div>
                <div className="font-mono text-xs text-purple-400 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/30">
                  Model: YOLOv11-Nano (Edge TensorRT)
                </div>
              </div>

              <div className="relative h-64 sm:h-72 rounded-2xl bg-black border border-white/15 overflow-hidden flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

                <div className="absolute top-12 left-16 sm:left-28 w-44 sm:w-56 h-36 border-2 border-[#FF5500] rounded-lg p-2 flex flex-col justify-between shadow-lg shadow-[#FF5500]/20 animate-pulse">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#FF5500] bg-black/80 px-2 py-0.5 rounded">
                    <span>autonomous_rover</span>
                    <span>{visionConfidence}%</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 bg-black/60 px-1 rounded self-start">
                    X: 142.4 Y: 89.1 Z: 2.1m
                  </div>
                </div>

                <div className="absolute bottom-10 right-14 sm:right-24 w-36 sm:w-44 h-28 border-2 border-emerald-400 rounded-lg p-2 flex flex-col justify-between shadow-lg shadow-emerald-500/20">
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 bg-black/80 px-2 py-0.5 rounded">
                    <span>human_attendee</span>
                    <span>98.7%</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 bg-black/60 px-1 rounded self-start">
                    TRACK_ID: #409
                  </div>
                </div>

                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#FF5500]" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-zinc-400 pt-2">
                <span>FPS: 60.0 • LATENCY: 14MS • RESOLUTION: 1920x1080</span>
                <button
                  onClick={() => setVisionConfidence(Number((98 + Math.random() * 1.9).toFixed(1)))}
                  className="text-[#FF5500] hover:underline"
                >
                  Recalibrate Tracking Precision ↺
                </button>
              </div>
            </div>
          )}

          {/* Tab 5: Hardware & Edge Telemetry */}
          {activeTab === "hardware" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Physical Computing & Microcontroller Telemetry
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Real-time GPIO pins, bus telemetry, and sensory feedback loops for hardware hackers.
                  </p>
                </div>
                <div className="font-mono text-xs text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
                  Interface: I2C / UART / SPI
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                  <div className="text-xs font-bold text-zinc-400 font-mono">GPIO PINS STATUS</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pin) => (
                      <div
                        key={pin}
                        className={`p-2 rounded-lg text-center font-mono text-[10px] font-bold ${
                          pin % 2 === 0
                            ? "bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/40"
                            : "bg-white/5 text-zinc-400"
                        }`}
                      >
                        P{pin}: {pin % 2 === 0 ? "HIGH" : "LOW"}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-zinc-400 font-mono">SENSOR VOLTAGE</div>
                  <div className="text-3xl font-black text-white font-mono">3.32 V</div>
                  <div className="text-[10px] text-emerald-400 font-mono">Stable (+/- 0.01V)</div>
                </div>

                <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-zinc-400 font-mono">THERMAL SENSORS</div>
                  <div className="text-3xl font-black text-[#FF5500] font-mono">41.8 °C</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Active fan cooling</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
