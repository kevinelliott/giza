// River water: the Nile's green-brown, moving ripples, sky reflection.
shader_type spatial;
uniform vec3 deep : source_color = vec3(0.13, 0.20, 0.19);
uniform vec3 shallow : source_color = vec3(0.22, 0.29, 0.24);
uniform vec2 flow = vec2(0.0, -0.35);          // m/s, world x/z (the Nile runs north)
varying vec3 wp;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
	vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}
float waves(vec2 p, float t) {
	return noise2(p * 0.35 + flow * t * 0.5) * 0.55 + noise2(p * 0.9 - flow.yx * t * 0.4 + 5.0) * 0.3 + noise2(p * 2.6 + flow * t * 1.2) * 0.15;
}
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	float t = TIME;
	float h = waves(wp.xz, t), hx = waves(wp.xz + vec2(0.25, 0.0), t), hz = waves(wp.xz + vec2(0.0, 0.25), t);
	float fade = 1.0 / (1.0 + distance(wp, CAMERA_POSITION_WORLD) * 0.035);
	NORMAL_MAP = vec3(0.5 + (h - hx) * 0.9 * fade, 0.5 + (h - hz) * 0.9 * fade, 1.0);
	ALBEDO = mix(deep, shallow, smoothstep(0.35, 0.75, noise2(wp.xz * 0.02 + 3.0)) * 0.6 + h * 0.15);
	ROUGHNESS = 0.22;
	METALLIC = 0.0;
	SPECULAR = 0.7;
}
