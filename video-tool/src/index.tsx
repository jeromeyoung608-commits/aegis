import {
  AbsoluteFill, Img, Sequence, Audio, staticFile,
  useCurrentFrame, interpolate, registerRoot, Composition,
} from 'remotion';
import manifest from '../assets/manifest.json';

const FPS = 30;
const INTRO = 90;   // 3s
const OUTRO = 120;  // 4s
const STEPS = manifest as Array<{ file: string; title: string; caption: string; dur: number }>;

const totalFrames =
  INTRO + STEPS.reduce((a, s) => a + s.dur, 0) * FPS + OUTRO;

const titleStyle: React.CSSProperties = {
  fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: 46, fontWeight: 800, color: '#e8f0ff',
  textShadow: '0 2px 18px rgba(0,0,0,0.7)', letterSpacing: 1,
  padding: '14px 22px', borderRadius: 14,
  background: 'linear-gradient(90deg, rgba(56,189,248,0.18), rgba(56,189,248,0))',
  borderLeft: '4px solid #38bdf8',
};

const captionStyle: React.CSSProperties = {
  fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: 26, lineHeight: 1.55, color: '#dbe6f5',
  maxWidth: '78%', padding: '18px 24px', borderRadius: 16,
  background: 'rgba(8,14,24,0.72)', border: '1px solid rgba(120,160,255,0.25)',
  backdropFilter: 'blur(4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
};

function Step({ step, index }: { step: typeof STEPS[number]; index: number }) {
  const frame = useCurrentFrame();
  const dur = step.dur * FPS;
  const p = frame / dur;
  const scale = 1.05 + 0.06 * p;
  const tx = (p - 0.5) * 36;
  const ty = (p - 0.5) * 14;
  const opacity = interpolate(frame, [0, 10, dur - 10, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const audio = staticFile('audio/' + String(index + 1).padStart(2, '0') + '.mp3');
  return (
    <AbsoluteFill style={{ backgroundColor: '#060910', opacity }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${tx}px, ${ty}px)` }}>
        <Img src={staticFile('steps/' + step.file)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 40 }}>
        <div style={titleStyle}>{step.title}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: 40 }}>
        <div style={captionStyle}>{step.caption}</div>
      </AbsoluteFill>
      <Audio src={audio} />
    </AbsoluteFill>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [0, 25], [0.8, 1], { extrapolateRight: 'clamp' });
  const o = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#070b14', justifyContent: 'center', alignItems: 'center', opacity: o }}>
      <div style={{ transform: `scale(${s})`, textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: '#eaf2ff', letterSpacing: 4,
          textShadow: '0 0 40px rgba(56,189,248,0.5)' }}>AEGIS</div>
        <div style={{ fontSize: 30, color: '#8fb6e8', marginTop: 14, letterSpacing: 6 }}>零信任隐私工作流 · 七步闭环</div>
        <div style={{ fontSize: 20, color: '#6b86a8', marginTop: 28 }}>
          每一步的“产出物”实景演示
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#070b14', justifyContent: 'center', alignItems: 'center', opacity: o }}>
      <div style={{ textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 54, fontWeight: 800, color: '#eaf2ff' }}>闭环完成</div>
        <div style={{ fontSize: 26, color: '#8fb6e8', marginTop: 16 }}>
          拓扑 → 脱敏 → 签名 → 点对点 → 验签 → 归档 → 审计
        </div>
        <div style={{ fontSize: 24, color: '#36d399', marginTop: 22, fontWeight: 700 }}>
          全程零上传 · 文档 / 密钥 / 口令 均不出浏览器
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const AegisFlow: React.FC = () => {
  let start = INTRO;
  const seqs = STEPS.map((s, i) => {
    const durF = s.dur * FPS;
    const from = start;
    start += durF;
    return (
      <Sequence key={i} from={from} durationInFrames={durF}>
        <Step step={s} index={i} />
      </Sequence>
    );
  });
  return (
    <AbsoluteFill style={{ backgroundColor: '#060910' }}>
      <Sequence from={0} durationInFrames={INTRO}><Intro /></Sequence>
      {seqs}
      <Sequence from={start} durationInFrames={OUTRO}><Outro /></Sequence>
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition
    id="AegisFlow"
    component={AegisFlow}
    durationInFrames={totalFrames}
    fps={FPS}
    width={1600}
    height={900}
  />
));
