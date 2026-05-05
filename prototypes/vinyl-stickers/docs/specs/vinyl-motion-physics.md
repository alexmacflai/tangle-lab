# Vinyl Motion Physics

## Goal

Define the feel-critical interaction model for spinning, braking, dragging, releasing, and mapping vinyl rotation to playback position.

## Inputs / Assumptions

- Vinyl is the source of truth for physical interaction.
- Physics, visual rotation, and audio state stay separate.
- Use a `requestAnimationFrame` loop for physics updates.
- Use normalized angle handling for continuous rotation.
- Playback can be stubbed visually before real audio is connected.

## Behavior

Mouse mapping:

- On press, start a 120ms timer.
- Holding longer than 120ms enters braking.
- Dragging computes pointer angle from the vinyl center:

```text
angle = atan2(mouseY - centerY, mouseX - centerX)
```

- Pointer angle delta controls visual rotation and playback position.
- Applied drag delta uses resistance:

```text
appliedDelta = pointerDelta * 0.82
```

Playback mapping:

- During play:

```text
progress = currentTime / duration
```

- During drag:

```text
1 rotation = 1.8s
secondsPerRadian = 1.8 / (2 * PI)
currentTime += rotationDelta * secondsPerRadian
```

- Clamp `currentTime` between `0` and `duration`.

Play:

- Target speed is 33.33 RPM.
- Ramp to speed over 650ms.
- Use `cubic-bezier(0.22,1,0.36,1)`.

Brake:

- Brake starts after the 120ms hold threshold.
- Brake takes about 900ms to reach near-stop.
- Keep a minimum 1 to 2 RPM drift instead of stopping instantly.

Inertia:

- On release, compute velocity from recent angle deltas.
- Apply per-frame decay:

```text
velocity *= 0.92
stop when abs(velocity) < 0.02
```

- Inertia should usually last 300 to 700ms.
- If playing, blend back to 33.33 RPM over about 400ms.
- If paused, settle over about 300ms.

Build stages:

1. **Playback State Stub**
   - Add play/pause and progress state without real physics.
   - Stop for user review.

2. **Physics Loop**
   - Add the requestAnimationFrame loop and normalized rotation state.
   - Stop for user review.

3. **Press, Hold, Drag, Release**
   - Add braking threshold, angle mapping, scrubbing, and inertia.
   - Stop for user review.

4. **Playback Mapping**
   - Connect rotation deltas to current time.
   - Keep audio state decoupled.
   - Stop for user review.

## Edge Cases

- Very short clicks should not accidentally brake.
- Dragging across the `0` to `2π` boundary should not jump.
- Releasing while playing blends back to play speed.
- Releasing while paused settles without snapping.
- Rapid interaction cancels or blends active animations safely.

## Acceptance Checklist

- Vinyl never stops instantly from normal braking.
- Dragging feels rotational, not like a linear slider.
- Inertia visibly decays after release.
- Playback position clamps within track duration.
- Physics can run without real audio.

## Dependencies / Links

- [Album Detail Vinyl Player](album-detail-vinyl-player.md)
- [Transition And Visual System](transition-and-visual-system.md)
