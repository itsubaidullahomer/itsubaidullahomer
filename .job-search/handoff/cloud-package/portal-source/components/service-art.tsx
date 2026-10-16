import {
  ArrowRight,
  Check,
  Code2,
  Cpu,
  Mic,
  MousePointer2,
  Sparkles,
} from "lucide-react";

function WindowChrome({ label }: { label: string }) {
  return (
    <div className="mini-chrome">
      <span className="mini-dots">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function ServiceArt({ type }: { type: string }) {
  return (
    <div className={`service-art service-art-${type}`} aria-hidden="true">
      {type === "ai" ? (
        <div className="ai-pipeline">
          <div className="ai-node ai-app">
            <Code2 size={22} />
            <span>Your app</span>
          </div>
          <ArrowRight className="ai-connector" size={14} />
          <div className="ai-node ai-chip">
            <Cpu size={29} />
            <span>AI layer</span>
          </div>
          <ArrowRight className="ai-connector" size={14} />
          <div className="ai-node ai-answer">
            <Check size={20} />
            <span>A useful answer</span>
            <i />
            <i />
          </div>
        </div>
      ) : type === "web" ? (
        <div className="mini-dashboard">
          <WindowChrome label="workspace" />
          <div className="dashboard-body">
            <aside>
              <span />
              <i />
              <i />
              <i />
            </aside>
            <div className="dashboard-main">
              <div className="dashboard-heading">
                <span>Overview</span>
                <i />
              </div>
              <div className="dashboard-chart">
                {[34, 55, 43, 77, 65, 100].map((height, i) => (
                  <i key={i} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
          <span className="mini-status dashboard-status">
            <Check size={10} /> Deployed
          </span>
        </div>
      ) : type === "mobile" ? (
        <div className="service-phones">
          <div className="service-phone phone-back">
            <i className="phone-camera" />
            <div className="phone-cover">
              <Sparkles size={20} />
              <span>Make space.</span>
            </div>
            <div className="phone-row" />
            <div className="phone-row" />
          </div>
          <div className="service-phone phone-front">
            <i className="phone-camera" />
            <div className="phone-greeting">Your everyday.</div>
            <div className="phone-orbit" />
            <div className="phone-row" />
            <div className="phone-tabbar">
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="phone-message">
            <Check size={12} /> Made for your pocket
          </span>
        </div>
      ) : type === "landing" ? (
        <div className="mini-landing">
          <WindowChrome label="your next idea" />
          <div className="landing-orb" />
          <div className="landing-copy">
            Made
            <br />
            to move<span>.</span>
          </div>
          <span className="landing-cta">
            Let’s go <ArrowRight size={10} />
          </span>
          <MousePointer2
            className="landing-cursor"
            size={43}
            strokeWidth={1.4}
          />
        </div>
      ) : type === "voice" ? (
        <div className="mini-voice">
          <div className="voice-heading">
            <span className="voice-light" /> Voice agent <span>LIVE</span>
          </div>
          <div className="voice-bars">
            {[
              14, 24, 18, 35, 49, 28, 41, 58, 38, 22, 47, 32, 54, 37, 24, 43,
              29, 18, 30, 12,
            ].map((height, i) => (
              <i key={i} style={{ height, animationDelay: `${i * 35}ms` }} />
            ))}
          </div>
          <div className="voice-footer">
            <span>Listening, naturally.</span>
            <span className="voice-mic">
              <Mic size={14} />
            </span>
          </div>
        </div>
      ) : (
        <div className="mini-terminal">
          <WindowChrome label="a fresh start" />
          <div className="terminal-code">
            <span className="terminal-old">− it works on my machine</span>
            <span className="terminal-new">+ it works for your customers</span>
            <span className="terminal-prompt">
              ~/next-chapter <i />
            </span>
          </div>
          <span className="mini-status terminal-status">
            <Check size={11} /> Ready to ship
          </span>
        </div>
      )}
    </div>
  );
}
