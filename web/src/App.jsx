import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AnimatedContent from './reactbits/AnimatedContent/AnimatedContent.jsx';
/* The dossier is opened on demand, so its components load on first open and
   stay out of the initial payload. */
const AnimatedList = lazy(() => import('./reactbits/AnimatedList.jsx'));
const BlurText = lazy(() => import('./reactbits/BlurText/BlurText.jsx'));
import BorderGlow from './reactbits/BorderGlow.jsx';
import ClickSpark from './reactbits/ClickSpark/ClickSpark.jsx';
import CountUp from './reactbits/CountUp/CountUp.jsx';
import DecryptedText from './reactbits/DecryptedText/DecryptedText.jsx';
import DotGrid from './reactbits/DotGrid.jsx';
import ElasticSlider from './reactbits/ElasticSlider.jsx';
import ElectricBorder from './reactbits/ElectricBorder.jsx';
import GlareHover from './reactbits/GlareHover.jsx';
import GradientText from './reactbits/GradientText.jsx';
const Lightning = lazy(() => import('./reactbits/Lightning.jsx'));
const LineSidebar = lazy(() => import('./reactbits/LineSidebar.jsx'));
import Magnet from './reactbits/Magnet/Magnet.jsx';
import Noise from './reactbits/Noise.jsx';
const PixelCard = lazy(() => import('./reactbits/PixelCard.jsx'));
import RotatingText from './reactbits/RotatingText.jsx';
import ShinyText from './reactbits/ShinyText.jsx';
import SplitFlapText from './reactbits/SplitFlapText.jsx';
import SplitText from './reactbits/SplitText/SplitText.jsx';
import SpotlightCard from './reactbits/SpotlightCard.jsx';
import StarBorder from './reactbits/StarBorder.jsx';
import TextType from './reactbits/TextType.jsx';
const TiltedCard = lazy(() => import('./reactbits/TiltedCard.jsx'));

/* Warm the dossier chunks when a pointer or the keyboard reaches the toggle. */
let warmed = false;
function warmDossier() {
  if (warmed) return;
  warmed = true;
  import('./reactbits/AnimatedList.jsx');
  import('./reactbits/BlurText/BlurText.jsx');
  import('./reactbits/Lightning.jsx');
  import('./reactbits/LineSidebar.jsx');
  import('./reactbits/PixelCard.jsx');
  import('./reactbits/TiltedCard.jsx');
}

const SECTIONS = ['Bodies', 'Signal', 'About'];

const ORDER = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const AMBER = '#f0b429';

function swatch(color) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
    '<defs><radialGradient id="g" cx="34%" cy="28%" r="80%">' +
    `<stop offset="0%" stop-color="${color}" stop-opacity="1"/>` +
    `<stop offset="55%" stop-color="${color}" stop-opacity="0.5"/>` +
    '<stop offset="100%" stop-color="#05070b" stop-opacity="1"/>' +
    '</radialGradient></defs>' +
    '<rect width="200" height="200" fill="#05070b"/>' +
    '<circle cx="100" cy="100" r="64" fill="url(#g)"/>' +
    '</svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function speedFromSlider(value) {
  return 0.1 * Math.pow(80, value / 100);
}

function sliderFromSpeed(speed) {
  return (Math.log(speed / 0.1) / Math.log(80)) * 100;
}

function formatSpeed(speed) {
  return (speed < 1 ? speed.toFixed(2) : speed.toFixed(1)) + '\u00d7';
}

function FactValue({ value }) {
  const match = String(value).match(/^([\d.,]+)\s*(.*)$/);
  const numeric = match ? Number(match[1].replace(/,/g, '')) : NaN;

  if (!match || !Number.isFinite(numeric)) return <span className="fact-value">{value}</span>;

  const hadComma = match[1].includes(',');
  const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;

  return (
    <span className="fact-value">
      <CountUp
        to={numeric}
        decimals={decimals}
        separator={hadComma ? ',' : ''}
        duration={0.9}
        className="fact-number"
      />
      {match[2] ? <span className="fact-unit"> {match[2]}</span> : null}
    </span>
  );
}

