# Slush lab: provenance and limits

Original Assembl design; no manufacturer logo, product geometry or third-party art. No Ninja affiliation.

## Geometry
Teaching geometry (1 unit = 1 cm): a horizontal 21 cm diameter bowl, 28 cm barrel, central cold drum and continuous helical scraper; rear motor/belt; connected schematic refrigeration path, compressor, condenser, fan, dispensing tap and tray. Dimensions are invented for a readable original cutaway, not measured product dimensions. Metal case inspection opening exposes internals; transparent bowl and condensation are illustrative.

## Model
One kilogram of ideal water starts at 20 °C. Constant net cooling Qdot is chosen from 0–350 W. Energy removed is Qdot × t, capped at the energy needed to freeze the entire batch. Sensible heat uses c=4,180 J kg⁻¹ K⁻¹; latent heat L=334,000 J kg⁻¹. Temperature stays at 0 °C during equilibrium freezing. No supercooling, dissolved sugar, room heat leak, compressor efficiency, motor heat or crystal-size prediction. Pink colour is illustrative; a real sugary drink does not have this freezing curve.

The thermal batch is accelerated (30 minutes per90 seconds); mixer motion is deliberately slowed for inspection. Geometry shows mechanisms; particles represent phase fraction, not simulated fluid mechanics. Cooling slider compares entire constant-power scenarios, not sequential changes to a stateful appliance. Scrubbing pauses the batch; restarting resumes it. The batch loops for demonstration.

## References
OpenStax College Physics 2e, 14.3 Phase Change and Latent Heat, for energy balance and standard water values. https://openstax.org/books/college-physics-2e/pages/14-3-phase-change-and-latent-heat

## Verification
35 repository model/tool safety tests passed. Actual browser QA required independently; see PR118. No unsafe upstream teardown scripts or URL-supplied config.
