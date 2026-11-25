// MIT © 2026 David Ronai (@makio64). Exact upstream camera easing extract.
// Source: https://github.com/Makio64/threejs-cinematic-world-zoom/blob/3db19b77933ead8241b1fcaf31a5576670f631f3/src/camera/easing.js
// MIT license: ./licenses/cinematic-world-zoom-MIT.txt
export const bezier = ( x1, y1, x2, y2 ) => {

	const cx = 3 * x1
	const bx = 3 * ( x2 - x1 ) - cx
	const ax = 1 - cx - bx

	const cy = 3 * y1
	const by = 3 * ( y2 - y1 ) - cy
	const ay = 1 - cy - by

	const sampleX = t => ( ( ax * t + bx ) * t + cx ) * t
	const sampleY = t => ( ( ay * t + by ) * t + cy ) * t
	const slopeX = t => ( 3 * ax * t + 2 * bx ) * t + cx

	return x => {

		if ( x <= 0 ) return 0
		if ( x >= 1 ) return 1

		// Newton first — converges in 2-4 steps for well behaved curves. The
		// tolerance is tight because these curves drive channels scaled up by
		// double-digit degrees: a loose solve reads as angular-velocity jitter.
		let t = x
		for ( let i = 0; i < 10; i ++ ) {

			const err = sampleX( t ) - x
			if ( Math.abs( err ) < 1e-9 ) return sampleY( t )
			const d = slopeX( t )
			if ( Math.abs( d ) < 1e-6 ) break
			t -= err / d

		}

		// Fallback for the flat-slope case.
		let lo = 0, hi = 1
		t = x
		for ( let i = 0; i < 40; i ++ ) {

			const v = sampleX( t )
			if ( Math.abs( v - x ) < 1e-9 ) break
			if ( v > x ) hi = t; else lo = t
			t = ( lo + hi ) / 2

		}

		return sampleY( t )

	}

}

export const smootherstep = t => t * t * t * ( t * ( t * 6 - 15 ) + 10 )
export const cinematic = bezier( 0.62, 0, 0.2, 1 )
export const mixLog = ( a, b, t ) => a * Math.pow( b / a, t )