/* Keep Tab inside the dossier while it covers the scene. */
function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const items = [...event.currentTarget.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* LineSidebar renders list items. Give them button semantics once the lazy
   chunk has rendered, and keep aria-current in step with the section. */
function NavA11y({ section }) {
  useEffect(() => {
    const items = document.querySelectorAll('.drawer-nav .line-sidebar__item');
    items.forEach((item, index) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', SECTIONS[index]);
      if (SECTIONS[index] === section) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }, [section]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const item = event.target instanceof Element ? event.target.closest('.line-sidebar__item') : null;
      if (!item) return;
      event.preventDefault();
      item.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return null;
}

export default function App() {
  const [scene, setScene] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [slider, setSlider] = useState(53);
  const [drawer, setDrawer] = useState(false);
  const [section, setSection] = useState(SECTIONS[0]);
  const [bootGone, setBootGone] = useState(false);
  const [bootFading, setBootFading] = useState(false);
  const toggleRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    import('./scene/orrery.js').then((module) => {
      if (cancelled) return;
      module.start();
      setScene(module);
      setSnapshot(module.getSnapshot());
      unsubscribe = module.subscribe(setSnapshot);
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const ready = Boolean(snapshot && snapshot.ready);

  useEffect(() => {
    if (!ready) return undefined;
    const fade = window.setTimeout(() => setBootFading(true), 200);
    const remove = window.setTimeout(() => setBootGone(true), 900);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(remove);
    };
  }, [ready]);

  useEffect(() => {
    if (!drawer && wasOpen.current) toggleRef.current?.focus({ preventScroll: true });
    wasOpen.current = drawer;
  }, [drawer]);

  const focus = snapshot?.focus ?? null;
  const bodies = useMemo(() => {
    const list = snapshot?.bodies ?? [];
    return [...list].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  }, [snapshot?.bodies]);
  const paused = Boolean(snapshot?.paused);
  const speed = snapshot?.speed ?? 1;

  const focusBody = useCallback((id) => {
    if (scene) {
      scene.focusBody(id);
      setSlider(sliderFromSpeed(scene.getSnapshot().speed));
    }
  }, [scene]);

  useEffect(() => {
    if (!scene) return undefined;

    const onKey = (event) => {
      const target = event.target;
      if (target instanceof Element) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (event.code === 'Space' && target.closest('button')) return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        scene.togglePaused();
        return;
      }
      if (event.key === 'Escape') {
        if (drawer) {
          setDrawer(false);
          return;
        }
        scene.overview();
        return;
      }
      if (event.key === 'd' || event.key === 'D') {
        setDrawer((open) => !open);
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 0 && digit <= 9) {
        const body = bodies[digit];
        if (body) scene.focusBody(body.id);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene, bodies, drawer]);

  const onSpeed = (value) => {
    setSlider(value);
    if (scene) scene.setSpeed(speedFromSlider(value));
  };

  const listItems = useMemo(() => bodies.map((body) => ({
    id: body.id,
    icon: <span className="list-dot" style={{ background: body.color }} />,
    title: body.name,
    description: body.kind,
    meta: body.facts[0] ? body.facts[0][1] : '',
  })), [bodies]);

  const status = paused ? 'Simulation paused' : 'Simulation running';

  return (
    <>
      <canvas id="viewport" aria-label="Solar system, rendered in three dimensions" />
      <div className="labels" id="labels" role="group" aria-label="Bodies in the scene" />

      <ClickSpark
        className="app"
        style={{ position: 'fixed', inset: 0 }}
        sparkColor={AMBER}
        sparkSize={11}
        sparkRadius={28}
        sparkCount={10}
        duration={520}
        shape="star"
        glow={0.55}
      >
        <header className="masthead">
          <GradientText
            colors={[AMBER, '#efe6cf', AMBER]}
            animationSpeed={7}
            className="eyebrow"
          >
            Interactive orrery
          </GradientText>
          <SplitText
            text="Solar System"
            tag="h1"
            className="masthead-title"
            splitType="chars"
            delay={26}
            duration={0.9}
            trigger="mount"
            textAlign="left"
            effect="rise"
          />
          <div className="masthead-meta">
            <ShinyText text="Procedural · zero image files" speed={3} className="meta-line" />
            <span className="meta-line dim">{status}</span>
          </div>
        </header>

        {focus ? (
          <aside className="inspector" aria-live="polite">
            <BorderGlow
              glowColor="240 180 41"
              backgroundColor="transparent"
              borderRadius={16}
              glowRadius={34}
              glowIntensity={0.55}
              edgeSensitivity={26}
            >
              <SpotlightCard
                className="panel"
                spotlightColor="rgba(240, 180, 41, 0.16)"
                spotlightSize={280}
                intensity={0.18}
                borderGlow={0.5}
              >
                <AnimatedContent
                  key={focus.id}
                  trigger="mount"
                  direction="vertical"
                  distance={16}
                  duration={0.55}
                  ease="power2.out"
                  initialOpacity={0}
                >
                  <div className="panel-head">
                    <span className="panel-kind">
                      {focus.kind}{snapshot.following ? ' · following' : ''}
                    </span>
                    <span className="panel-index">{String(bodies.findIndex((b) => b.id === focus.id)).padStart(2, '0')}</span>
                  </div>
                  <h2 className="panel-name">{focus.name}</h2>
                  <dl className="facts">
                    {focus.facts.map(([label, value]) => (
                      <div className="fact" key={label}>
                        <dt>{label}</dt>
                        <dd><FactValue value={value} /></dd>
                      </div>
                    ))}
                  </dl>
                  <DecryptedText
                    text={focus.fact}
                    animateOn="view"
                    speed={26}
                    maxIterations={18}
                    sequential
                    revealDirection="start"
                    parentClassName="panel-fact"
                    className="panel-fact-char"
                    encryptedClassName="panel-fact-encrypted"
                  />
                </AnimatedContent>
              </SpotlightCard>
            </BorderGlow>
          </aside>
        ) : null}

        <nav className="rail" aria-label="Bodies">
          {bodies.map((body) => {
            const active = focus && focus.id === body.id;
            return (
              <GlareHover
                key={body.id}
                className={'rail-item' + (active ? ' is-active' : '')}
                width="auto"
                height="auto"
                background="transparent"
                borderColor="transparent"
                borderRadius="6px"
                glareColor={body.color}
                glareOpacity={0.22}
                glareSize={40}
                transitionDuration={600}
              >
                <button
                  type="button"
                  className="rail-button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => focusBody(body.id)}
                >
                  <span className="rail-dot" style={{ '--dot': body.color }} />
                  <span className="rail-name">{body.name}</span>
                </button>
              </GlareHover>
            );
          })}
        </nav>

        <div className="transport">
          <ElectricBorder
            color={AMBER}
            borderRadius={999}
            thickness={1.2}
            glow={0.45}
            speed={0.6}
            chaos={0.35}
            active={paused}
            className="transport-play"
          >
            <Magnet padding={36} magnetStrength={2.4} wrapperClassName="play-magnet">
              <button
                type="button"
                className="play-button"
                data-state={paused ? 'paused' : 'playing'}
                onClick={() => scene && scene.togglePaused()}
                title={paused ? 'Play (Space)' : 'Pause (Space)'}
              >
                <span className="play-glyph" aria-hidden="true" />
                {paused ? 'Play' : 'Pause'}
              </button>
            </Magnet>
          </ElectricBorder>

          <div className="speed">
            <ElasticSlider
              value={slider}
              startingValue={0}
              maxValue={100}
              onChange={onSpeed}
              leftIcon={<span className="speed-icon">−</span>}
              rightIcon={<span className="speed-icon">+</span>}
              className="speed-slider"
            />
            <span className="speed-readout">{formatSpeed(speed)}</span>
          </div>

          <SplitFlapText
            words={['RUNNING', 'PAUSED']}
            text={paused ? 'PAUSED' : 'RUNNING'}
            fontSize={11}
            tileColor="#12151c"
            textColor={paused ? AMBER : '#ece9e2'}
            gap={2}
            padTo={7}
            loop={false}
            className="state-board"
          />

          <StarBorder
            as="button"
            type="button"
            className="overview-button"
            onClick={() => scene && scene.overview()}
            color={AMBER}
            backgroundColor="#0b0e14"
            textColor="#ece9e2"
            borderColor="rgba(240, 180, 41, 0.3)"
            thickness={1}
            radius={8}
            speed={5}
            glow={0.4}
            stars={0}
          >
            Overview
          </StarBorder>

          <button
            type="button"
            className="drawer-toggle"
            ref={toggleRef}
            aria-expanded={drawer}
            aria-controls="dossier"
            onPointerEnter={warmDossier}
            onFocus={warmDossier}
            onClick={() => setDrawer((open) => !open)}
          >
            Dossier
            <span className="drawer-key">D</span>
          </button>
        </div>
      </ClickSpark>

      <Suspense fallback={null}>
      {drawer ? (
        <div
          className="drawer"
          id="dossier"
          role="dialog"
          aria-modal="true"
          aria-label="Dossier"
          onKeyDown={trapFocus}
        >
          <div className="drawer-head">
            <span className="drawer-title">Dossier</span>
            <button type="button" className="drawer-close" autoFocus onClick={() => setDrawer(false)}>
              Close
            </button>
          </div>

          <div className="drawer-body">
            <LineSidebar
              items={SECTIONS}
              defaultActive={SECTIONS.indexOf(section)}
              onItemClick={(index) => setSection(SECTIONS[index])}
              accentColor={AMBER}
              textColor="#b6b1a6"
              markerColor="#5f5d55"
              showIndex={false}
              markerLength={40}
              maxShift={10}
              itemGap={18}
              fontSize={0.82}
              className="drawer-nav"
            />
            <NavA11y section={section} />

            <div className="drawer-panel">
              {section === 'Bodies' && focus ? (
                <>
                  <TiltedCard
                    imageSrc={swatch(focus.color)}
                    altText={focus.name}
                    captionText={focus.name}
                    containerWidth="100%"
                    containerHeight="190px"
                    imageWidth="190px"
                    imageHeight="190px"
                    showTooltip={false}
                    flipOnClick={false}
                    rotateAmplitude={9}
                    scaleOnHover={1.04}
                  />
                  <BlurText
                    text={focus.fact}
                    animateBy="words"
                    direction="top"
                    delay={26}
                    className="drawer-fact"
                  />
                  <AnimatedList
                    items={listItems}
                    onItemSelect={(item) => focusBody(item.id)}
                    theme="dark"
                    accentColor={AMBER}
                    frame={false}
                    animation="pop"
                    maxHeight={420}
                  />
                </>
              ) : null}

              {section === 'Signal' ? (
                <div className="signal">
                  <div className="signal-glitch">
                    <Lightning
                      color={AMBER}
                      bolts={2}
                      branches={0.35}
                      spread={0.8}
                      thickness={1}
                      glow={0.85}
                      intensity={0.7}
                      speed={0.6}
                      flicker={0.4}
                      mouseInteraction={false}
                      className="signal-bolt"
                    />
                    <span className="signal-label">PROCEDURAL GEOMETRY</span>
                  </div>
                  <dl className="facts signal-facts">
                    {(focus?.facts ?? []).map(([label, value]) => (
                      <div className="fact" key={label}>
                        <dt>{label}</dt>
                        <dd><FactValue value={value} /></dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {section === 'About' ? (
                <PixelCard
                  className="about-card"
                  colors="#f0b429,#2b3038,#6f6a5d"
                  gap={7}
                  speed={28}
                  opacity={0.45}
                  glow={0.3}
                  trigger="hover"
                  theme="dark"
                  radius={12}
                >
                  <h3 className="about-title">How this is made</h3>
                  <p className="about-copy">
                    Every surface is painted at runtime on a canvas: value noise, ridged
                    turbulence, banded gas giants and a starfield of ten thousand points.
                    Nothing is downloaded but the 3D engine itself.
                  </p>
                  <p className="about-copy">
                    Drag to orbit, scroll to zoom, click a world to frame it. Space pauses
                    the simulation, Escape returns to the full system, digits jump between
                    bodies.
                  </p>
                </PixelCard>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      </Suspense>

      {!bootGone ? (
        <div
          className={'boot' + (bootFading ? ' is-hidden' : '')}
          role="status"
          aria-live="polite"
        >
          <DotGrid
            className="boot-grid"
            dotSize={2}
            gap={24}
            baseColor="#2b2f38"
            activeColor={AMBER}
            proximity={180}
            shockRadius={260}
            opacity={0.8}
          />
          <div className="boot-inner">
            <span className="boot-kicker">Solar System</span>
            <TextType
              text="Drawing surfaces"
              typingSpeed={42}
              initialDelay={200}
              pauseDuration={2400}
              loop={false}
              showCursor
              cursorCharacter="▌"
              className="boot-line"
            />
            <RotatingText
              texts={['Eight planets', 'One moon', 'No image files']}
              auto
              rotationInterval={2200}
              splitBy="characters"
              mainClassName="boot-rotate"
              style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}
            />
            {snapshot && snapshot.error ? (
              <p className="boot-error">{snapshot.error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Noise opacity={0.035} blendMode="overlay" size={1} fixed zIndex={4} />
    </>
  );
}
