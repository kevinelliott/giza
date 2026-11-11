// The modern town. Per vertex: COLOR = wall / roof colour, UV = (style + 4 *
// part, seed), UV2 = (ground y, roof y). Style 0 = red brick in a concrete
// frame, 1 = plastered, 2 = concrete with wide glazing; part 0 = wall, 1 =
// roof, 2 = roof clutter. Windows light up at night.
shader_type spatial;
render_mode cull_disabled;
uniform float night = 0.0;
varying vec3 wp;
varying vec3 wn;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
	vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	vec3 c = COLOR.rgb;
	float part = floor(UV.x / 4.0 + 0.01), style = UV.x - part * 4.0, seed = UV.y;
	float wall = (part < 0.5 ? 1.0 : 0.0) * (1.0 - step(0.5, abs(wn.y)));
	vec3 tt = normalize(vec3(-wn.z, 0.0, wn.x) + 1e-5);
	float u = dot(wp, tt) + seed * 37.0;
	float ly = wp.y - UV2.x, hgt = UV2.y - UV2.x;
	float fl = floor(ly / 3.1), fy = fract(ly / 3.1);
	float bay = mix(3.1, 4.3, fract(seed * 7.31));
	float fu = fract(u / bay), bay_id = floor(u / bay);
	float inside = step(0.3, ly) * step(ly, hgt - 0.4);
	float win = 0.0, lit = 0.0, glass = 0.0;
	if (wall > 0.5) {
		float wh = hash2(vec2(bay_id, fl) + seed * 13.0);
		if (style < 0.5) {
			float row = floor(ly / 0.21);
			float bu = fract((u + mod(row, 2.0) * 0.12) / 0.24);
			float mortar = max(step(fract(ly / 0.21), 0.12), step(bu, 0.06));
			c *= mix(1.0, 0.82, mortar) * (0.9 + 0.2 * hash2(vec2(floor(u / 0.24), row)));
			float frame = max(step(fu, 0.07), step(fy, 0.09)) * inside;
			c = mix(c, vec3(0.45, 0.43, 0.39), frame);
			win = step(0.3, fu) * step(fu, 0.72) * step(0.32, fy) * step(fy, 0.8);
		} else if (style < 1.5) {
			float sur = step(0.25, fu) * step(fu, 0.77) * step(0.27, fy) * step(fy, 0.85);
			c = mix(c, c * 1.12 + 0.03, sur * 0.6);
			win = step(0.3, fu) * step(fu, 0.72) * step(0.32, fy) * step(fy, 0.8);
			if (wh > 0.62) { c = mix(c, vec3(0.1, 0.14, 0.09) * (0.8 + 0.4 * fract(seed * 3.7)), win); win = 0.0; }
			c *= 1.0 - 0.18 * step(fract(ly / 3.1), 0.05);
		} else {
			win = step(0.12, fu) * step(fu, 0.88) * step(0.28, fy) * step(fy, 0.86);
			glass = win;
		}
		win *= inside;
		if (fl < 0.5 && seed > 0.3 && hash2(vec2(bay_id, seed)) > 0.3) {
			float sh = step(0.07, fu) * step(fu, 0.93) * step(fy, 0.82);
			c = mix(c, vec3(0.15, 0.16, 0.17) * (0.85 + 0.15 * step(0.5, fract(ly * 6.0))), sh);
			lit = sh * step(0.55, hash2(vec2(bay_id, 3.0) + seed)) * 0.7;
			win = 0.0;
		}
		c = mix(c, mix(vec3(0.004), vec3(0.012, 0.02, 0.03), glass), win * 0.9);
		lit = max(lit, win * step(0.64, wh));
		c *= 0.86 + 0.14 * noise2(vec2(u * 0.9, ly * 0.06 + seed * 9.0));
		c *= mix(0.72, 1.0, smoothstep(0.0, 1.6, ly));
	} else if (part > 0.5 && part < 1.5) {
		c *= 0.82 + 0.3 * noise2(wp.xz * 0.35 + seed * 5.0);
	}
	ALBEDO = c;
	ROUGHNESS = mix(0.9, mix(0.35, 0.12, glass), win);
	EMISSION = mix(vec3(1.0, 0.7, 0.4), vec3(0.75, 0.85, 1.0), step(0.85, fract(seed * 11.0 + fl * 0.37))) * lit * night * 1.6;
}
