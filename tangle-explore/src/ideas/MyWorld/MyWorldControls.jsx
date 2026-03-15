import React from 'react';
import { useExploreStore } from '../../store/useExploreStore';
import { AXIS_OPTIONS, COLOR_OPTIONS, ELEVATION_OPTIONS, RENDER_MODE_OPTIONS } from './myWorldConfig';
import styles from './MyWorld.module.css';

function SelectGroup({ label, value, options, onChange }) {
  return (
    <label className={styles.controlsGroup}>
      <span className={styles.controlsLabel}>{label}</span>
      <select className={styles.controlsSelect} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SliderGroup({ label, value, min, max, step, onChange, suffix = '' }) {
  return (
    <label className={styles.controlsGroup}>
      <span className={styles.controlsLabel}>{label}</span>
      <div className={styles.sliderRow}>
        <input
          className={styles.controlsSlider}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className={styles.sliderValue}>
          {value}
          {suffix}
        </span>
      </div>
    </label>
  );
}

export default function MyWorldControls() {
  const myWorld = useExploreStore((state) => state.myWorld);
  const setMyWorld = useExploreStore((state) => state.setMyWorld);

  return (
    <div className={styles.controlsRoot}>
      <SelectGroup
        label="Render"
        value={myWorld.renderMode}
        options={RENDER_MODE_OPTIONS}
        onChange={(value) => setMyWorld({ renderMode: value })}
      />
      <SelectGroup
        label="X Axis"
        value={myWorld.xAxis}
        options={AXIS_OPTIONS}
        onChange={(value) => setMyWorld({ xAxis: value })}
      />
      <SelectGroup
        label="Y Axis"
        value={myWorld.yAxis}
        options={AXIS_OPTIONS}
        onChange={(value) => setMyWorld({ yAxis: value })}
      />
      <SelectGroup
        label="Height"
        value={myWorld.elevation}
        options={ELEVATION_OPTIONS}
        onChange={(value) => setMyWorld({ elevation: value })}
      />
      <SelectGroup
        label="Biome"
        value={myWorld.colorBy}
        options={COLOR_OPTIONS}
        onChange={(value) => setMyWorld({ colorBy: value })}
      />

      <SliderGroup
        label="Smoothing"
        value={myWorld.smoothing}
        min={0}
        max={100}
        step={1}
        onChange={(value) => setMyWorld({ smoothing: value })}
      />
      <SliderGroup
        label="Height Scale"
        value={myWorld.heightScale}
        min={60}
        max={260}
        step={5}
        suffix="%"
        onChange={(value) => setMyWorld({ heightScale: value })}
      />

      <button
        type="button"
        className={[styles.toggleButton, myWorld.showLabels ? styles.toggleActive : ''].join(' ').trim()}
        onClick={() => setMyWorld({ showLabels: !myWorld.showLabels })}
      >
        Labels {myWorld.showLabels ? 'On' : 'Off'}
      </button>
    </div>
  );
}
