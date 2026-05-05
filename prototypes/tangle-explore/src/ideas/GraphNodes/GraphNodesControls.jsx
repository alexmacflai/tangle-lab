import React, { useEffect, useRef, useState } from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import { GROUP_BY_OPTIONS } from './graphNodesConfig';
import styles from './GraphNodesControls.module.css';

export default function GraphNodesControls() {
  const graphNodes = useExploreStore((state) => state.graphNodes);
  const setGraphNodes = useExploreStore((state) => state.setGraphNodes);
  const triggerGraphNodesResetView = useExploreStore((state) => state.triggerGraphNodesResetView);
  const triggerGraphNodesExpandAll = useExploreStore((state) => state.triggerGraphNodesExpandAll);
  const densityProgress = `${graphNodes.mapDensity}%`;
  const labelsThresholdProgress = `${graphNodes.labelsThreshold}%`;
  const pulseTimerRef = useRef(null);
  const [activePulse, setActivePulse] = useState(null);

  useEffect(
    () => () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current);
      }
    },
    []
  );

  const queuePulseFeedback = (pulseName) => {
    setActivePulse(pulseName);
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setTimeout(() => {
      setActivePulse(null);
      pulseTimerRef.current = null;
    }, 360);
  };

  const snapToMidpoint = (value) => (Math.abs(value - 50) <= 3 ? 50 : value);
  const handleMapDensityChange = (event) => {
    const rawValue = Number(event.target.value);
    const nextValue = snapToMidpoint(rawValue);
    setGraphNodes({ mapDensity: nextValue });
  };
  const handleLabelsThresholdChange = (event) => {
    const rawValue = Number(event.target.value);
    const nextValue = snapToMidpoint(rawValue);
    setGraphNodes({ labelsThreshold: nextValue });
  };
  const triggerControlPulse = (pulseName) => {
    if (pulseName === 'collapse') {
      setGraphNodes({ collapseAllClusters: true });
    } else if (pulseName === 'expand') {
      setGraphNodes({ collapseAllClusters: false });
      triggerGraphNodesExpandAll();
    } else {
      triggerGraphNodesResetView();
    }
    queuePulseFeedback(pulseName);
  };

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <div className={styles.label}>Group By</div>
        <div className={styles.wordRow}>
          {GROUP_BY_OPTIONS.map((option) => {
            const isActive = graphNodes.groupBy === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={[styles.wordButton, isActive ? styles.activeWordButton : ''].join(' ').trim()}
                onClick={() => setGraphNodes({ groupBy: option.value })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>Map Density</div>
        <div className={styles.densityRow}>
          <span className={[styles.densityIcon, styles.sparseIcon].join(' ').trim()} aria-hidden />
          <div className={styles.densitySliderWrap}>
            <input
              className={styles.densitySlider}
              type="range"
              min="0"
              max="100"
              step="1"
              value={graphNodes.mapDensity}
              style={{ '--slider-progress': densityProgress }}
              onChange={handleMapDensityChange}
            />
          </div>
          <span className={[styles.densityIcon, styles.denseIcon].join(' ').trim()} aria-hidden />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>Labels Threshold</div>
        <div className={styles.densityRow}>
          <span className={styles.labelScaleLow} aria-hidden>A</span>
          <div className={styles.densitySliderWrap}>
            <input
              className={styles.densitySlider}
              type="range"
              min="0"
              max="100"
              step="1"
              value={graphNodes.labelsThreshold}
              style={{ '--slider-progress': labelsThresholdProgress }}
              onChange={handleLabelsThresholdChange}
            />
          </div>
          <span className={styles.labelScaleHigh} aria-hidden>Aa</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.label}>Controls</div>
        <div className={styles.pulseRow}>
          {[
            { id: 'collapse', label: 'Collapse' },
            { id: 'expand', label: 'Expand' },
            { id: 'reset', label: 'Reset View' }
          ].map((control) => (
            <button
              key={control.id}
              type="button"
              className={[styles.pulseButton, activePulse === control.id ? styles.activePulseButton : ''].join(' ').trim()}
              onClick={() => triggerControlPulse(control.id)}
            >
              <span>{control.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
