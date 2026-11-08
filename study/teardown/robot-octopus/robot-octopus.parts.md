# OCTO / wave explorer

Original Assembl procedural robot, 8 November 2026. No upstream model, animation or executable code copied.

## Intent

A student manipulates beat (frequency) and wave length, sees a travelling pattern along eight arms, and solves one open-ended mission. Science text is optional. The rendered motion, wave graph and speed display share the same time and parameters.

## Truth labels

- Robot proportions and dimensions are illustrative, not a manufactured design.
- It is not an octopus physiology, hydrodynamics or swimming simulation.
- Each arm is a sinusoid with a fixed amplitude envelope. Phase travels outward at `frequency × wavelength`. The envelope tapers to zero at the ends; material joints move vertically, not outward with the wave.
- Ripple offsets adjacent arms by one eighth of a cycle. Together sets the phase offsets to zero.
- Take apart separates shell, control core and articulated arms; it is a schematic exploration, not a repair guide.

## Sources / inspiration

- Wave relationship: OpenStax Physics §13.2, https://openstax.org/books/physics/pages/13-2-wave-properties-speed-amplitude-frequency-and-period . The equation is modelled directly, not scraped content.
- Subject inspiration verified 8 November 2026: https://github.com/elvarofficial/teardown/blob/a91262ac1109051e014662d42ecb0b7bc1f113b1/README.md names a robotic bee, scorpion and octopus. These are category references, not assets or source used here.

## Checks

`node --test tools/study-teardown/tests/robot-octopus.test.mjs`: speed/mission, period/ends, phase modes and invalid parameters.

Controls: orbit by pointer/touch; arrow keys orbit while canvas focused; +/− zoom; Space toggles play while canvas focused; buttons and form controls also work by keyboard. Reduced-motion starts paused. No audio, telemetry, generation API, account or new dependencies.
