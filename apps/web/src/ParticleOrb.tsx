import { useEffect, useRef, useState } from 'react';
import type { createParticleScene } from './particleScene';

export function ParticleOrb({ ready }: { ready: boolean }) {
  const surface = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createParticleScene> | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [drawing, setDrawing] = useState(false);
  const state = useRef({ ready, paused });

  useEffect(() => {
    state.current = { ready, paused };
    scene.current?.update(state.current);
  }, [ready, paused]);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const host = surface.current;
    if (!host || reduced) return;
    let disposed = false;
    void import('./particleScene').then(({ createParticleScene }) => {
      if (disposed) return;
      scene.current = createParticleScene(host, state.current, setDrawing);
    }).catch(() => {
      // The static particles and status text also work without WebGL.
      if (!disposed) setDrawing(false);
    });
    return () => {
      disposed = true;
      scene.current?.dispose();
      scene.current = null;
      setDrawing(false);
    };
  }, [reduced]);

  return <div className="processing-orb">
    <div ref={surface} className={ready ? 'particle-orb is-ready' : 'particle-orb'} data-rendering={drawing && !reduced} aria-hidden="true" />
    {drawing && !reduced && <button className="quiet" type="button" onClick={() => setPaused(value => !value)}>
      {paused ? 'Resume animation' : 'Pause animation'}
    </button>}
  </div>;
}
