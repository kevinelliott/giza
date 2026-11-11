// Open ground away from Giza (no satellite colour): sand and scree, bare rock on slopes.
shader_type spatial;
render_mode cull_disabled;
uniform vec3 sand_color : source_color = vec3(0.80, 0.69, 0.52);
uniform vec3 rock_color : source_color = vec3(0.72, 0.60, 0.44);
varying vec3 wp;
varying vec3 wn;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
	vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise2(p) * 0.5 + noise2(p * 2.1) * 0.3 + noise2(p * 4.3) * 0.2; }
void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	float tonal = fbm(wp.xz * 0.02 + 4.0);
	vec3 c = sand_color * mix(0.86, 1.08, tonal) * (0.94 + 0.12 * noise2(wp.xz * 9.0));
	c = mix(c, c * vec3(0.8, 0.77, 0.72), smoothstep(0.5, 0.8, fbm(wp.xz * 0.11 + 9.0)) * 0.7);       // gravel and flint
	// cliffs: horizontal beds of limestone and shale, with vertical runnels
	float steep = smoothstep(0.86, 0.6, abs(wn.y));
	float beds = fbm(vec2(wp.y * 0.55 + fbm(wp.xz * 0.03) * 2.0, 3.0));
	float run = noise2(vec2(dot(wp.xz, vec2(0.7, 0.7)) * 0.8, wp.y * 0.08));
	vec3 r = rock_color * mix(0.72, 1.12, beds) * mix(0.85, 1.05, run);
	ALBEDO = mix(c, r, steep);
	ROUGHNESS = 1.0;
}
